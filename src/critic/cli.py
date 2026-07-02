from __future__ import annotations

import argparse
import asyncio
import json
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import Protocol

from critic.assessor.service import AssessorService
from critic.config import AssessorOutputSettings, AssessorSettings, Settings
from critic.domain.assessor_checklist import load_default_assessor_checklist
from critic.domain.checklist import load_default_checklist
from critic.domain.critique import ReviewResult
from critic.metrics.records import load_golden_errors, parse_assessor_records, parse_critic_records
from critic.metrics.report import build_metrics_report
from critic.service import ReviewService


class _ReviewService(Protocol):
    async def review(self, document: str) -> ReviewResult:
        """Review a design document."""


class _AssessorService(Protocol):
    async def assess_inference_log(
        self,
        inference_log_file: Path,
        output_file: Path,
    ) -> list[str]:
        """Assess critic inference records."""


ServiceFactory = Callable[[], _ReviewService]
AssessorServiceFactory = Callable[[], _AssessorService]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="critic")
    subparsers = parser.add_subparsers(dest="command", required=True)

    review_parser = subparsers.add_parser("review", help="Review an ML design document")
    review_parser.add_argument(
        "path",
        type=Path,
        help="Path to a markdown or text design document",
    )

    assess_parser = subparsers.add_parser("assess", help="Assess critic inference logs")
    assess_parser.add_argument(
        "path",
        type=Path,
        help="Path to critic inference.jsonl",
    )
    assess_parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Path to write assessment-eval.jsonl",
    )

    metrics_parser = subparsers.add_parser("metrics", help="Aggregate offline critic metrics")
    metrics_parser.add_argument(
        "path",
        type=Path,
        help="Path to assessment-eval.jsonl",
    )
    metrics_parser.add_argument(
        "--inference-log",
        type=Path,
        default=None,
        help="Optional path to critic inference.jsonl for mean critic score",
    )
    metrics_parser.add_argument(
        "--golden",
        type=Path,
        default=None,
        help="Optional path to golden error counts JSON for recall metrics",
    )

    return parser


def main(
    argv: Sequence[str] | None = None,
    service_factory: ServiceFactory | None = None,
    assessor_service_factory: AssessorServiceFactory | None = None,
) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "review":
        document = args.path.read_text(encoding="utf-8")
        factory = service_factory or (lambda: ReviewService.from_settings(Settings()))
        result = asyncio.run(factory().review(document))
        print(result.model_dump_json(indent=2))
        return 0

    if args.command == "assess":
        factory, output_file = _resolve_assessor(args, assessor_service_factory)
        assessment_ids = asyncio.run(factory().assess_inference_log(args.path, output_file))
        print(json.dumps({"assessment_ids": assessment_ids}))
        return 0

    if args.command == "metrics":
        critic_outputs = None
        critic_checklist = None
        assessor_checklist = load_default_assessor_checklist()
        if args.inference_log is not None:
            critic_outputs = parse_critic_records(args.inference_log)
            critic_checklist = load_default_checklist()

        report = build_metrics_report(
            assessor_outputs=parse_assessor_records(
                args.path,
                assessor_checklist=assessor_checklist,
            ),
            assessor_checklist=assessor_checklist,
            critic_outputs=critic_outputs,
            critic_checklist=critic_checklist,
            golden=load_golden_errors(args.golden) if args.golden is not None else None,
        )
        print(report.model_dump_json(indent=2))
        return 0

    parser.error(f"unknown command: {args.command}")
    return 2


def _resolve_assessor(
    args: argparse.Namespace,
    assessor_service_factory: AssessorServiceFactory | None,
) -> tuple[AssessorServiceFactory, Path]:
    if assessor_service_factory is not None:
        output_file = args.output or AssessorOutputSettings().eval_log_file
        return assessor_service_factory, output_file

    settings = AssessorSettings()
    output_file = args.output or settings.eval_log_file
    return lambda: AssessorService.from_settings(settings), output_file


if __name__ == "__main__":
    raise SystemExit(main())
