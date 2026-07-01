from critic.domain.checklist import Severity, load_default_checklist
from critic.domain.critique import CriticOutput, ItemAssessment
from critic.ranker import rank_notes, severity_from_item


def test_ranker_orders_incomplete_items_by_block_and_question_weight() -> None:
    notes = rank_notes(
        CriticOutput(
            relevant=True,
            items=[
                ItemAssessment(item_id=24, score=0.5, remark="Data labeling is unclear."),
                ItemAssessment(item_id=46, score=0, remark="Metrics do not map to goals."),
                ItemAssessment(item_id=48, score=0, remark="Baseline fallback is missing."),
                ItemAssessment(item_id=7, score=1),
            ],
        ),
        load_default_checklist(),
        top_n=3,
    )

    assert [note.item_id for note in notes] == [24, 46, 48]
    assert [note.severity.value for note in notes] == ["critical", "critical", "critical"]
    assert notes[0].priority > notes[1].priority > notes[2].priority


def test_ranker_returns_no_notes_for_irrelevant_documents() -> None:
    notes = rank_notes(CriticOutput(relevant=False, items=[]), load_default_checklist(), top_n=5)

    assert notes == []


def test_severity_from_item_exposes_ranker_severity_mapping() -> None:
    checklist = load_default_checklist()

    assert severity_from_item(checklist.by_id(1)) == Severity.critical
    assert severity_from_item(checklist.by_id(34)) == Severity.warning
    assert severity_from_item(checklist.by_id(42)) == Severity.nice_to_have
