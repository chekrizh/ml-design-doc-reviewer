import base64
import json
from dataclasses import dataclass
from pathlib import Path

_MIME_BY_EXTENSION = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".ico": "image/x-icon",
    ".avif": "image/avif",
    ".heic": "image/heic",
    ".heif": "image/heic",
}


@dataclass(frozen=True)
class ImageToReview:
    b64content: str
    mime_type: str
    label: str
    suffix: str


def parse_images_from_directory(path: Path) -> list[ImageToReview]:
    images = []
    for image in path.iterdir():
        suffix = image.suffix.lower()
        if mime_type := _MIME_BY_EXTENSION.get(suffix):
            b64 = base64.b64encode(image.read_bytes()).decode()
            images.append(
                ImageToReview(b64content=b64, mime_type=mime_type, label=image.stem, suffix=suffix)
            )

    return images


def parse_images_from_metadata_file(path: Path) -> list[ImageToReview]:
    images = []

    metadata = json.loads(path.read_text())
    for image in metadata.get("images", []):
        # Relies on the filepath in the metadata containing the project root folder
        # as the first component,
        # e.g., `ml-design-doc-reviewer/data/raw_documents/images/case_001/img_002.png`
        dir_above_root = Path(__file__).resolve().parents[3]
        image_path = dir_above_root / image["local_path"]

        suffix = image_path.suffix.lower()
        if mime_type := _MIME_BY_EXTENSION.get(suffix):
            b64 = base64.b64encode(image_path.read_bytes()).decode()
            images.append(
                ImageToReview(
                    b64content=b64,
                    mime_type=mime_type,
                    label=f"{image_path.stem} ({image['alt_text']})",
                    suffix=suffix,
                )
            )

    return images
