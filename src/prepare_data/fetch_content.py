"""Download and extract raw text from articles and video URLs."""

from __future__ import annotations

import json
import logging
import os
import re
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from urllib.parse import urlparse

import certifi
import httpx
import trafilatura

from prepare_data.paths import sanitize_metadata_paths, to_repo_relative_path
from prepare_data.transcribe import transcribe_youtube_url

logger = logging.getLogger(__name__)

os.environ.setdefault("SSL_CERT_FILE", certifi.where())
os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())

YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"}


def is_youtube_url(url: str) -> bool:
    parsed = urlparse(url)
    host = parsed.netloc.lower().removeprefix("www.")
    if host in YOUTUBE_HOSTS or "youtube" in host:
        return True
    return "youtu.be" in host


def slugify(text: str, max_length: int = 80) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", text.strip().lower()).strip("_")
    return slug[:max_length] or "document"


@dataclass
class FetchResult:
    sample_id: str
    title: str
    url: str
    content_type: str
    text: str
    source_path: Path
    metadata_path: Path
    status: str
    error: str | None = None


def fetch_html(url: str, timeout: float = 30.0, max_retries: int = 4) -> str:
    """Download HTML with certifi; fall back to insecure TLS for broken site chains."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; MLDesignDocReviewer/0.1; +dataset-prep)"
        ),
    }
    last_error: Exception | None = None

    for attempt in range(max_retries):
        for verify in (certifi.where(), False):
            try:
                with httpx.Client(
                    timeout=timeout,
                    verify=verify,
                    follow_redirects=True,
                    headers=headers,
                ) as client:
                    response = client.get(url)
                    if response.status_code in {429, 503, 502} and attempt < max_retries - 1:
                        wait = 2 ** attempt + 1
                        logger.warning(
                            "HTTP %s for %s, retrying in %ss (attempt %d/%d)",
                            response.status_code,
                            url,
                            wait,
                            attempt + 1,
                            max_retries,
                        )
                        time.sleep(wait)
                        raise httpx.HTTPStatusError(
                            "retryable",
                            request=response.request,
                            response=response,
                        )
                    response.raise_for_status()
                    if verify is False:
                        logger.warning(
                            "Fetched %s with SSL verification disabled (broken cert chain)",
                            url,
                        )
                    return response.text
            except httpx.HTTPError as exc:
                last_error = exc
                if verify is not False and "CERTIFICATE_VERIFY_FAILED" in str(exc):
                    logger.warning(
                        "SSL verification failed for %s, retrying insecurely", url
                    )
                    continue
                if (
                    isinstance(exc, httpx.HTTPStatusError)
                    and exc.response is not None
                    and exc.response.status_code in {429, 503, 502}
                    and attempt < max_retries - 1
                ):
                    break
                raise
        else:
            continue
        continue

    raise RuntimeError(f"Failed to download URL after retries: {url}") from last_error


def fetch_article_text(url: str, timeout: float = 30.0) -> str:
    html = fetch_html(url, timeout=timeout)

    text = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=True,
        favor_precision=True,
        url=url,
    )
    if not text or len(text.strip()) < 200:
        raise RuntimeError(f"Extracted text too short or empty for URL: {url}")
    return text.strip()


def remove_stale_error_file(output_dir: Path, sample_id: str) -> None:
    """Remove a previous error artifact after a successful re-fetch."""
    error_path = output_dir / f"{sample_id}_ERROR.json"
    if error_path.exists():
        error_path.unlink()
        logger.info("Removed stale error file for %s", sample_id)


def save_raw_document(
    output_dir: Path,
    sample_id: str,
    title: str,
    url: str,
    content_type: str,
    text: str,
    extra_metadata: dict | None = None,
) -> tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    base_name = f"{sample_id}_{slugify(title)}"
    text_path = output_dir / f"{base_name}.md"
    meta_path = output_dir / f"{base_name}.meta.json"

    header = (
        f"# {title}\n\n"
        f"- **Sample ID**: {sample_id}\n"
        f"- **Source URL**: {url}\n"
        f"- **Content type**: {content_type}\n\n"
        f"---\n\n"
    )
    text_path.write_text(header + text, encoding="utf-8")

    metadata = {
        "sample_id": sample_id,
        "title": title,
        "url": url,
        "content_type": content_type,
        "text_path": to_repo_relative_path(text_path),
        "char_count": len(text),
    }
    if extra_metadata:
        metadata.update(sanitize_metadata_paths(extra_metadata))
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    remove_stale_error_file(output_dir, sample_id)
    return text_path, meta_path


def fetch_single_case(
    row: dict,
    output_dir: Path,
    *,
    whisper_model: str,
    whisper_device: str,
    whisper_compute_type: str,
    timeout: float,
) -> FetchResult:
    sample_id = row["sample_id"]
    title = row["Title"]
    url = row["Link"]
    content_type = row.get("content_type") or (
        "video" if is_youtube_url(url) else "article"
    )

    try:
        if content_type == "video" or is_youtube_url(url):
            text, transcript_meta = transcribe_youtube_url(
                url,
                output_dir / "audio",
                model_size=whisper_model,
                device=whisper_device,
                compute_type=whisper_compute_type,
            )
            content_type = "video"
            extra = {"transcript": transcript_meta}
        else:
            text = fetch_article_text(url, timeout=timeout)
            extra = None

        source_path, metadata_path = save_raw_document(
            output_dir,
            sample_id=sample_id,
            title=title,
            url=url,
            content_type=content_type,
            text=text,
            extra_metadata=extra,
        )
        return FetchResult(
            sample_id=sample_id,
            title=title,
            url=url,
            content_type=content_type,
            text=text,
            source_path=source_path,
            metadata_path=metadata_path,
            status="ok",
        )
    except Exception as exc:
        logger.exception("Failed to fetch %s (%s)", sample_id, url)
        error_path = output_dir / f"{sample_id}_ERROR.json"
        error_path.write_text(
            json.dumps(
                {
                    "sample_id": sample_id,
                    "title": title,
                    "url": url,
                    "error": str(exc),
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        return FetchResult(
            sample_id=sample_id,
            title=title,
            url=url,
            content_type=content_type,
            text="",
            source_path=error_path,
            metadata_path=error_path,
            status="error",
            error=str(exc),
        )


def fetch_manifest(
    manifest_path: Path,
    output_dir: Path,
    *,
    whisper_model: str,
    whisper_device: str,
    whisper_compute_type: str,
    timeout: float,
    delay_seconds: float,
    skip_existing: bool = True,
) -> list[FetchResult]:
    import pandas as pd
    from tqdm import tqdm

    manifest = pd.read_csv(manifest_path)
    results: list[FetchResult] = []

    for _, row in tqdm(manifest.iterrows(), total=len(manifest), desc="Fetching"):
        sample_id = row["sample_id"]
        expected = output_dir / f"{sample_id}_*.md"
        if skip_existing and list(output_dir.glob(f"{sample_id}_*.md")):
            logger.info("Skipping existing raw document for %s", sample_id)
            continue

        result = fetch_single_case(
            row.to_dict(),
            output_dir,
            whisper_model=whisper_model,
            whisper_device=whisper_device,
            whisper_compute_type=whisper_compute_type,
            timeout=timeout,
        )
        results.append(result)
        if delay_seconds > 0:
            time.sleep(delay_seconds)

    summary_path = output_dir / "fetch_summary.json"
    summary_records = []
    for result in results:
        record = asdict(result)
        record["source_path"] = to_repo_relative_path(result.source_path)
        record["metadata_path"] = to_repo_relative_path(result.metadata_path)
        summary_records.append(record)

    summary_path.write_text(
        json.dumps(summary_records, indent=2),
        encoding="utf-8",
    )
    ok = sum(1 for r in results if r.status == "ok")
    logger.info("Fetch complete: %d/%d succeeded", ok, len(results))

    for md_path in output_dir.glob("case_*.md"):
        match = re.match(r"(case_\d{3})", md_path.name)
        if match:
            remove_stale_error_file(output_dir, match.group(1))

    return results
