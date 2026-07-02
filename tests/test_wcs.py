import pytest

from critic.assessor.wcs import compute_wcs
from critic.domain.assessment import AssessmentValidationError, AssessorOutput, CriterionScore
from critic.domain.assessor_checklist import load_default_assessor_checklist


def test_compute_wcs_returns_one_for_perfect_assessment() -> None:
    checklist = load_default_assessor_checklist()
    output = AssessorOutput(
        criteria=[
            CriterionScore(criterion_id=criterion.id, score=1)
            for criterion in checklist.criteria
        ],
        notes=[],
    )

    assert compute_wcs(output, checklist) == 1.0


def test_compute_wcs_uses_assessor_weights() -> None:
    checklist = load_default_assessor_checklist()
    scores = {
        1: 1,
        2: 0.5,
        3: 0,
        4: 1,
        5: 0.5,
        6: 1,
        7: 0,
        8: 1,
        9: 0.5,
    }
    output = AssessorOutput(
        criteria=[
            CriterionScore(criterion_id=criterion.id, score=scores[criterion.id])
            for criterion in checklist.criteria
        ],
        notes=[],
    )

    assert compute_wcs(output, checklist) == 12 / 19


def test_compute_wcs_rejects_missing_criteria() -> None:
    output = AssessorOutput(criteria=[CriterionScore(criterion_id=1, score=1)], notes=[])

    with pytest.raises(AssessmentValidationError, match="missing criterion ids"):
        compute_wcs(output, load_default_assessor_checklist())
