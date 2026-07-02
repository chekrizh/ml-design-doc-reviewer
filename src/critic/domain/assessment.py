from pydantic import BaseModel, Field

from critic.domain.assessor_checklist import AssessorChecklist
from critic.domain.id_validation import describe_id_set_problems
from critic.domain.scoring import Score


class AssessmentValidationError(ValueError):
    """Raised when assessor output violates the evaluation contract."""


class CriterionScore(BaseModel):
    criterion_id: int = Field(ge=1)
    score: Score
    justification: str | None = None


class NoteJudgment(BaseModel):
    # TODO(design-doc): aggregate these raw note-level flags into DAVR, FCR,
    # and Grounded Claim Rate when the deferred metrics reporting step is built.
    item_id: int = Field(ge=1)
    direct_answer_violation: bool
    false_critique: bool
    grounded: bool


class AssessorOutput(BaseModel):
    criteria: list[CriterionScore] = Field(default_factory=list)
    notes: list[NoteJudgment] = Field(default_factory=list)


def validate_assessor_output(
    output: AssessorOutput,
    checklist: AssessorChecklist,
    *,
    expected_note_ids: list[int],
) -> None:
    problems = _criterion_id_problems(output, checklist)

    expected_note_id_set = set(expected_note_ids)
    actual_note_ids = [note.item_id for note in output.notes]
    problems.extend(
        describe_id_set_problems(
            actual_note_ids,
            expected_note_id_set,
            label="note",
        )
    )

    if problems:
        raise AssessmentValidationError("; ".join(problems))


def validate_assessor_criteria(
    output: AssessorOutput,
    checklist: AssessorChecklist,
) -> None:
    problems = _criterion_id_problems(output, checklist)
    if problems:
        raise AssessmentValidationError("; ".join(problems))


def _criterion_id_problems(
    output: AssessorOutput,
    checklist: AssessorChecklist,
) -> list[str]:
    expected_criterion_ids = {criterion.id for criterion in checklist.criteria}
    actual_criterion_ids = [score.criterion_id for score in output.criteria]
    return describe_id_set_problems(
        actual_criterion_ids,
        expected_criterion_ids,
        label="criterion",
    )
