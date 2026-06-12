"""Tesseract OCR helpers for image text extraction."""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)

OCR_SKIPPED_SVG = "SKIPPED_SVG"
OCR_NO_TEXT = "NO_TEXT_DETECTED"
OCR_UNAVAILABLE = "OCR_UNAVAILABLE"
OCR_RASTERIZE_FAILED = "OCR_RASTERIZE_FAILED"

_NON_OCR_EXTENSIONS = {".svg"}


def configure_tesseract(tesseract_cmd: str | None = None) -> None:
    """Point pytesseract at the system binary when needed."""
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        return

    if shutil.which("tesseract") is None:
        common_paths = (
            "/opt/homebrew/bin/tesseract",
            "/usr/local/bin/tesseract",
        )
        for candidate in common_paths:
            if Path(candidate).is_file():
                pytesseract.pytesseract.tesseract_cmd = candidate
                return
        raise RuntimeError(
            "tesseract binary not found. Install it (e.g. `brew install tesseract`) "
            "or set TESSERACT_CMD in the environment."
        )


def _normalize_ocr_text(text: str) -> str:
    return " ".join(text.split())


def ocr_image_file(path: Path, *, lang: str = "eng", tesseract_cmd: str | None = None) -> str:
    """Run Tesseract on a raster image and return cleaned text."""
    if path.suffix.lower() in _NON_OCR_EXTENSIONS:
        return OCR_SKIPPED_SVG

    configure_tesseract(tesseract_cmd)

    try:
        with Image.open(path) as image:
            if getattr(image, "n_frames", 1) > 1:
                image.seek(0)
            if image.mode not in ("RGB", "L"):
                image = image.convert("RGB")
            raw = pytesseract.image_to_string(image, lang=lang)
    except Exception as exc:
        logger.warning("OCR failed for %s: %s", path, exc)
        return OCR_RASTERIZE_FAILED

    cleaned = _normalize_ocr_text(raw)
    return cleaned if cleaned else OCR_NO_TEXT
