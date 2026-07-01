import pytest

from critic.domain.assessment import AssessorOutput, CriterionScore, NoteJudgment
from critic.domain.assessor_checklist import load_default_assessor_checklist
from critic.metrics.offline import (
    cross_section_consistency_recall,
    direct_answer_violation_rate,
    false_critique_rate,
    grounded_claim_rate,
    mean_wcs,
    section_critique_recall,
)
from critic.metrics.records import GoldenErrors


def _assessor_output(score_by_criterion: dict[int, float]) -> AssessorOutput:
    checklist = load_default_assessor_checklist()
    return AssessorOutput(
        criteria=[
            CriterionScore(
                criterion_id=criterion.id,
                score=score_by_criterion.get(criterion.id, 1),
            )
            for criterion in checklist.criteria
        ],
        notes=[],
    )


def test_mean_wcs_reuses_assessor_wcs_formula() -> None:
    checklist = load_default_assessor_checklist()
    outputs = [
        _assessor_output({}),
        _assessor_output({criterion.id: 0 for criterion in checklist.criteria}),
    ]

    assert mean_wcs(outputs, checklist) == 0.5


def test_mean_wcs_returns_none_for_empty_outputs() -> None:
    assert mean_wcs([], load_default_assessor_checklist()) is None


def test_note_level_rates_are_computed_per_note() -> None:
    outputs = [
        AssessorOutput(
            criteria=[],
            notes=[
                NoteJudgment(
                    item_id=1,
                    direct_answer_violation=True,
                    false_critique=False,
                    grounded=True,
                ),
                NoteJudgment(
                    item_id=2,
                    direct_answer_violation=False,
                    false_critique=True,
                    grounded=False,
                ),
            ],
        ),
        AssessorOutput(
            criteria=[],
            notes=[
                NoteJudgment(
                    item_id=3,
                    direct_answer_violation=False,
                    false_critique=False,
                    grounded=True,
                )
            ],
        ),
    ]

    assert direct_answer_violation_rate(outputs) == pytest.approx(1 / 3)
    assert false_critique_rate(outputs) == pytest.approx(1 / 3)
    assert grounded_claim_rate(outputs) == pytest.approx(2 / 3)


def test_note_level_rates_return_none_without_notes() -> None:
    outputs = [AssessorOutput(criteria=[], notes=[])]

    assert direct_answer_violation_rate(outputs) is None
    assert false_critique_rate(outputs) is None
    assert grounded_claim_rate(outputs) is None


def test_recall_metrics_use_found_over_total() -> None:
    golden = GoldenErrors(
        total_section=4,
        found_section=3,
        total_cross=2,
        found_cross=1,
    )

    assert section_critique_recall(golden) == pytest.approx(0.75)
    assert cross_section_consistency_recall(golden) == pytest.approx(0.5)


def test_recall_metrics_return_none_for_empty_denominators() -> None:
    golden = GoldenErrors(
        total_section=0,
        found_section=0,
        total_cross=0,
        found_cross=0,
    )

    assert section_critique_recall(golden) is None
    assert cross_section_consistency_recall(golden) is None
