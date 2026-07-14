import base64
import json
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image, UnidentifiedImageError

# Formats OpenAI image input accepts directly; anything else is converted to PNG.
_MIME_BY_EXTENSION = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
}

_CONVERTED_MIME_TYPE = "image/png"
_CONVERTED_SUFFIX = ".png"

_PROJECT_ROOT_MARKERS = ("pyproject.toml", ".git")


def _discover_project_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if any((candidate / marker).exists() for marker in _PROJECT_ROOT_MARKERS):
            return candidate
    raise FileNotFoundError(
        f"Could not locate a project root above {start}; pass project_root explicitly."
    )


@dataclass(frozen=True)
class ImageToReview:
    b64content: str
    mime_type: str
    label: str
    suffix: str


def _load_image(path: Path) -> tuple[bytes, str, str] | None:
    suffix = path.suffix.lower()
    if mime_type := _MIME_BY_EXTENSION.get(suffix):
        return path.read_bytes(), mime_type, suffix

    # Not a format OpenAI accepts directly (e.g. BMP, TIFF, ICO) -- convert to PNG.
    try:
        with Image.open(path) as original:
            buffer = BytesIO()
            original.convert("RGBA").save(buffer, format="PNG")
    except (OSError, UnidentifiedImageError):
        return None
    return buffer.getvalue(), _CONVERTED_MIME_TYPE, _CONVERTED_SUFFIX


def parse_images_from_directory(path: Path) -> list[ImageToReview]:
    images = []
    for image in path.iterdir():
        loaded = _load_image(image)
        if loaded is None:
            continue
        content, mime_type, suffix = loaded
        images.append(
            ImageToReview(
                b64content=base64.b64encode(content).decode(),
                mime_type=mime_type,
                label=image.stem,
                suffix=suffix,
            )
        )

    return images


def parse_images_from_metadata_file(
    path: Path, project_root: Path | None = None
) -> list[ImageToReview]:
    metadata = json.loads(path.read_text())
    image_entries = metadata.get("images", [])
    if not image_entries:
        return []

    root = (project_root or _discover_project_root(path.resolve().parent)).resolve()

    images = []
    for image in image_entries:
        # Relies on the filepath in the metadata containing the project root folder
        # as the first component,
        # e.g., `ml-design-doc-reviewer/data/raw_documents/images/case_001/img_002.png`
        relative_path = Path(*Path(image["local_path"]).parts[1:])
        image_path = (root / relative_path).resolve()
        if image_path != root and not image_path.is_relative_to(root):
            # local_path escapes project_root (e.g. via `..`); skip rather than read it.
            continue

        loaded = _load_image(image_path)
        if loaded is None:
            continue
        content, mime_type, suffix = loaded
        images.append(
            ImageToReview(
                b64content=base64.b64encode(content).decode(),
                mime_type=mime_type,
                label=f"{image_path.stem} ({image['alt_text']})",
                suffix=suffix,
            )
        )

    return images
