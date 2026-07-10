from __future__ import annotations

import argparse
import asyncio
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import Protocol

from critic.config import Settings
from critic.domain.critique import ReviewResult
from critic.image_parsing import (
    ImageToReview,
    parse_images_from_directory,
    parse_images_from_metadata_file,
)
from critic.service import ReviewService


class _ReviewService(Protocol):
    async def review(
        self, document: str, images: list[ImageToReview] | None = None
    ) -> ReviewResult:
        """Review a design document."""


ServiceFactory = Callable[[], _ReviewService]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="critic")
    subparsers = parser.add_subparsers(dest="command", required=True)

    review_parser = subparsers.add_parser("review", help="Review an ML design document")
    review_parser.add_argument(
        "path",
        type=Path,
        help="Path to a markdown or text design document",
    )
    review_parser.add_argument(
        "--images-dir",
        type=Path,
        help="Path to a directory to load images from",
    )
    review_parser.add_argument(
        "--metadata",
        type=Path,
        help="Path to a file with design documents metadata to get images from",
    )

    return parser


def main(argv: Sequence[str] | None = None, service_factory: ServiceFactory | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "review":
        document = args.path.read_text(encoding="utf-8")

        if args.images_dir:
            images = parse_images_from_directory(Path(args.images_dir))
        elif args.metadata:
            images = parse_images_from_metadata_file(Path(args.metadata))
        else:
            images = []

        factory = service_factory or (lambda: ReviewService.from_settings(Settings()))
        result = asyncio.run(factory().review(document, images))
        print(result.model_dump_json(indent=2))
        return 0

    parser.error(f"unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
