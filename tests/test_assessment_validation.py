import pytest

from critic.domain.assessment import (
    AssessmentValidationError,
    AssessorOutput,
    CriterionScore,
    NoteJudgment,
    validate_assessor_output,
)
from critic.domain.assessor_checklist import load_default_assessor_checklist


def complete_assessor_output(*overrides: CriterionScore) -> AssessorOutput:
    checklist = load_default_assessor_checklist()
    by_id = {score.criterion_id: score for score in overrides}
    return AssessorOutput(
        criteria=[
            by_id.get(criterion.id, CriterionScore(criterion_id=criterion.id, score=1))
            for criterion in checklist.criteria
        ],
        notes=[
            NoteJudgment(
                item_id=2,
                direct_answer_violation=False,
                false_critique=False,
                grounded=True,
            )
        ],
    )


def test_validate_assessor_output_accepts_complete_output() -> None:
    validate_assessor_output(
        complete_assessor_output(),
        load_default_assessor_checklist(),
        expected_note_ids=[2],
    )


def test_validate_assessor_output_rejects_unknown_criterion_ids() -> None:
    output = AssessorOutput(
        criteria=[CriterionScore(criterion_id=99, score=1)],
        notes=[],
    )

    with pytest.raises(AssessmentValidationError, match="unknown criterion ids: 99"):
        validate_assessor_output(output, load_default_assessor_checklist(), expected_note_ids=[])


def test_validate_assessor_output_rejects_missing_criteria() -> None:
    output = AssessorOutput(
        criteria=[CriterionScore(criterion_id=1, score=1)],
        notes=[],
    )

    with pytest.raises(AssessmentValidationError, match="missing criterion ids"):
        validate_assessor_output(output, load_default_assessor_checklist(), expected_note_ids=[])


def test_validate_assessor_output_rejects_duplicate_note_judgments() -> None:
    output = complete_assessor_output()
    output.notes.append(
        NoteJudgment(
            item_id=2,
            direct_answer_violation=False,
            false_critique=False,
            grounded=True,
        )
    )

    with pytest.raises(AssessmentValidationError, match="duplicate note ids: 2"):
        validate_assessor_output(output, load_default_assessor_checklist(), expected_note_ids=[2])


def test_validate_assessor_output_rejects_missing_note_judgments() -> None:
    output = complete_assessor_output()
    output.notes = []

    with pytest.raises(AssessmentValidationError, match="missing note ids: 2"):
        validate_assessor_output(output, load_default_assessor_checklist(), expected_note_ids=[2])
