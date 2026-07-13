from collections.abc import Callable, Sequence

from critic.assessor.wcs import compute_wcs
from critic.domain.assessment import AssessorOutput, NoteJudgment
from critic.domain.assessor_checklist import AssessorChecklist
from critic.metrics.records import GoldenErrors


def mean_wcs(outputs: Sequence[AssessorOutput], checklist: AssessorChecklist) -> float | None:
    if not outputs:
        return None
    return sum(compute_wcs(output, checklist) for output in outputs) / len(outputs)


def direct_answer_violation_rate(outputs: Sequence[AssessorOutput]) -> float | None:
    return _note_flag_rate(outputs, lambda note: note.direct_answer_violation)


def false_critique_rate(outputs: Sequence[AssessorOutput]) -> float | None:
    return _note_flag_rate(outputs, lambda note: note.false_critique)


def grounded_claim_rate(outputs: Sequence[AssessorOutput]) -> float | None:
    return _note_flag_rate(outputs, lambda note: note.grounded)


def section_critique_recall(golden: GoldenErrors) -> float | None:
    return _ratio(golden.found_section, golden.total_section)


def cross_section_consistency_recall(golden: GoldenErrors) -> float | None:
    return _ratio(golden.found_cross, golden.total_cross)


def _note_flag_rate(
    outputs: Sequence[AssessorOutput],
    predicate: Callable[[NoteJudgment], bool],
) -> float | None:
    notes = [note for output in outputs for note in output.notes]
    if not notes:
        return None
    return sum(predicate(note) for note in notes) / len(notes)


def _ratio(numerator: int, denominator: int) -> float | None:
    if denominator == 0:
        return None
    return numerator / denominator
