from collections import Counter
from typing import Literal

from pydantic import BaseModel, Field

from critic.domain.assessor_checklist import AssessorChecklist

Score = Literal[0, 0.5, 1]


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
    expected_criterion_ids = {criterion.id for criterion in checklist.criteria}
    actual_criterion_ids = [score.criterion_id for score in output.criteria]
    actual_criterion_id_set = set(actual_criterion_ids)

    problems: list[str] = []
    duplicate_criterion_ids = sorted(
        criterion_id
        for criterion_id, count in Counter(actual_criterion_ids).items()
        if count > 1
    )
    unknown_criterion_ids = sorted(actual_criterion_id_set - expected_criterion_ids)
    missing_criterion_ids = sorted(expected_criterion_ids - actual_criterion_id_set)

    if duplicate_criterion_ids:
        problems.append(f"duplicate criterion ids: {_format_ids(duplicate_criterion_ids)}")
    if unknown_criterion_ids:
        problems.append(f"unknown criterion ids: {_format_ids(unknown_criterion_ids)}")
    if missing_criterion_ids:
        problems.append(f"missing criterion ids: {_format_ids(missing_criterion_ids)}")

    expected_note_id_set = set(expected_note_ids)
    actual_note_ids = [note.item_id for note in output.notes]
    actual_note_id_set = set(actual_note_ids)
    duplicate_note_ids = sorted(
        item_id for item_id, count in Counter(actual_note_ids).items() if count > 1
    )
    unknown_note_ids = sorted(actual_note_id_set - expected_note_id_set)
    missing_note_ids = sorted(expected_note_id_set - actual_note_id_set)

    if duplicate_note_ids:
        problems.append(f"duplicate note ids: {_format_ids(duplicate_note_ids)}")
    if unknown_note_ids:
        problems.append(f"unknown note ids: {_format_ids(unknown_note_ids)}")
    if missing_note_ids:
        problems.append(f"missing note ids: {_format_ids(missing_note_ids)}")

    if problems:
        raise AssessmentValidationError("; ".join(problems))


def _format_ids(item_ids: list[int]) -> str:
    return ", ".join(str(item_id) for item_id in item_ids)
