"""Configuration for the prepare_data pipeline."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _require(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


@dataclass(frozen=True)
class Settings:
    """Runtime settings loaded from environment variables."""

    cases_csv: Path
    sample_size: int
    random_seed: int
    sample_manifest_path: Path
    raw_documents_dir: Path
    normalized_disdocs_dir: Path
    disdoc_examples_dir: Path
    normalize_prompt_path: Path
    error_topology_path: Path
    flawed_disdocs_dir: Path
    injection_log_path: Path
    openrouter_api_key: str | None
    openrouter_model: str
    openrouter_base_url: str
    openrouter_max_tokens: int
    normalize_delay_seconds: float
    whisper_model: str
    whisper_device: str
    whisper_compute_type: str
    fetch_timeout_seconds: float
    fetch_delay_seconds: float
    tesseract_cmd: str | None
    tesseract_lang: str
    hf_dataset_repo: str
    hf_dataset_revision: str

    @classmethod
    def from_env(cls) -> Settings:
        data_dir = Path(os.getenv("DATA_DIR", PROJECT_ROOT / "data"))
        prompts_dir = Path(os.getenv("PROMPTS_DIR", PROJECT_ROOT / "prompts"))

        default_csv = data_dir / "evidently_ai_cases" / "800 ML and LLM use cases.csv"
        legacy_csv = data_dir / "800 ML and LLM use cases.csv"
        cases_csv = Path(os.getenv("CASES_CSV", default_csv if default_csv.exists() else legacy_csv))

        return cls(
            cases_csv=cases_csv,
            sample_size=int(os.getenv("SAMPLE_SIZE", "100")),
            random_seed=int(os.getenv("RANDOM_SEED", "42")),
            sample_manifest_path=Path(
                os.getenv("SAMPLE_MANIFEST_PATH", data_dir / "sample_manifest.csv")
            ),
            raw_documents_dir=Path(
                os.getenv("RAW_DOCUMENTS_DIR", data_dir / "raw_documents")
            ),
            normalized_disdocs_dir=Path(
                os.getenv("NORMALIZED_DISDOCS_DIR", data_dir / "normalized_disdocs")
            ),
            disdoc_examples_dir=Path(
                os.getenv("DISDOC_EXAMPLES_DIR", data_dir / "disdoc_examples")
            ),
            normalize_prompt_path=Path(
                os.getenv(
                    "NORMALIZE_PROMPT_PATH",
                    prompts_dir / "normalize_to_disdoc.md",
                )
            ),
            error_topology_path=Path(
                os.getenv("ERROR_TOPOLOGY_PATH", data_dir / "error_topology.csv")
            ),
            flawed_disdocs_dir=Path(
                os.getenv("FLAWED_DISDOCS_DIR", data_dir / "flawed_disdocs")
            ),
            injection_log_path=Path(
                os.getenv(
                    "INJECTION_LOG_PATH",
                    data_dir / "flawed_disdocs" / "injection_log.csv",
                )
            ),
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY"),
            openrouter_model=os.getenv(
                "OPENROUTER_MODEL", "google/gemma-4-31b-it:free"
            ),
            openrouter_base_url=os.getenv(
                "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
            ),
            openrouter_max_tokens=int(os.getenv("OPENROUTER_MAX_TOKENS", "8192")),
            normalize_delay_seconds=float(os.getenv("NORMALIZE_DELAY_SECONDS", "3.0")),
            whisper_model=os.getenv("WHISPER_MODEL", "small"),
            whisper_device=os.getenv("WHISPER_DEVICE", "cpu"),
            whisper_compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"),
            fetch_timeout_seconds=float(os.getenv("FETCH_TIMEOUT_SECONDS", "30")),
            fetch_delay_seconds=float(os.getenv("FETCH_DELAY_SECONDS", "1.0")),
            tesseract_cmd=os.getenv("TESSERACT_CMD"),
            tesseract_lang=os.getenv("TESSERACT_LANG", "eng"),
            hf_dataset_repo=os.getenv("HF_DATASET_REPO", "chekrizh/ml-disdoc-eval"),
            hf_dataset_revision=os.getenv(
                "HF_DATASET_REVISION",
                _read_dataset_revision_file(
                    Path(os.getenv("DATA_DIR", PROJECT_ROOT / "data"))
                    / "dataset_revision.txt"
                ),
            ),
        )

    def require_openrouter_key(self) -> str:
        if not self.openrouter_api_key:
            raise RuntimeError(
                "OPENROUTER_API_KEY is required for normalization. "
                "Set it in .env or the environment."
            )
        return self.openrouter_api_key


def _read_dataset_revision_file(path: Path) -> str:
    if path.exists():
        value = path.read_text(encoding="utf-8").strip()
        if value:
            return value
    return "v1.0.0"
