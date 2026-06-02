from critic.domain.checklist import ChecklistItem, Severity
from critic.domain.critique import RankedNote
from critic.pipeline.base import ReviewContext

IRRELEVANT_DOCUMENT_MESSAGE = (
    "Пожалуйста, отправьте документ в рамках ML System Design: problem statement, "
    "цели, метрики, данные, validation, baseline, serving, monitoring и эксплуатацию."
)


class RankerStage:
    async def run(self, context: ReviewContext) -> ReviewContext:
        if context.critic_output is None:
            raise ValueError("critic_output is required before ranking")

        if not context.critic_output.relevant:
            return context.model_copy(
                update={
                    "relevant": False,
                    "message": IRRELEVANT_DOCUMENT_MESSAGE,
                    "notes": [],
                }
            )

        notes: list[RankedNote] = []
        for assessment in context.critic_output.items:
            if assessment.score >= 1:
                continue
            item = context.checklist.by_id(assessment.item_id)
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

        ranked = sorted(notes, key=lambda note: (-note.priority, note.item_id))[: context.top_n]
        return context.model_copy(update={"relevant": True, "message": None, "notes": ranked})


def _priority(item: ChecklistItem) -> float:
    return item.block_weight + item.question_weight / 10


def _severity_from_item(item: ChecklistItem) -> Severity:
    if item.block_weight >= 8:
        return Severity.critical
    if item.block_weight >= 5:
        return Severity.warning
    return Severity.nice_to_have
