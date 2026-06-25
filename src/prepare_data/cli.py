"""CLI entry point for the prepare_data pipeline."""

from __future__ import annotations

import argparse
import logging
import sys

from prepare_data.config import Settings
from prepare_data.inject_errors import inject_directory
from prepare_data.pipeline import (
    run_all,
    run_download_dataset,
    run_enrich_images,
    run_fetch,
    run_normalize,
    run_ocr_images,
    run_sample,
    run_upload_dataset,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Prepare stratified ML design doc dataset from Evidently AI use cases.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("sample", help="Create stratified sample manifest (100 cases).")
    subparsers.add_parser("fetch", help="Download articles and transcribe videos.")
    subparsers.add_parser(
        "enrich-images",
        help="Download images from article URLs into existing raw documents.",
    )
    subparsers.add_parser(
        "ocr-images",
        help="Run Tesseract OCR on images linked in raw documents.",
    )
    subparsers.add_parser(
        "normalize",
        help="Convert raw documents to canonical design docs via an OpenAI-compatible API.",
    )
    subparsers.add_parser("all", help="Run sample → fetch → normalize.")
    subparsers.add_parser(
        "inject-errors",
        help="Inject controlled errors into normalized design docs.",
    )
    subparsers.add_parser(
        "download-dataset",
        help="Download raw/normalized/flawed dataset artifacts from Hugging Face.",
    )
    subparsers.add_parser(
        "upload-dataset",
        help="Upload local dataset artifacts to Hugging Face (maintainers only).",
    )
    download_parser = subparsers.choices["download-dataset"]
    download_parser.add_argument(
        "--include-source-catalog",
        action="store_true",
        help="Also download the upstream Evidently AI cases CSV.",
    )

    for name in ("fetch", "normalize", "enrich-images", "ocr-images", "all"):
        sub = subparsers.choices[name]
        sub.add_argument(
            "--force",
            action="store_true",
            help="Re-process items even if outputs already exist.",
        )

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    settings = Settings.from_env()
    skip_existing = not getattr(args, "force", False)

    try:
        if args.command == "sample":
            run_sample(settings)
        elif args.command == "fetch":
            run_fetch(settings, skip_existing=skip_existing)
        elif args.command == "enrich-images":
            run_enrich_images(settings, skip_existing=skip_existing)
        elif args.command == "ocr-images":
            run_ocr_images(settings, skip_existing=skip_existing)
        elif args.command == "normalize":
            run_normalize(settings, skip_existing=skip_existing)
        elif args.command == "all":
            run_all(settings, skip_existing=skip_existing)
        elif args.command == "inject-errors":
            inject_directory(
                settings.normalized_disdocs_dir,
                settings.flawed_disdocs_dir,
                settings.error_topology_path,
                settings.injection_log_path,
                random_seed=settings.random_seed,
            )
        elif args.command == "download-dataset":
            run_download_dataset(
                settings,
                include_source_catalog=getattr(args, "include_source_catalog", False),
            )
        elif args.command == "upload-dataset":
            run_upload_dataset(settings)
        else:
            parser.error(f"Unknown command: {args.command}")
            return 2
    except Exception:
        logger.exception("Pipeline failed")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
