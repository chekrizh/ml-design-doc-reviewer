from critic.domain.checklist import Checklist
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
                priority=item.weight,
            )
        )

    # The design doc allows tie-breaking by model confidence, but the baseline
    # LLM contract has no confidence field, so item_id keeps the order stable.
    return sorted(notes, key=lambda note: (-note.priority, note.item_id))[:top_n]
