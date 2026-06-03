from critic.domain.checklist import Checklist, ChecklistItem, Severity
from critic.domain.critique import CriticOutput, RankedNote

IRRELEVANT_DOCUMENT_MESSAGE = (
    "Пожалуйста, отправьте документ в рамках ML System Design: problem statement, "
    "цели, метрики, данные, validation, baseline, serving, monitoring и эксплуатацию."
)


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
                severity=_severity_from_item(item),
                priority=_priority(item),
            )
        )

    return sorted(notes, key=lambda note: (-note.priority, note.item_id))[:top_n]


def _priority(item: ChecklistItem) -> float:
    return item.block_weight + item.question_weight / 10


def _severity_from_item(item: ChecklistItem) -> Severity:
    if item.block_weight >= 8:
        return Severity.critical
    if item.block_weight >= 5:
        return Severity.warning
    return Severity.nice_to_have
