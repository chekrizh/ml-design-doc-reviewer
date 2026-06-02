from critic.domain.checklist import load_default_checklist
from critic.domain.critique import CriticOutput, ItemAssessment
from critic.pipeline.base import ReviewContext
from critic.pipeline.ranker import RankerStage


async def test_ranker_orders_incomplete_items_by_block_and_question_weight() -> None:
    context = ReviewContext(
        document="doc",
        checklist=load_default_checklist(),
        model="test-model",
        top_n=3,
        critic_output=CriticOutput(
            relevant=True,
            items=[
                ItemAssessment(item_id=12, score=0.5, remark="Data labeling is unclear."),
                ItemAssessment(item_id=34, score=0, remark="Metrics do not map to goals."),
                ItemAssessment(item_id=36, score=0, remark="Baseline fallback is missing."),
                ItemAssessment(item_id=7, score=1),
            ],
        ),
    )

    updated = await RankerStage().run(context)

    assert [note.item_id for note in updated.notes] == [34, 36, 12]
    assert [note.severity.value for note in updated.notes] == ["critical", "critical", "critical"]
    assert updated.notes[0].priority > updated.notes[1].priority > updated.notes[2].priority


async def test_ranker_returns_standard_message_for_irrelevant_documents() -> None:
    context = ReviewContext(
        document="spam",
        checklist=load_default_checklist(),
        model="test-model",
        top_n=5,
        critic_output=CriticOutput(relevant=False, items=[]),
    )

    updated = await RankerStage().run(context)

    assert updated.notes == []
    assert updated.relevant is False
    assert updated.message is not None
    assert "ML System Design" in updated.message
