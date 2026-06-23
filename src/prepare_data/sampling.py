"""Stratified sampling of ML/LLM use cases from the Evidently AI catalog."""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

STRATIFY_COLUMNS = ["Industry", "Technology", "content_type", "year_bucket"]


def _content_type(link: str) -> str:
    lowered = str(link).lower()
    if "youtube.com" in lowered or "youtu.be" in lowered:
        return "video"
    return "article"


def _year_bucket(year: int | float | str) -> str:
    try:
        value = int(year)
    except (TypeError, ValueError):
        return "unknown"
    if value >= 2024:
        return "2024+"
    if value >= 2021:
        return "2021-2023"
    return "2017-2020"


def enrich_cases_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Add stratification columns used for sampling."""
    enriched = df.copy()
    enriched["content_type"] = enriched["Link"].map(_content_type)
    enriched["year_bucket"] = enriched["Year"].map(_year_bucket)
    enriched["stratum"] = enriched[STRATIFY_COLUMNS].astype(str).agg(" | ".join, axis=1)
    return enriched


def _allocate_samples(stratum_sizes: pd.Series, target_n: int) -> dict[str, int]:
    """Proportional allocation with minimum one sample per non-empty stratum."""
    total = int(stratum_sizes.sum())
    if total == 0:
        return {}

    raw = (stratum_sizes / total * target_n).round().astype(int)
    raw = raw.clip(lower=0)

    # Ensure at least one sample for strata that exist in the catalog.
    for stratum, size in stratum_sizes.items():
        if size > 0:
            raw[stratum] = max(int(raw.get(stratum, 0)), 1)

    # Cap allocations by available stratum size.
    allocation = {
        stratum: min(int(count), int(stratum_sizes[stratum])) for stratum, count in raw.items()
    }

    current = sum(allocation.values())

    if current > target_n:
        # Remove excess from largest strata first (keeping at least one where possible).
        sorted_strata = sorted(
            allocation,
            key=lambda s: (allocation[s], stratum_sizes[s]),
            reverse=True,
        )
        while current > target_n:
            for stratum in sorted_strata:
                if current <= target_n:
                    break
                if allocation[stratum] > 1:
                    allocation[stratum] -= 1
                    current -= 1
            else:
                break

    elif current < target_n:
        # Add samples to strata with remaining capacity.
        while current < target_n:
            candidates = [s for s, size in stratum_sizes.items() if allocation.get(s, 0) < size]
            if not candidates:
                break
            best = max(
                candidates,
                key=lambda s: (stratum_sizes[s] - allocation.get(s, 0), stratum_sizes[s]),
            )
            allocation[best] = allocation.get(best, 0) + 1
            current += 1

    return allocation


def stratified_sample(
    df: pd.DataFrame,
    n: int = 100,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Draw a stratified sample across Industry, Technology, content type, and year bucket.

    Uses proportional allocation per composite stratum, then adjusts to exactly ``n`` rows.
    """
    if n > len(df):
        raise ValueError(f"Requested sample size {n} exceeds dataset size {len(df)}")

    enriched = enrich_cases_frame(df)
    stratum_sizes = enriched["stratum"].value_counts()
    allocation = _allocate_samples(stratum_sizes, n)

    sampled_indices: list[int] = []
    for stratum, count in allocation.items():
        group = enriched[enriched["stratum"] == stratum]
        if count <= 0 or group.empty:
            continue
        take = min(count, len(group))
        chosen = group.sample(n=take, random_state=random_state)
        sampled_indices.extend(chosen.index.tolist())

    sample = enriched.loc[sampled_indices]

    if len(sample) < n:
        remaining = enriched.drop(sampled_indices)
        extra = remaining.sample(n=n - len(sample), random_state=random_state)
        sample = pd.concat([sample, extra])

    if len(sample) > n:
        sample = sample.sample(n=n, random_state=random_state)

    sample = sample.reset_index(drop=True)
    sample["sample_id"] = sample.index.map(lambda i: f"case_{i:03d}")
    return sample


def load_cases_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Cases CSV not found: {path}")
    return pd.read_csv(path)


def save_sample_manifest(sample: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sample.to_csv(path, index=False)
    logger.info("Saved sample manifest (%d rows) to %s", len(sample), path)


def summarize_sample(sample: pd.DataFrame) -> dict[str, pd.Series]:
    """Return distribution summaries for QA."""
    return {
        "Industry": sample["Industry"].value_counts(),
        "Technology": sample["Technology"].value_counts(),
        "content_type": sample["content_type"].value_counts(),
        "year_bucket": sample["year_bucket"].value_counts(),
        "Year": sample["Year"].value_counts().sort_index(),
    }


def run_sampling(
    cases_csv: Path,
    output_path: Path,
    sample_size: int = 100,
    random_seed: int = 42,
) -> pd.DataFrame:
    df = load_cases_csv(cases_csv)
    sample = stratified_sample(df, n=sample_size, random_state=random_seed)
    save_sample_manifest(sample, output_path)

    summary = summarize_sample(sample)
    for name, counts in summary.items():
        logger.info("Sample distribution — %s:\n%s", name, counts.to_string())

    return sample
