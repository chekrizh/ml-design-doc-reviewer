from __future__ import annotations

import argparse
import asyncio
import json
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import Protocol

from critic.assessor.service import AssessmentRunResult, AssessorService
from critic.config import AssessorOutputSettings, AssessorSettings, CriticOutputSettings, Settings
from critic.domain.assessor_checklist import AssessorChecklist
from critic.domain.checklist import Checklist
from critic.domain.critique import ReviewResult
from critic.metrics.records import (
    count_assessment_records,
    load_golden_errors,
    parse_assessor_records,
    parse_critic_records,
)
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
    ) -> AssessmentRunResult:
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
        return _run_review(args, service_factory)

    if args.command == "assess":
        return _run_assess(args, assessor_service_factory)

    if args.command == "metrics":
        return _run_metrics(args)

    parser.error(f"unknown command: {args.command}")
    return 2


def _run_review(args: argparse.Namespace, service_factory: ServiceFactory | None) -> int:
    document = args.path.read_text(encoding="utf-8")
    factory = service_factory or (lambda: ReviewService.from_settings(Settings()))
    result = asyncio.run(factory().review(document))
    print(result.model_dump_json(indent=2))
    return 0


def _run_assess(
    args: argparse.Namespace,
    assessor_service_factory: AssessorServiceFactory | None,
) -> int:
    factory, output_file = _resolve_assessor(args, assessor_service_factory)
    run_result = asyncio.run(factory().assess_inference_log(args.path, output_file))
    print(
        json.dumps(
            {
                "assessment_ids": run_result.assessment_ids,
                "failed_count": run_result.failed_count,
            }
        )
    )
    return 1 if run_result.failed_count else 0


def _run_metrics(args: argparse.Namespace) -> int:
    critic_outputs = None
    critic_checklist = None
    assessor_checklist = AssessorChecklist.load_or_default(AssessorOutputSettings().checklist_path)
    if args.inference_log is not None:
        critic_checklist = Checklist.load_or_default(CriticOutputSettings().checklist_path)
        critic_outputs = parse_critic_records(
            args.inference_log,
            critic_checklist=critic_checklist,
        )

    assessment_counts = count_assessment_records(args.path)
    report = build_metrics_report(
        assessor_outputs=parse_assessor_records(
            args.path,
            assessor_checklist=assessor_checklist,
        ),
        assessor_checklist=assessor_checklist,
        critic_outputs=critic_outputs,
        critic_checklist=critic_checklist,
        golden=load_golden_errors(args.golden) if args.golden is not None else None,
        assessment_total_count=assessment_counts.total,
        assessment_failed_count=assessment_counts.failed,
    )
    print(report.model_dump_json(indent=2))
    return 0


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
