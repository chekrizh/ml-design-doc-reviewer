"""Repository-relative path helpers for serialized metadata."""

from __future__ import annotations

from pathlib import Path

from prepare_data.config import PROJECT_ROOT

PROJECT_NAME = "ml-design-doc-reviewer"


def to_repo_relative_path(path: Path | str, *, project_root: Path = PROJECT_ROOT) -> str:
    """Return a path string rooted at ``ml-design-doc-reviewer/``."""
    resolved = Path(path).resolve()
    root = project_root.resolve()

    try:
        relative = resolved.relative_to(root)
        return f"{PROJECT_NAME}/{relative.as_posix()}"

    except ValueError:
        parts = resolved.parts
        if PROJECT_NAME in parts:
            idx = parts.index(PROJECT_NAME)
            suffix = Path(*parts[idx + 1 :])
            return f"{PROJECT_NAME}/{suffix.as_posix()}"

        raise ValueError(f"Path {resolved} is outside project root {root}") from None


def sanitize_metadata_paths(value: object, *, project_root: Path = PROJECT_ROOT) -> object:
    """Recursively rewrite path-like metadata values to repo-relative form."""
    if isinstance(value, Path):
        try:
            return to_repo_relative_path(value, project_root=project_root)
        except ValueError:
            return value.as_posix()

    if isinstance(value, dict):
        cleaned: dict[str, object] = {}
        for key, item in value.items():
            if key == "audio_path" and isinstance(item, str):
                # Temporary Whisper download paths are not useful in persisted metadata.
                continue
            cleaned[key] = sanitize_metadata_paths(item, project_root=project_root)
        return cleaned

    if isinstance(value, list):
        return [sanitize_metadata_paths(item, project_root=project_root) for item in value]

    if isinstance(value, str) and (
        value.startswith("/") or value.startswith("~") or ":\\" in value[:3]
    ):
        try:
            return to_repo_relative_path(value, project_root=project_root)
        except ValueError:
            return value

    return value
