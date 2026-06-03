from critic.domain.checklist import load_default_checklist
from critic.domain.critique import CriticOutput, ItemAssessment
from critic.ranker import IRRELEVANT_DOCUMENT_MESSAGE, rank_notes


def test_ranker_orders_incomplete_items_by_block_and_question_weight() -> None:
    notes = rank_notes(
        CriticOutput(
            relevant=True,
            items=[
                ItemAssessment(item_id=12, score=0.5, remark="Data labeling is unclear."),
                ItemAssessment(item_id=34, score=0, remark="Metrics do not map to goals."),
                ItemAssessment(item_id=36, score=0, remark="Baseline fallback is missing."),
                ItemAssessment(item_id=7, score=1),
            ],
        ),
        load_default_checklist(),
        top_n=3,
    )

    assert [note.item_id for note in notes] == [34, 36, 12]
    assert [note.severity.value for note in notes] == ["critical", "critical", "critical"]
    assert notes[0].priority > notes[1].priority > notes[2].priority


def test_ranker_returns_no_notes_for_irrelevant_documents() -> None:
    notes = rank_notes(CriticOutput(relevant=False, items=[]), load_default_checklist(), top_n=5)

    assert notes == []
    assert "ML System Design" in IRRELEVANT_DOCUMENT_MESSAGE
