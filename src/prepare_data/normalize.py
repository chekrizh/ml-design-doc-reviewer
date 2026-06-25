"""Normalize raw documents into canonical ML design docs via an OpenAI-compatible API."""

from __future__ import annotations

import json
import logging
import re
import time
from pathlib import Path

from prepare_data.llm_client import OpenAIChatClient
from prepare_data.paths import to_repo_relative_path

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_MARKER = "## System Prompt"
USER_TEMPLATE_MARKER = "## User Message Template"


def load_normalize_prompt(prompt_path: Path) -> tuple[str, str]:
    """Parse system prompt and user template from the markdown prompt file."""
    content = prompt_path.read_text(encoding="utf-8")

    system_start = content.index(SYSTEM_PROMPT_MARKER)
    user_start = content.index(USER_TEMPLATE_MARKER)
    system_block = content[system_start:user_start]

    system_lines = system_block.splitlines()[1:]
    # Drop trailing '---' before next section.
    while system_lines and system_lines[-1].strip() in {"", "---"}:
        system_lines.pop()
    system_prompt = "\n".join(system_lines).strip()

    user_block = content[user_start:]
    match = re.search(r"```\n(.*?)```", user_block, re.DOTALL)
    if not match:
        raise ValueError(f"User template code block not found in {prompt_path}")
    user_template = match.group(1).strip()
    return system_prompt, user_template


def load_disdoc_examples(examples_dir: Path, max_chars: int = 4000) -> str:
    """Load reference design doc excerpts for few-shot style grounding."""
    if not examples_dir.exists():
        return ""

    chunks: list[str] = []
    remaining = max_chars
    for path in sorted(examples_dir.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        excerpt = text[: min(len(text), remaining)]
        chunks.append(f"### Reference example: {path.name}\n\n{excerpt}")
        remaining -= len(excerpt)
        if remaining <= 0:
            break
    return "\n\n---\n\n".join(chunks)


def build_user_message(
    template: str,
    row: dict,
    raw_content: str,
) -> str:
    return template.format(
        company=row.get("Company", "unknown"),
        title=row.get("Title", "unknown"),
        industry=row.get("Industry", "unknown"),
        technology=row.get("Technology", "unknown"),
        tags=row.get("Tag", "unknown"),
        year=row.get("Year", "unknown"),
        link=row.get("Link", "unknown"),
        content_type=row.get("content_type", "unknown"),
        raw_content=raw_content,
    )


def normalize_document(
    client: OpenAIChatClient,
    system_prompt: str,
    user_template: str,
    row: dict,
    raw_text: str,
    examples_excerpt: str,
    *,
    max_tokens: int = 8192,
) -> str:
    augmented_system = system_prompt
    if examples_excerpt:
        augmented_system += (
            "\n\n## Reference design document excerpts\n\n"
            "Use these only as style and structure references:\n\n"
            f"{examples_excerpt}"
        )
    user_message = build_user_message(user_template, row, raw_text)
    return client.complete(augmented_system, user_message, max_tokens=max_tokens)


def normalize_manifest(
    manifest_path: Path,
    raw_documents_dir: Path,
    output_dir: Path,
    prompt_path: Path,
    examples_dir: Path,
    *,
    api_key: str,
    model: str,
    base_url: str,
    max_tokens: int = 8192,
    normalize_delay_seconds: float = 3.0,
    skip_existing: bool = True,
    max_raw_chars: int = 100_000,
) -> list[dict]:
    import pandas as pd
    from tqdm import tqdm

    system_prompt, user_template = load_normalize_prompt(prompt_path)
    examples_excerpt = load_disdoc_examples(examples_dir)
    client = OpenAIChatClient(api_key=api_key, base_url=base_url, model=model)

    manifest = pd.read_csv(manifest_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []

    for _, row in tqdm(manifest.iterrows(), total=len(manifest), desc="Normalizing"):
        sample_id = row["sample_id"]
        out_path = output_dir / f"{sample_id}_disdoc.md"
        if skip_existing and out_path.exists():
            logger.info("Skipping existing normalized doc for %s", sample_id)
            continue

        raw_files = list(raw_documents_dir.glob(f"{sample_id}_*.md"))
        if not raw_files:
            logger.warning("No raw document for %s, skipping", sample_id)
            results.append({"sample_id": sample_id, "status": "missing_raw"})
            continue

        raw_text = raw_files[0].read_text(encoding="utf-8")
        if len(raw_text) > max_raw_chars:
            raw_text = raw_text[:max_raw_chars] + "\n\n[truncated]"

        try:
            normalized = normalize_document(
                client,
                system_prompt,
                user_template,
                row.to_dict(),
                raw_text,
                examples_excerpt,
                max_tokens=max_tokens,
            )
            out_path.write_text(normalized, encoding="utf-8")
            error_path = output_dir / f"{sample_id}_ERROR.json"
            if error_path.exists():
                error_path.unlink()
            results.append(
                {
                    "sample_id": sample_id,
                    "status": "ok",
                    "output_path": to_repo_relative_path(out_path),
                }
            )
        except Exception as exc:
            logger.exception("Normalization failed for %s", sample_id)
            error_path = output_dir / f"{sample_id}_ERROR.json"
            error_path.write_text(
                json.dumps({"sample_id": sample_id, "error": str(exc)}, indent=2),
                encoding="utf-8",
            )
            results.append({"sample_id": sample_id, "status": "error", "error": str(exc)})

        if normalize_delay_seconds > 0:
            time.sleep(normalize_delay_seconds)

    summary_path = output_dir / "normalize_summary.json"
    summary_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    ok = sum(1 for r in results if r.get("status") == "ok")
    logger.info("Normalization complete: %d/%d succeeded", ok, len(results))
    return results
