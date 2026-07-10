import base64
import json
from dataclasses import dataclass
from pathlib import Path

_MIME_BY_EXTENSION = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


@dataclass(frozen=True)
class ImageToReview:
    b64content: str
    mime_type: str
    label: str


def parse_images_from_directory(path: Path) -> list[ImageToReview]:
    images = []
    for image in path.iterdir():
        if mime_type := _MIME_BY_EXTENSION.get(image.suffix.lower()):
            b64 = base64.b64encode(image.read_bytes()).decode()
            images.append(ImageToReview(b64content=b64, mime_type=mime_type, label=image.stem))
        else:
            all_extensions = ", ".join_MIME_BY_EXTENSION.keys()
            print(f"Image {image} has unknown extension. Expected one of these: {all_extensions}")
    return images


def parse_images_from_metadata_file(path: Path) -> list[ImageToReview]:
    images = []

    metadata = json.loads(path.read_text())
    for image in metadata.get("images", []):
        # Removing first directory because path is in such format
        # `ml-design-doc-reviewer/data/raw_documents/images/case_001/img_002.png`
        image_path = Path(*Path(image["local_path"]).parts[1:])
        b64 = base64.b64encode(image_path.read_bytes()).decode()
        images.append(
            ImageToReview(
                b64content=b64,
                mime_type=image["content_type"],
                label=f"{image_path.stem} ({image['alt_text']})",
            )
        )

    return images
