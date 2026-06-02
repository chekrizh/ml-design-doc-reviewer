from __future__ import annotations

import argparse
import asyncio
import json
from collections.abc import Callable, Sequence
from json import JSONDecodeError
from pathlib import Path
from typing import Protocol

from critic.config import Settings
from critic.domain.critique import ReviewResult
from critic.domain.document import DesignDocumentInput
from critic.service import ReviewService


class _ReviewService(Protocol):
    async def review(self, document: DesignDocumentInput) -> ReviewResult:
        """Review a design document."""


ServiceFactory = Callable[[], _ReviewService]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="critic")
    subparsers = parser.add_subparsers(dest="command", required=True)

    review_parser = subparsers.add_parser("review", help="Review an ML design document")
    review_parser.add_argument(
        "path",
        type=Path,
        help="Path to a markdown/text or JSON design document",
    )
    review_parser.add_argument(
        "--input-format",
        choices=("auto", "text", "json"),
        default="auto",
        help=(
            "Input format. JSON support is a baseline CLI contract and still requires "
            "product/API schema alignment."
        ),
    )

    return parser


def main(argv: Sequence[str] | None = None, service_factory: ServiceFactory | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "review":
        document = _load_document(args.path, args.input_format)
        factory = service_factory or (lambda: ReviewService.from_settings(Settings()))
        result = asyncio.run(factory().review(document))
        print(result.model_dump_json(indent=2))
        return 0

    parser.error(f"unknown command: {args.command}")
    return 2


def _load_document(path: Path, input_format: str) -> DesignDocumentInput:
    content = path.read_text(encoding="utf-8")
    if input_format == "text":
        return content
    if input_format == "json":
        return json.loads(content)
    try:
        return json.loads(content)
    except JSONDecodeError:
        return content


if __name__ == "__main__":
    raise SystemExit(main())
