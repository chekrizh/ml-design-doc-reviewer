import base64
import json
from pathlib import Path

import pytest

from critic import image_parsing
from critic.image_parsing import (
    ImageToReview,
    parse_images_from_directory,
    parse_images_from_metadata_file,
)


def test_parse_images_from_directory_reads_known_extensions(tmp_path: Path) -> None:
    (tmp_path / "diagram.png").write_bytes(b"fake-png-bytes")
    (tmp_path / "screenshot.JPG").write_bytes(b"fake-jpg-bytes")

    images = parse_images_from_directory(tmp_path)

    by_label = {image.label: image for image in images}
    assert set(by_label) == {"diagram", "screenshot"}
    assert by_label["diagram"].mime_type == "image/png"
    assert by_label["diagram"].suffix == ".png"
    assert by_label["diagram"].b64content == base64.b64encode(b"fake-png-bytes").decode()
    assert by_label["screenshot"].mime_type == "image/jpeg"
    assert by_label["screenshot"].suffix == ".jpg"


def test_parse_images_from_directory_returns_image_to_review_instances(tmp_path: Path) -> None:
    (tmp_path / "diagram.png").write_bytes(b"fake-png-bytes")

    [image] = parse_images_from_directory(tmp_path)

    assert image == ImageToReview(
        b64content=base64.b64encode(b"fake-png-bytes").decode(),
        mime_type="image/png",
        label="diagram",
        suffix=".png",
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


def _patch_project_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    # parse_images_from_metadata_file resolves paths relative to
    # Path(__file__).resolve().parents[2], so faking the module's __file__
    # two directories below tmp_path makes tmp_path the "project root".
    fake_module_file = tmp_path / "src" / "critic" / "image_parsing.py"
    monkeypatch.setattr(image_parsing, "__file__", str(fake_module_file))
    return tmp_path


def test_parse_images_from_metadata_file_resolves_paths_relative_to_project_root(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    project_root = _patch_project_root(tmp_path, monkeypatch)
    image_dir = project_root / "data" / "raw_documents" / "images" / "case_001"
    image_dir.mkdir(parents=True)
    (image_dir / "img_002.png").write_bytes(b"fake-png-bytes")
    metadata_file = tmp_path / "metadata.json"
    _write_metadata(
        metadata_file,
        local_path="ml-design-doc-reviewer/data/raw_documents/images/case_001/img_002.png",
        alt_text="Architecture diagram",
    )

    [image] = parse_images_from_metadata_file(metadata_file)

    assert image.label == "img_002 (Architecture diagram)"
    assert image.mime_type == "image/png"
    assert image.suffix == ".png"
    assert image.b64content == base64.b64encode(b"fake-png-bytes").decode()


def test_parse_images_from_metadata_file_ignores_current_working_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    project_root = _patch_project_root(tmp_path, monkeypatch)
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

    [image] = parse_images_from_metadata_file(metadata_file)

    assert image.b64content == base64.b64encode(b"fake-png-bytes").decode()


def test_parse_images_from_metadata_file_infers_mime_type_from_extension(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    project_root = _patch_project_root(tmp_path, monkeypatch)
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

    [image] = parse_images_from_metadata_file(metadata_file)

    assert image.mime_type == "image/png"


def test_parse_images_from_metadata_file_skips_unsupported_extension(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    project_root = _patch_project_root(tmp_path, monkeypatch)
    image_dir = project_root / "data" / "raw_documents" / "images" / "case_001"
    image_dir.mkdir(parents=True)
    (image_dir / "diagram.psd").write_bytes(b"unsupported-bytes")
    metadata_file = tmp_path / "metadata.json"
    _write_metadata(
        metadata_file,
        local_path="ml-design-doc-reviewer/data/raw_documents/images/case_001/diagram.psd",
        alt_text="Unsupported format",
    )

    assert parse_images_from_metadata_file(metadata_file) == []


def test_parse_images_from_metadata_file_returns_empty_list_when_no_images_key(
    tmp_path: Path,
) -> None:
    metadata_file = tmp_path / "metadata.json"
    metadata_file.write_text(json.dumps({}), encoding="utf-8")

    assert parse_images_from_metadata_file(metadata_file) == []


def test_parse_images_from_metadata_file_reads_multiple_images(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    project_root = _patch_project_root(tmp_path, monkeypatch)
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

    images = parse_images_from_metadata_file(metadata_file)

    assert [image.label for image in images] == [
        "img_001 (First diagram)",
        "img_002 (Second diagram)",
    ]
    assert [image.mime_type for image in images] == ["image/png", "image/jpeg"]
