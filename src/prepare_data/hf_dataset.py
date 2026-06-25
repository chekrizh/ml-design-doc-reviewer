"""Upload and download evaluation dataset artifacts via Hugging Face Hub."""

from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from prepare_data.config import PROJECT_ROOT

logger = logging.getLogger(__name__)

DEFAULT_HF_DATASET_REPO = "ml-system-design/ml-design-doc-reviewer-data"

# Local directory -> path prefix inside the HF dataset repository.
DATASET_LAYOUT: dict[str, str] = {
    "raw_documents": "raw",
    "normalized_disdocs": "normalized",
    "flawed_disdocs": "flawed",
    "disdoc_examples": "disdoc_examples",
    "evidently_ai_cases": "source/evidently_ai_cases",
    "byte_byte_go_cases": "source/byte_byte_go_cases",
}

MANIFEST_FILES = (
    "sample_manifest.csv",
    "error_topology.csv",
    "dataset_revision.txt",
)


@dataclass(frozen=True)
class DatasetPaths:
    data_dir: Path
    revision_file: Path
    raw_documents_dir: Path
    normalized_disdocs_dir: Path
    flawed_disdocs_dir: Path
    error_topology_path: Path
    sample_manifest_path: Path
    disdoc_examples_dir: Path
    cases_csv: Path

    @classmethod
    def from_data_dir(cls, data_dir: Path) -> DatasetPaths:
        return cls(
            data_dir=data_dir,
            revision_file=data_dir / "dataset_revision.txt",
            raw_documents_dir=data_dir / "raw_documents",
            normalized_disdocs_dir=data_dir / "normalized_disdocs",
            flawed_disdocs_dir=data_dir / "flawed_disdocs",
            error_topology_path=data_dir / "error_topology.csv",
            sample_manifest_path=data_dir / "sample_manifest.csv",
            disdoc_examples_dir=data_dir / "disdoc_examples",
            cases_csv=data_dir / "evidently_ai_cases" / "800 ML and LLM use cases.csv",
        )


def read_dataset_revision(revision_file: Path) -> str:
    if not revision_file.exists():
        return "v1.0.0"
    value = revision_file.read_text(encoding="utf-8").strip()
    return value or "v1.0.0"


def _git_commit_hash(project_root: Path = PROJECT_ROOT) -> str | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=project_root,
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def _stage_upload_tree(paths: DatasetPaths, staging_dir: Path) -> None:
    if staging_dir.exists():
        shutil.rmtree(staging_dir)
    staging_dir.mkdir(parents=True)

    manifest_dir = staging_dir / "manifest"
    manifest_dir.mkdir()

    for filename in MANIFEST_FILES:
        source = paths.data_dir / filename
        if source.exists():
            shutil.copy2(source, manifest_dir / filename)

    commit_hash = _git_commit_hash()
    meta = {
        "uploaded_at": datetime.now(UTC).isoformat(),
        "pipeline_git_commit": commit_hash,
        "dataset_revision": read_dataset_revision(paths.revision_file),
        "layout": DATASET_LAYOUT,
    }
    (staging_dir / "meta" / "pipeline_info.json").parent.mkdir(parents=True, exist_ok=True)
    (staging_dir / "meta" / "pipeline_info.json").write_text(
        json.dumps(meta, indent=2),
        encoding="utf-8",
    )

    for local_name, remote_prefix in DATASET_LAYOUT.items():
        source_dir = paths.data_dir / local_name
        if not source_dir.exists():
            logger.warning("Skipping missing local dataset folder: %s", source_dir)
            continue
        destination = staging_dir / remote_prefix
        shutil.copytree(
            source_dir,
            destination,
            ignore=shutil.ignore_patterns("*_ERROR.json", ".DS_Store"),
        )


def _revision_exists(api, repo_id: str, revision: str) -> bool:
    from huggingface_hub.errors import RevisionNotFoundError

    try:
        api.repo_info(repo_id, repo_type="dataset", revision=revision)
        return True
    except RevisionNotFoundError:
        return False


def upload_dataset(
    paths: DatasetPaths,
    *,
    repo_id: str,
    revision: str | None = None,
    token: str | None = None,
) -> str:
    """Upload local dataset folders to a Hugging Face dataset repository."""
    from huggingface_hub import HfApi

    revision = revision or read_dataset_revision(paths.revision_file)
    token = token or os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")
    if not token:
        raise RuntimeError("HF_TOKEN (or HUGGINGFACE_HUB_TOKEN) is required to upload the dataset.")

    staging_dir = paths.data_dir / ".hf_upload_staging"
    _stage_upload_tree(paths, staging_dir)

    readme = staging_dir / "README.md"
    readme.write_text(_dataset_card(repo_id, revision), encoding="utf-8")

    api = HfApi(token=token)
    api.create_repo(repo_id, repo_type="dataset", exist_ok=True)

    upload_revision = revision if _revision_exists(api, repo_id, revision) else "main"
    if upload_revision != revision:
        logger.info(
            "Revision %s not found on %s; uploading to main first",
            revision,
            repo_id,
        )

    api.upload_large_folder(
        folder_path=str(staging_dir),
        repo_id=repo_id,
        repo_type="dataset",
        revision=upload_revision,
    )

    if upload_revision == "main" and revision != "main":
        api.create_branch(
            repo_id,
            branch=revision,
            revision="main",
            repo_type="dataset",
            exist_ok=True,
        )
        logger.info("Created dataset revision branch %s from main", revision)

    shutil.rmtree(staging_dir, ignore_errors=True)
    logger.info("Uploaded dataset to https://huggingface.co/datasets/%s/tree/%s", repo_id, revision)
    return revision


def download_dataset(
    paths: DatasetPaths,
    *,
    repo_id: str,
    revision: str | None = None,
    token: str | None = None,
    include_source_catalog: bool = False,
) -> Path:
    """Download dataset artifacts from Hugging Face into the local data directory."""
    from huggingface_hub import snapshot_download

    revision = revision or read_dataset_revision(paths.revision_file)
    token = token or os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")

    allow_patterns = [
        "manifest/*",
        "meta/*",
        "raw/**",
        "normalized/**",
        "flawed/**",
        "disdoc_examples/**",
        "source/byte_byte_go_cases/**",
    ]
    if include_source_catalog:
        allow_patterns.append("source/**")

    cache_dir = snapshot_download(
        repo_id=repo_id,
        repo_type="dataset",
        revision=revision,
        token=token,
        allow_patterns=allow_patterns,
    )
    cache_path = Path(cache_dir)
    paths.data_dir.mkdir(parents=True, exist_ok=True)

    for filename in MANIFEST_FILES:
        source = cache_path / "manifest" / filename
        if source.exists() and filename != "dataset_revision.txt":
            shutil.copy2(source, paths.data_dir / filename)

    for local_name, remote_prefix in DATASET_LAYOUT.items():
        if remote_prefix.startswith("source/") and not include_source_catalog:
            continue
        source = cache_path / remote_prefix
        if not source.exists():
            logger.warning("Remote dataset folder missing: %s", remote_prefix)
            continue
        destination = paths.data_dir / local_name
        if destination.exists():
            shutil.rmtree(destination)
        shutil.copytree(source, destination)

    logger.info(
        "Downloaded dataset %s@%s into %s",
        repo_id,
        revision,
        paths.data_dir,
    )
    return paths.data_dir


def _dataset_card(repo_id: str, revision: str) -> str:
    return f"""---
license: apache-2.0
task_categories:
  - text-generation
language:
  - en
tags:
  - ml-system-design
  - evaluation
  - design-documents
pretty_name: ML Design Doc Evaluation Dataset
---

# {repo_id} ({revision})

Evaluation artifacts for the ML Design Doc Reviewer project.

## Layout

| Path | Description |
|------|-------------|
| `manifest/sample_manifest.csv` | Stratified 100-case sample manifest |
| `manifest/error_topology.csv` | Controlled error taxonomy for flawed docs |
| `raw/` | Raw markdown exports, metadata sidecars, OCR image blocks |
| `raw/images/` | Downloaded article images |
| `normalized/` | Canonical 14-section ML design documents |
| `flawed/` | Normalized docs with injected errors + `injection_log.csv` |
| `disdoc_examples/` | Few-shot reference design docs for normalization |
| `source/evidently_ai_cases/` | Optional upstream Evidently AI catalog CSV |
| `source/byte_byte_go_cases/` | ByteByteGo ML system design case archives |

## Download

```bash
uv run prepare-data download-dataset
```

Or with the Hugging Face CLI:

```bash
huggingface-cli download {repo_id} --repo-type dataset --revision {revision} --local-dir ./data
```
"""
