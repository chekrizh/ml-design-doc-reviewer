from __future__ import annotations

import os
import subprocess
import tomllib
import zipfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _pyproject() -> dict:
    return tomllib.loads((PROJECT_ROOT / "pyproject.toml").read_text(encoding="utf-8"))


def _build_wheel(tmp_path: Path) -> Path:
    subprocess.run(
        ["uv", "build", "--wheel", "--out-dir", str(tmp_path)],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return next(tmp_path.glob("*.whl"))


def test_prepare_data_dependencies_are_not_runtime_dependencies() -> None:
    pyproject = _pyproject()
    runtime_dependencies = set(pyproject["project"]["dependencies"])
    prepare_data_dependencies = set(pyproject["dependency-groups"]["prepare-data"])

    heavy_dependencies = {
        "faster-whisper>=1.1.0",
        "huggingface_hub>=0.28.0",
        "pandas>=2.2.0",
        "pillow>=11.0.0",
        "python-dotenv>=1.0.0",
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


def test_runtime_wheel_excludes_prepare_data_and_heavy_dependencies(tmp_path: Path) -> None:
    wheel_path = _build_wheel(tmp_path)

    with zipfile.ZipFile(wheel_path) as wheel:
        names = wheel.namelist()
        metadata_path = next(name for name in names if name.endswith(".dist-info/METADATA"))
        metadata = wheel.read(metadata_path).decode("utf-8")

    assert any(name.startswith("critic/") for name in names)
    assert not any(name.startswith("prepare_data/") for name in names)

    heavy_requires = [
        "Requires-Dist: faster-whisper",
        "Requires-Dist: huggingface-hub",
        "Requires-Dist: pandas",
        "Requires-Dist: pillow",
        "Requires-Dist: python-dotenv",
        "Requires-Dist: pytesseract",
        "Requires-Dist: tqdm",
        "Requires-Dist: trafilatura",
        "Requires-Dist: youtube-transcript-api",
        "Requires-Dist: yt-dlp",
    ]
    assert all(requirement not in metadata for requirement in heavy_requires)


def test_dataset_card_uses_dependency_group_invocation() -> None:
    result = subprocess.run(
        [
            "uv",
            "run",
            "--no-sync",
            "python",
            "-c",
            (
                "from prepare_data.hf_dataset import _dataset_card; "
                "print(_dataset_card('owner/dataset', 'v1.0.0'))"
            ),
        ],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    card = result.stdout

    assert "uv run --group prepare-data python -m prepare_data.cli download-dataset" in card
    assert "uv run prepare-data" not in card


def test_prepare_data_fetch_delay_default_matches_example_env() -> None:
    example_values = {}
    env_example = PROJECT_ROOT / ".env.prepare-data.example"
    for line in env_example.read_text(encoding="utf-8").splitlines():
        if "=" not in line or line.startswith("#"):
            continue
        key, value = line.split("=", 1)
        example_values[key] = value

    env = os.environ.copy()
    env.pop("FETCH_DELAY_SECONDS", None)
    result = subprocess.run(
        [
            "uv",
            "run",
            "--no-sync",
            "python",
            "-c",
            (
                "from prepare_data.config import Settings; "
                "print(Settings.from_env().fetch_delay_seconds)"
            ),
        ],
        cwd=PROJECT_ROOT,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )

    assert float(result.stdout.strip()) == float(example_values["FETCH_DELAY_SECONDS"])
