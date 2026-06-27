from __future__ import annotations

import tomllib
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _pyproject() -> dict:
    return tomllib.loads((PROJECT_ROOT / "pyproject.toml").read_text(encoding="utf-8"))


def test_prepare_data_dependencies_are_not_runtime_dependencies() -> None:
    pyproject = _pyproject()
    runtime_dependencies = set(pyproject["project"]["dependencies"])
    prepare_data_dependencies = set(pyproject["dependency-groups"]["prepare-data"])

    heavy_dependencies = {
        "faster-whisper>=1.1.0",
        "huggingface_hub>=0.28.0",
        "pandas>=2.2.0",
        "pillow>=11.0.0",
        "pytesseract>=0.3.13",
        "tqdm>=4.66.0",
        "trafilatura>=2.0.0",
        "youtube-transcript-api>=1.0.0",
        "yt-dlp>=2025.1.0",
    }

    assert runtime_dependencies.isdisjoint(heavy_dependencies)
    assert heavy_dependencies <= prepare_data_dependencies


def test_prepare_data_is_not_packaged_as_a_runtime_entrypoint() -> None:
    pyproject = _pyproject()

    assert pyproject["project"]["scripts"] == {"critic": "critic.cli:main"}
    assert pyproject["tool"]["hatch"]["build"]["targets"]["wheel"]["packages"] == ["src/critic"]
    assert "sources" not in pyproject["tool"]["hatch"]["build"]["targets"]["wheel"]
