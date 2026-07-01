import pytest

from critic.assessor.kappa import (
    KappaAgreementLevel,
    compute_cohens_kappa,
    interpret_kappa,
)


def test_compute_cohens_kappa_returns_one_for_perfect_agreement() -> None:
    ratings = [0, 0.5, 1, 1, 0.5]

    assert compute_cohens_kappa(ratings, ratings) == 1.0


def test_compute_cohens_kappa_uses_expected_chance_agreement() -> None:
    ratings_a = [0, 0, 0.5, 0.5, 1, 1]
    ratings_b = [0, 0.5, 0.5, 0.5, 1, 0]

    assert compute_cohens_kappa(ratings_a, ratings_b) == pytest.approx(0.5)


def test_compute_cohens_kappa_handles_degenerate_perfect_agreement() -> None:
    assert compute_cohens_kappa([1, 1, 1], [1, 1, 1]) == 1.0


def test_compute_cohens_kappa_rejects_mismatched_lengths() -> None:
    with pytest.raises(ValueError, match="same length"):
        compute_cohens_kappa([1, 0.5], [1])


def test_compute_cohens_kappa_rejects_empty_inputs() -> None:
    with pytest.raises(ValueError, match="at least one"):
        compute_cohens_kappa([], [])


@pytest.mark.parametrize(
    ("kappa", "expected_level"),
    [
        (0.39, KappaAgreementLevel.poor),
        (0.4, KappaAgreementLevel.moderate),
        (0.59, KappaAgreementLevel.moderate),
        (0.6, KappaAgreementLevel.substantial),
    ],
)
def test_interpret_kappa_uses_design_doc_thresholds(
    kappa: float,
    expected_level: KappaAgreementLevel,
) -> None:
    assert interpret_kappa(kappa) == expected_level
