from critic.domain.checklist import Checklist, ChecklistItem, Severity
from critic.domain.critique import CriticOutput, RankedNote


def rank_notes(output: CriticOutput, checklist: Checklist, *, top_n: int) -> list[RankedNote]:
    if not output.relevant:
        return []

    notes: list[RankedNote] = []
    for assessment in output.items:
        if assessment.score >= 1:
            continue
        item = checklist.by_id(assessment.item_id)
        notes.append(
            RankedNote(
                item_id=item.id,
                section=item.section,
                question=item.question,
                score=float(assessment.score),
                remark=assessment.remark or "",
                severity=severity_from_item(item),
                priority=_priority(item),
            )
        )

    # The design doc allows tie-breaking by model confidence, but the baseline
    # LLM contract has no confidence field, so item_id keeps the order stable.
    return sorted(notes, key=lambda note: (-note.priority, note.item_id))[:top_n]


def _priority(item: ChecklistItem) -> float:
    # TODO(design-doc): switch to explicit Critical/Warning/Nice-to-have weights
    # if the checklist starts storing those categories directly.
    return item.block_weight + item.question_weight / 10


def severity_from_item(item: ChecklistItem) -> Severity:
    if item.block_weight >= 8:
        return Severity.critical
    if item.block_weight >= 5:
        return Severity.warning
    return Severity.nice_to_have
