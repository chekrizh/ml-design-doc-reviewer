"""End-to-end dataset preparation pipeline."""

from __future__ import annotations

import logging

from prepare_data.config import Settings
from prepare_data.fetch_content import fetch_manifest
from prepare_data.hf_dataset import DatasetPaths, download_dataset, upload_dataset
from prepare_data.images import enrich_raw_documents, ocr_raw_documents
from prepare_data.normalize import normalize_manifest
from prepare_data.sampling import run_sampling

logger = logging.getLogger(__name__)


def run_sample(settings: Settings) -> None:
    run_sampling(
        cases_csv=settings.cases_csv,
        output_path=settings.sample_manifest_path,
        sample_size=settings.sample_size,
        random_seed=settings.random_seed,
    )


def run_fetch(settings: Settings, *, skip_existing: bool = True) -> None:
    if not settings.sample_manifest_path.exists():
        raise FileNotFoundError(
            f"Sample manifest not found: {settings.sample_manifest_path}. Run `sample` first."
        )
    fetch_manifest(
        settings.sample_manifest_path,
        settings.raw_documents_dir,
        whisper_model=settings.whisper_model,
        whisper_device=settings.whisper_device,
        whisper_compute_type=settings.whisper_compute_type,
        timeout=settings.fetch_timeout_seconds,
        delay_seconds=settings.fetch_delay_seconds,
        skip_existing=skip_existing,
        tesseract_lang=settings.tesseract_lang,
        tesseract_cmd=settings.tesseract_cmd,
    )


def run_normalize(settings: Settings, *, skip_existing: bool = True) -> None:
    if not settings.sample_manifest_path.exists():
        raise FileNotFoundError(
            f"Sample manifest not found: {settings.sample_manifest_path}. Run `sample` first."
        )
    normalize_manifest(
        settings.sample_manifest_path,
        settings.raw_documents_dir,
        settings.normalized_disdocs_dir,
        settings.normalize_prompt_path,
        settings.disdoc_examples_dir,
        api_key=settings.require_openrouter_key(),
        model=settings.openrouter_model,
        base_url=settings.openrouter_base_url,
        max_tokens=settings.openrouter_max_tokens,
        normalize_delay_seconds=settings.normalize_delay_seconds,
        skip_existing=skip_existing,
    )


def run_enrich_images(settings: Settings, *, skip_existing: bool = True) -> None:
    enrich_raw_documents(
        settings.raw_documents_dir,
        timeout=settings.fetch_timeout_seconds,
        delay_seconds=settings.fetch_delay_seconds,
        skip_existing=skip_existing,
        tesseract_lang=settings.tesseract_lang,
        tesseract_cmd=settings.tesseract_cmd,
    )


def run_ocr_images(settings: Settings, *, skip_existing: bool = True) -> None:
    ocr_raw_documents(
        settings.raw_documents_dir,
        skip_existing=skip_existing,
        tesseract_lang=settings.tesseract_lang,
        tesseract_cmd=settings.tesseract_cmd,
    )


def run_download_dataset(settings: Settings, *, include_source_catalog: bool = False) -> None:
    paths = DatasetPaths.from_data_dir(settings.raw_documents_dir.parent)
    download_dataset(
        paths,
        repo_id=settings.hf_dataset_repo,
        revision=settings.hf_dataset_revision,
        include_source_catalog=include_source_catalog,
    )


def run_upload_dataset(settings: Settings) -> None:
    paths = DatasetPaths.from_data_dir(settings.raw_documents_dir.parent)
    upload_dataset(
        paths,
        repo_id=settings.hf_dataset_repo,
        revision=settings.hf_dataset_revision,
    )


def run_all(settings: Settings, *, skip_existing: bool = True) -> None:
    run_sample(settings)
    run_fetch(settings, skip_existing=skip_existing)
    run_normalize(settings, skip_existing=skip_existing)
