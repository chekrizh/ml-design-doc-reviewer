"""Extract and download images from article HTML for raw document enrichment."""

from __future__ import annotations

import logging
import mimetypes
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from urllib.parse import urljoin, urlparse

import certifi
import httpx
from lxml import html as lxml_html

from prepare_data.ocr import OCR_NO_TEXT, ocr_image_file
from prepare_data.paths import to_repo_relative_path

logger = logging.getLogger(__name__)

# Delimiters for downstream normalization / OCR pipelines.
IMAGE_REF_TOKEN = "IMAGE_REF"
IMAGE_DESCRIPTION_TOKEN = "IMAGE_DESCRIPTION"
IMAGE_ALT_TOKEN = "IMAGE_ALT"
IMAGE_SOURCE_URL_TOKEN = "IMAGE_SOURCE_URL"

SKIP_URL_PATTERNS = re.compile(
    r"(pixel|tracking|analytics|beacon|spacer|1x1|transparent\.gif|emoji|avatar)",
    re.IGNORECASE,
)
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"}


@dataclass
class ImageAsset:
    """A downloaded image linked to a raw document."""

    image_id: str
    source_url: str
    local_path: Path
    repo_path: str
    alt_text: str
    width: int | None
    height: int | None
    content_type: str | None
    byte_size: int
    ocr_text: str = ""


def _guess_extension(url: str, content_type: str | None) -> str:
    path = urlparse(url).path
    suffix = Path(path).suffix.lower()
    if suffix in SUPPORTED_EXTENSIONS:
        return suffix
    if content_type:
        guessed = mimetypes.guess_extension(content_type.split(";")[0].strip())
        if guessed:
            return guessed
    return ".jpg"


def _parse_dimension(value: str | None) -> int | None:
    if not value:
        return None
    cleaned = re.sub(r"[^0-9.]", "", value.strip())
    if not cleaned:
        return None
    try:
        return int(float(cleaned))
    except ValueError:
        return None


def _is_probably_content_image(url: str, alt: str, width: str | None, height: str | None) -> bool:
    if url.startswith("data:"):
        return False
    if SKIP_URL_PATTERNS.search(url) or SKIP_URL_PATTERNS.search(alt):
        return False

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False

    w = _parse_dimension(width)
    h = _parse_dimension(height)

    if w is not None and h is not None and (w < 80 or h < 80):
        return False

    return True


def extract_image_candidates(html: str, page_url: str) -> list[dict[str, str | None]]:
    """Parse <img> and srcset entries from article HTML."""
    tree = lxml_html.fromstring(html)
    candidates: list[dict[str, str | None]] = []
    seen: set[str] = set()

    for img in tree.xpath("//img"):
        src = img.get("src") or img.get("data-src") or img.get("data-original")
        if not src:
            srcset = img.get("srcset")
            if srcset:
                src = srcset.split(",")[0].strip().split()[0]
        if not src:
            continue

        absolute = urljoin(page_url, src.strip())
        if absolute in seen:
            continue
        seen.add(absolute)

        alt = (img.get("alt") or "").strip()
        width = img.get("width")
        height = img.get("height")
        if not _is_probably_content_image(absolute, alt, width, height):
            continue

        candidates.append(
            {
                "source_url": absolute,
                "alt_text": alt,
                "width": width,
                "height": height,
            }
        )

    return candidates


def download_image(
    url: str,
    dest_path: Path,
    *,
    timeout: float = 30.0,
) -> tuple[int, str | None]:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; MLDesignDocReviewer/0.1; +dataset-prep)",
    }
    with httpx.Client(
        timeout=timeout,
        verify=certifi.where(),
        follow_redirects=True,
        headers=headers,
    ) as client:
        response = client.get(url)
        response.raise_for_status()
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        dest_path.write_bytes(response.content)
        content_type = response.headers.get("content-type")
        return len(response.content), content_type


def download_article_images(
    html: str,
    page_url: str,
    output_dir: Path,
    sample_id: str,
    *,
    timeout: float = 30.0,
    max_images: int = 20,
    min_bytes: int = 5_000,
    run_ocr: bool = True,
    tesseract_lang: str = "eng",
    tesseract_cmd: str | None = None,
) -> list[ImageAsset]:
    """Download content images for an article into output_dir/images/{sample_id}/."""
    image_dir = output_dir / "images" / sample_id
    image_dir.mkdir(parents=True, exist_ok=True)

    assets: list[ImageAsset] = []
    for index, candidate in enumerate(extract_image_candidates(html, page_url), start=1):
        if len(assets) >= max_images:
            break

        source_url = candidate["source_url"]
        assert isinstance(source_url, str)
        ext = _guess_extension(source_url, None)
        filename = f"img_{index:03d}{ext}"
        local_path = image_dir / filename

        try:
            byte_size, content_type = download_image(
                source_url, local_path, timeout=timeout
            )
            ext = _guess_extension(source_url, content_type)
            if local_path.suffix.lower() != ext:
                renamed = local_path.with_suffix(ext)
                local_path.rename(renamed)
                local_path = renamed
                filename = renamed.name

            if byte_size < min_bytes:
                local_path.unlink(missing_ok=True)
                continue

            assets.append(
                ImageAsset(
                    image_id=f"{sample_id}_img_{index:03d}",
                    source_url=source_url,
                    local_path=local_path,
                    repo_path=to_repo_relative_path(local_path),
                    alt_text=str(candidate.get("alt_text") or ""),
                    width=_parse_dimension(str(candidate["width"])) if candidate.get("width") else None,
                    height=_parse_dimension(str(candidate["height"])) if candidate.get("height") else None,
                    content_type=content_type,
                    byte_size=byte_size,
                )
            )
        except Exception as exc:
            logger.warning("Failed to download image %s for %s: %s", source_url, sample_id, exc)

    if run_ocr and assets:
        apply_ocr_to_assets(assets, lang=tesseract_lang, tesseract_cmd=tesseract_cmd)

    return assets


def apply_ocr_to_assets(
    assets: list[ImageAsset],
    *,
    lang: str = "eng",
    tesseract_cmd: str | None = None,
) -> list[ImageAsset]:
    """Run Tesseract on downloaded images and fill ``ocr_text``."""
    for asset in assets:
        asset.ocr_text = ocr_image_file(
            asset.local_path,
            lang=lang,
            tesseract_cmd=tesseract_cmd,
        )
    return assets


def image_description_text(asset: ImageAsset) -> str:
    if asset.ocr_text:
        return asset.ocr_text
    return OCR_NO_TEXT


def format_image_block(asset: ImageAsset) -> str:
    """Render a single image block with special tokens for normalization."""
    lines = [
        f"[{IMAGE_REF_TOKEN}: {asset.repo_path}]",
        f"[{IMAGE_ALT_TOKEN}: {asset.alt_text or 'none'}]",
        f"[{IMAGE_SOURCE_URL_TOKEN}: {asset.source_url}]",
        f"[{IMAGE_DESCRIPTION_TOKEN}: {image_description_text(asset)}]",
        "",
    ]
    return "\n".join(lines)


def format_images_section(assets: list[ImageAsset]) -> str:
    if not assets:
        return ""
    blocks = "\n".join(format_image_block(asset) for asset in assets)
    return f"\n---\n\n## Extracted images ({len(assets)})\n\n{blocks}"


def strip_existing_images_section(text: str) -> str:
    marker = "\n---\n\n## Extracted images"
    if marker in text:
        return text.split(marker, maxsplit=1)[0].rstrip() + "\n"
    return text


def append_images_section(text: str, assets: list[ImageAsset]) -> str:
    base = strip_existing_images_section(text)
    section = format_images_section(assets)
    if not section:
        return base
    return base.rstrip() + section


def enrich_article_images(
    url: str,
    sample_id: str,
    output_dir: Path,
    *,
    timeout: float = 30.0,
    max_images: int = 20,
    run_ocr: bool = True,
    tesseract_lang: str = "eng",
    tesseract_cmd: str | None = None,
) -> list[ImageAsset]:
    from prepare_data.fetch_content import fetch_html

    html = fetch_html(url, timeout=timeout)
    return download_article_images(
        html,
        url,
        output_dir,
        sample_id,
        timeout=timeout,
        max_images=max_images,
        run_ocr=run_ocr,
        tesseract_lang=tesseract_lang,
        tesseract_cmd=tesseract_cmd,
    )


def assets_from_metadata(
    metadata: dict,
    output_dir: Path,
    sample_id: str,
) -> list[ImageAsset]:
    """Rebuild ImageAsset objects from persisted metadata."""
    assets: list[ImageAsset] = []
    for record in metadata.get("images", []):
        local_path = output_dir / "images" / sample_id / Path(record["local_path"]).name
        if not local_path.exists():
            local_path = Path(record.get("local_path", ""))
        if not local_path.exists():
            continue
        assets.append(
            ImageAsset(
                image_id=record.get("image_id", ""),
                source_url=record.get("source_url", ""),
                local_path=local_path,
                repo_path=record.get("repo_path", to_repo_relative_path(local_path)),
                alt_text=record.get("alt_text", ""),
                width=record.get("width"),
                height=record.get("height"),
                content_type=record.get("content_type"),
                byte_size=record.get("byte_size", 0),
                ocr_text=record.get("ocr_text", ""),
            )
        )
    return assets


def enrich_raw_document_file(
    md_path: Path,
    meta_path: Path,
    output_dir: Path,
    *,
    timeout: float = 30.0,
    max_images: int = 20,
    run_ocr: bool = True,
    tesseract_lang: str = "eng",
    tesseract_cmd: str | None = None,
) -> list[ImageAsset]:
    """Re-fetch article HTML and append image blocks to an existing raw document."""
    import json

    metadata = json.loads(meta_path.read_text(encoding="utf-8"))
    if metadata.get("content_type") != "article":
        return []

    url = metadata["url"]
    sample_id = metadata["sample_id"]
    assets = enrich_article_images(
        url,
        sample_id,
        output_dir,
        timeout=timeout,
        max_images=max_images,
        run_ocr=run_ocr,
        tesseract_lang=tesseract_lang,
        tesseract_cmd=tesseract_cmd,
    )

    body = md_path.read_text(encoding="utf-8")
    md_path.write_text(append_images_section(body, assets), encoding="utf-8")

    metadata["images"] = image_assets_to_metadata(assets)
    metadata["image_count"] = len(assets)
    if run_ocr and assets:
        metadata["ocr_complete"] = True
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return assets


def ocr_raw_document_file(
    md_path: Path,
    meta_path: Path,
    output_dir: Path,
    *,
    tesseract_lang: str = "eng",
    tesseract_cmd: str | None = None,
    force: bool = False,
) -> list[ImageAsset]:
    """Run OCR on images already linked to a raw document."""
    import json

    metadata = json.loads(meta_path.read_text(encoding="utf-8"))
    sample_id = metadata["sample_id"]
    assets = assets_from_metadata(metadata, output_dir, sample_id)
    if not assets:
        return []

    pending = any(
        not asset.ocr_text or asset.ocr_text in {"", "PENDING_OCR"}
        for asset in assets
    )
    if not pending and not force:
        return assets

    apply_ocr_to_assets(assets, lang=tesseract_lang, tesseract_cmd=tesseract_cmd)

    body = md_path.read_text(encoding="utf-8")
    md_path.write_text(append_images_section(body, assets), encoding="utf-8")

    metadata["images"] = image_assets_to_metadata(assets)
    metadata["ocr_complete"] = True
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return assets


def ocr_raw_documents(
    output_dir: Path,
    *,
    skip_existing: bool = True,
    tesseract_lang: str = "eng",
    tesseract_cmd: str | None = None,
) -> dict[str, int]:
    """Apply Tesseract OCR to images in existing raw documents."""
    import json

    from tqdm import tqdm

    stats = {"processed": 0, "skipped": 0, "images": 0, "errors": 0}

    meta_files = sorted(output_dir.glob("case_*.meta.json"))
    for meta_path in tqdm(meta_files, desc="OCR images"):
        metadata = json.loads(meta_path.read_text(encoding="utf-8"))
        if metadata.get("content_type") != "article":
            stats["skipped"] += 1
            continue

        if skip_existing and metadata.get("ocr_complete"):
            stats["skipped"] += 1
            continue

        if not metadata.get("images"):
            stats["skipped"] += 1
            continue

        md_name = Path(metadata["text_path"]).name
        md_path = output_dir / md_name
        if not md_path.exists():
            stats["errors"] += 1
            continue

        try:
            assets = ocr_raw_document_file(
                md_path,
                meta_path,
                output_dir,
                tesseract_lang=tesseract_lang,
                tesseract_cmd=tesseract_cmd,
                force=not skip_existing,
            )
            stats["processed"] += 1
            stats["images"] += len(assets)
        except Exception:
            logger.exception("OCR failed for %s", metadata.get("sample_id"))
            stats["errors"] += 1

    logger.info(
        "OCR complete: %d documents, %d images, %d skipped, %d errors",
        stats["processed"],
        stats["images"],
        stats["skipped"],
        stats["errors"],
    )
    return stats


def enrich_raw_documents(
    output_dir: Path,
    *,
    timeout: float = 30.0,
    delay_seconds: float = 0.5,
    skip_existing: bool = True,
    max_images: int = 20,
    run_ocr: bool = True,
    tesseract_lang: str = "eng",
    tesseract_cmd: str | None = None,
) -> dict[str, int]:
    """Download images for all existing article raw documents."""
    import json
    import time

    from tqdm import tqdm

    stats = {"processed": 0, "skipped": 0, "images": 0, "errors": 0}

    meta_files = sorted(output_dir.glob("case_*.meta.json"))
    for meta_path in tqdm(meta_files, desc="Enriching images"):
        metadata = json.loads(meta_path.read_text(encoding="utf-8"))
        if metadata.get("content_type") != "article":
            stats["skipped"] += 1
            continue

        if skip_existing and metadata.get("image_count", 0) > 0:
            stats["skipped"] += 1
            continue

        md_name = Path(metadata["text_path"]).name
        md_path = output_dir / md_name
        if not md_path.exists():
            logger.warning("Missing markdown for %s", metadata.get("sample_id"))
            stats["errors"] += 1
            continue

        try:
            assets = enrich_raw_document_file(
                md_path,
                meta_path,
                output_dir,
                timeout=timeout,
                max_images=max_images,
                run_ocr=run_ocr,
                tesseract_lang=tesseract_lang,
                tesseract_cmd=tesseract_cmd,
            )
            stats["processed"] += 1
            stats["images"] += len(assets)
        except Exception:
            logger.exception("Failed to enrich images for %s", metadata.get("sample_id"))
            stats["errors"] += 1

        if delay_seconds > 0:
            time.sleep(delay_seconds)

    logger.info(
        "Image enrichment complete: %d articles processed, %d images, %d skipped, %d errors",
        stats["processed"],
        stats["images"],
        stats["skipped"],
        stats["errors"],
    )
    return stats


def image_assets_to_metadata(assets: list[ImageAsset]) -> list[dict]:
    records: list[dict] = []
    for asset in assets:
        record = asdict(asset)
        record["local_path"] = to_repo_relative_path(asset.local_path)
        record["ocr_text"] = asset.ocr_text
        records.append(record)
    return records
