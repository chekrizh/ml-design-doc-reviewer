import base64
import json
from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image

from critic.image_parsing import (
    ImageToReview,
    parse_images_from_directory,
    parse_images_from_metadata_file,
)


def _bmp_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (2, 2), color=(255, 0, 0)).save(buffer, format="BMP")
    return buffer.getvalue()


def test_parse_images_from_directory_reads_known_extensions(tmp_path: Path) -> None:
    (tmp_path / "diagram.png").write_bytes(b"fake-png-bytes")
    (tmp_path / "screenshot.JPG").write_bytes(b"fake-jpg-bytes")

    images = parse_images_from_directory(tmp_path)

    by_label = {image.label: image for image in images}
    assert set(by_label) == {"diagram", "screenshot"}
    assert by_label["diagram"].mime_type == "image/png"
    assert by_label["diagram"].filename.endswith(".png")
    assert by_label["diagram"].b64content == base64.b64encode(b"fake-png-bytes").decode()
    assert by_label["screenshot"].mime_type == "image/jpeg"
    assert by_label["screenshot"].filename.endswith(".jpg")


def test_parse_images_from_directory_returns_image_to_review_instances(tmp_path: Path) -> None:
    (tmp_path / "asd.png").write_bytes(b"fake-png-bytes")

    [image] = parse_images_from_directory(tmp_path)

    assert image == ImageToReview(
        b64content=base64.b64encode(b"fake-png-bytes").decode(),
        mime_type="image/png",
        label="asd",
        filename="asd.png",
    )


def test_parse_images_from_directory_skips_unknown_extensions(tmp_path: Path) -> None:
    (tmp_path / "diagram.png").write_bytes(b"fake-png-bytes")
    (tmp_path / "notes.txt").write_text("not an image", encoding="utf-8")
    (tmp_path / ".DS_Store").write_bytes(b"\x00")

    images = parse_images_from_directory(tmp_path)

    assert [image.label for image in images] == ["diagram"]


def test_parse_images_from_directory_skips_subdirectories(tmp_path: Path) -> None:
    (tmp_path / "diagram.png").write_bytes(b"fake-png-bytes")
    nested = tmp_path / "nested"
    nested.mkdir()
    (nested / "inner.png").write_bytes(b"nested-bytes")

    images = parse_images_from_directory(tmp_path)

    assert [image.label for image in images] == ["diagram"]


def test_parse_images_from_directory_returns_empty_list_for_empty_directory(
    tmp_path: Path,
) -> None:
    assert parse_images_from_directory(tmp_path) == []


def test_parse_images_from_directory_converts_unsupported_format_to_png(
    tmp_path: Path,
) -> None:
    (tmp_path / "diagram.bmp").write_bytes(_bmp_bytes())

    [image] = parse_images_from_directory(tmp_path)

    assert image.label == "diagram"
    assert image.mime_type == "image/png"
    assert image.filename.endswith(".png")
    converted = Image.open(BytesIO(base64.b64decode(image.b64content)))
    assert converted.format == "PNG"
    assert converted.size == (2, 2)


def _write_metadata(
    metadata_file: Path, *, local_path: str, alt_text: str, content_type: str | None = None
) -> None:
    image_entry = {"local_path": local_path, "alt_text": alt_text}
    if content_type is not None:
        image_entry["content_type"] = content_type
    metadata_file.write_text(
        json.dumps({"images": [image_entry]}),
        encoding="utf-8",
    )


def test_parse_images_from_metadata_file_resolves_paths_relative_to_project_root(
    tmp_path: Path,
) -> None:
    project_root = tmp_path
    image_dir = project_root / "data" / "raw_documents" / "images" / "case_001"
    image_dir.mkdir(parents=True)
    (image_dir / "img_002.png").write_bytes(b"fake-png-bytes")
    metadata_file = tmp_path / "metadata.json"
    _write_metadata(
        metadata_file,
        local_path="ml-design-doc-reviewer/data/raw_documents/images/case_001/img_002.png",
        alt_text="Architecture diagram",
    )

    [image] = parse_images_from_metadata_file(metadata_file, project_root=project_root)

    assert image.label == "img_002 (Architecture diagram)"
    assert image.mime_type == "image/png"
    assert image.filename.endswith(".png")
    assert image.b64content == base64.b64encode(b"fake-png-bytes").decode()


def test_parse_images_from_metadata_file_ignores_current_working_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    project_root = tmp_path
    image_dir = project_root / "data" / "raw_documents" / "images" / "case_001"
    image_dir.mkdir(parents=True)
    (image_dir / "img_002.png").write_bytes(b"fake-png-bytes")
    metadata_file = tmp_path / "metadata.json"
    _write_metadata(
        metadata_file,
        local_path="ml-design-doc-reviewer/data/raw_documents/images/case_001/img_002.png",
        alt_text="Architecture diagram",
    )
    other_dir = tmp_path / "somewhere_else"
    other_dir.mkdir()
    monkeypatch.chdir(other_dir)

    [image] = parse_images_from_metadata_file(metadata_file, project_root=project_root)

    assert image.b64content == base64.b64encode(b"fake-png-bytes").decode()


def test_parse_images_from_metadata_file_infers_mime_type_from_extension(
    tmp_path: Path,
) -> None:
    project_root = tmp_path
    image_dir = project_root / "data" / "raw_documents" / "images" / "case_001"
    image_dir.mkdir(parents=True)
    (image_dir / "img_002.png").write_bytes(b"fake-png-bytes")
    metadata_file = tmp_path / "metadata.json"
    _write_metadata(
        metadata_file,
        local_path="ml-design-doc-reviewer/data/raw_documents/images/case_001/img_002.png",
        alt_text="Architecture diagram",
        content_type="application/octet-stream",
    )

    [image] = parse_images_from_metadata_file(metadata_file, project_root=project_root)

    assert image.mime_type == "image/png"


def test_parse_images_from_metadata_file_converts_unsupported_format_to_png(
    tmp_path: Path,
) -> None:
    project_root = tmp_path
    image_dir = project_root / "data" / "raw_documents" / "images" / "case_001"
    image_dir.mkdir(parents=True)
    (image_dir / "diagram.bmp").write_bytes(_bmp_bytes())
    metadata_file = tmp_path / "metadata.json"
    _write_metadata(
        metadata_file,
        local_path="ml-design-doc-reviewer/data/raw_documents/images/case_001/diagram.bmp",
        alt_text="Bitmap diagram",
    )

    [image] = parse_images_from_metadata_file(metadata_file, project_root=project_root)

    assert image.mime_type == "image/png"
    assert image.filename.endswith(".png")
    converted = Image.open(BytesIO(base64.b64decode(image.b64content)))
    assert converted.format == "PNG"
    assert converted.size == (2, 2)


def test_parse_images_from_metadata_file_skips_unreadable_file(
    tmp_path: Path,
) -> None:
    project_root = tmp_path
    image_dir = project_root / "data" / "raw_documents" / "images" / "case_001"
    image_dir.mkdir(parents=True)
    (image_dir / "diagram.psd").write_bytes(b"unsupported-bytes")
    metadata_file = tmp_path / "metadata.json"
    _write_metadata(
        metadata_file,
        local_path="ml-design-doc-reviewer/data/raw_documents/images/case_001/diagram.psd",
        alt_text="Unsupported format",
    )

    assert parse_images_from_metadata_file(metadata_file, project_root=project_root) == []


def test_parse_images_from_metadata_file_skips_paths_that_escape_project_root(
    tmp_path: Path,
) -> None:
    project_root = tmp_path / "project"
    project_root.mkdir()
    outside_file = tmp_path / "secret.png"
    outside_file.write_bytes(b"outside-bytes")
    metadata_file = project_root / "metadata.json"
    _write_metadata(
        metadata_file,
        local_path="ml-design-doc-reviewer/../secret.png",
        alt_text="Escaping path",
    )

    assert parse_images_from_metadata_file(metadata_file, project_root=project_root) == []


def test_parse_images_from_metadata_file_discovers_project_root_without_explicit_arg(
    tmp_path: Path,
) -> None:
    project_root = tmp_path / "project"
    (project_root / "src" / "critic").mkdir(parents=True)
    (project_root / "pyproject.toml").write_text("", encoding="utf-8")
    image_dir = project_root / "data" / "raw_documents" / "images" / "case_001"
    image_dir.mkdir(parents=True)
    (image_dir / "img_002.png").write_bytes(b"fake-png-bytes")
    metadata_file = project_root / "data" / "raw_documents" / "metadata.json"
    _write_metadata(
        metadata_file,
        local_path="ml-design-doc-reviewer/data/raw_documents/images/case_001/img_002.png",
        alt_text="Architecture diagram",
    )

    [image] = parse_images_from_metadata_file(metadata_file)

    assert image.b64content == base64.b64encode(b"fake-png-bytes").decode()


def test_parse_images_from_metadata_file_raises_when_no_project_root_found(
    tmp_path: Path,
) -> None:
    metadata_file = tmp_path / "metadata.json"
    _write_metadata(
        metadata_file,
        local_path="ml-design-doc-reviewer/data/raw_documents/images/case_001/img_002.png",
        alt_text="Architecture diagram",
    )

    with pytest.raises(FileNotFoundError):
        parse_images_from_metadata_file(metadata_file)


def test_parse_images_from_metadata_file_returns_empty_list_when_no_images_key(
    tmp_path: Path,
) -> None:
    metadata_file = tmp_path / "metadata.json"
    metadata_file.write_text(json.dumps({}), encoding="utf-8")

    assert parse_images_from_metadata_file(metadata_file) == []


def test_parse_images_from_metadata_file_reads_multiple_images(
    tmp_path: Path,
) -> None:
    project_root = tmp_path
    image_dir = project_root / "data" / "raw_documents" / "images" / "case_001"
    image_dir.mkdir(parents=True)
    (image_dir / "img_001.png").write_bytes(b"first-bytes")
    (image_dir / "img_002.jpg").write_bytes(b"second-bytes")
    metadata_file = tmp_path / "metadata.json"
    metadata_file.write_text(
        json.dumps(
            {
                "images": [
                    {
                        "local_path": (
                            "ml-design-doc-reviewer/data/raw_documents/images/case_001/img_001.png"
                        ),
                        "alt_text": "First diagram",
                    },
                    {
                        "local_path": (
                            "ml-design-doc-reviewer/data/raw_documents/images/case_001/img_002.jpg"
                        ),
                        "alt_text": "Second diagram",
                    },
                ]
            }
        ),
        encoding="utf-8",
    )

    images = parse_images_from_metadata_file(metadata_file, project_root=project_root)

    assert [image.label for image in images] == [
        "img_001 (First diagram)",
        "img_002 (Second diagram)",
    ]
    assert [image.mime_type for image in images] == ["image/png", "image/jpeg"]
