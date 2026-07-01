"""Cohen's Kappa helpers for future Assessor calibration.

This module is only the math primitive from the design doc's Calibration
Mechanism. The expert-labeled validation set, drift diagnosis, and recalibration
loop require a curated labeling dataset and are intentionally future work.
"""

from collections import Counter
from collections.abc import Sequence
from enum import StrEnum


class KappaAgreementLevel(StrEnum):
    poor = "poor"
    moderate = "moderate"
    substantial = "substantial"


def compute_cohens_kappa(ratings_a: Sequence[float], ratings_b: Sequence[float]) -> float:
    if len(ratings_a) != len(ratings_b):
        raise ValueError("ratings must have the same length")
    if not ratings_a:
        raise ValueError("ratings must include at least one item")

    total = len(ratings_a)
    observed_agreement = sum(
        rating_a == rating_b for rating_a, rating_b in zip(ratings_a, ratings_b, strict=True)
    ) / total

    counts_a = Counter(ratings_a)
    counts_b = Counter(ratings_b)
    labels = set(counts_a) | set(counts_b)
    expected_agreement = sum(
        (counts_a[label] / total) * (counts_b[label] / total) for label in labels
    )

    if expected_agreement == 1:
        return 1.0
    return (observed_agreement - expected_agreement) / (1 - expected_agreement)


def interpret_kappa(kappa: float) -> KappaAgreementLevel:
    if kappa >= 0.6:
        return KappaAgreementLevel.substantial
    if kappa >= 0.4:
        return KappaAgreementLevel.moderate
    return KappaAgreementLevel.poor
