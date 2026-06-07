"""YouTube audio download and Whisper transcription."""

from __future__ import annotations

import logging
import os
import subprocess
import sys
import tempfile
from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qs, urlparse

logger = logging.getLogger(__name__)


@lru_cache(maxsize=2)
def _load_whisper_model(model_size: str, device: str, compute_type: str):
    from faster_whisper import WhisperModel

    return WhisperModel(model_size, device=device, compute_type=compute_type)


def _extract_video_id(url: str) -> str | None:
    parsed = urlparse(url)
    video_id = parse_qs(parsed.query).get("v", [None])[0]
    if parsed.netloc.endswith("youtu.be") and not video_id:
        video_id = parsed.path.strip("/") or None
    return video_id


def download_youtube_audio(url: str, output_dir: Path) -> Path:
    """Download best available audio track from YouTube via yt-dlp (no ffmpeg required)."""
    output_dir.mkdir(parents=True, exist_ok=True)
    output_template = str(output_dir / "%(id)s.%(ext)s")

    cmd = [
        sys.executable,
        "-m",
        "yt_dlp",
        "--no-playlist",
        "-f",
        "ba/b",
        "-o",
        output_template,
        url,
    ]
    cookies_browser = os.getenv("YOUTUBE_COOKIES_FROM_BROWSER")
    if cookies_browser:
        cmd.extend(["--cookies-from-browser", cookies_browser])

    logger.info("Downloading audio: %s", url)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"yt-dlp failed for {url}: {result.stderr.strip() or result.stdout.strip()}"
        )

    audio_files = sorted(
        [
            p
            for p in output_dir.iterdir()
            if p.suffix.lower() in {".m4a", ".webm", ".opus", ".mp3", ".wav"}
        ],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not audio_files:
        raise RuntimeError(f"No audio file produced for {url}")
    return audio_files[0]


def transcribe_audio_file(
    audio_path: Path,
    *,
    model_size: str = "small",
    device: str = "cpu",
    compute_type: str = "int8",
) -> tuple[str, dict]:
    model = _load_whisper_model(model_size, device, compute_type)
    segments, info = model.transcribe(str(audio_path), beam_size=5, vad_filter=True)

    parts: list[str] = []
    segment_records: list[dict] = []
    for segment in segments:
        parts.append(segment.text.strip())
        segment_records.append(
            {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
            }
        )

    text = "\n".join(part for part in parts if part)
    if not text:
        raise RuntimeError(f"Whisper returned empty transcript for {audio_path}")

    metadata = {
        "language": info.language,
        "language_probability": info.language_probability,
        "duration": info.duration,
        "audio_path": str(audio_path),
        "segment_count": len(segment_records),
    }
    return text, metadata


def fetch_youtube_transcript(url: str) -> tuple[str, dict] | None:
    """Try to fetch existing YouTube captions before falling back to Whisper."""
    from youtube_transcript_api import YouTubeTranscriptApi

    video_id = _extract_video_id(url)
    if not video_id:
        return None

    api = YouTubeTranscriptApi()
    fetched = None
    for languages in (("en",), ()):
        try:
            fetched = api.fetch(video_id, languages=languages) if languages else api.fetch(video_id)
            break
        except Exception as exc:
            logger.debug("Caption fetch failed for %s (%s): %s", url, languages, exc)

    if fetched is None:
        return None

    text = "\n".join(
        snippet.text.strip() for snippet in fetched if getattr(snippet, "text", "").strip()
    )
    if len(text.strip()) < 200:
        return None

    return text.strip(), {
        "source_url": url,
        "video_id": video_id,
        "transcript_source": "youtube_captions",
    }


def transcribe_youtube_url(
    url: str,
    audio_dir: Path,
    *,
    model_size: str = "small",
    device: str = "cpu",
    compute_type: str = "int8",
) -> tuple[str, dict]:
    caption_result = fetch_youtube_transcript(url)
    if caption_result is not None:
        logger.info("Using YouTube captions for %s", url)
        return caption_result

    logger.info("No captions for %s, falling back to Whisper via yt-dlp", url)
    with tempfile.TemporaryDirectory(prefix="yt_audio_") as tmp:
        tmp_path = Path(tmp)
        audio_path = download_youtube_audio(url, tmp_path)
        text, meta = transcribe_audio_file(
            audio_path,
            model_size=model_size,
            device=device,
            compute_type=compute_type,
        )
        meta["source_url"] = url
        meta["transcript_source"] = "whisper"
        return text, meta
