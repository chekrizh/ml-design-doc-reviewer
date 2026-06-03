import pytest
from pydantic import ValidationError

from critic.domain.checklist import Checklist, ChecklistItem
from critic.domain.critique import ItemAssessment


def test_checklist_rejects_duplicate_item_ids() -> None:
    item = ChecklistItem(
        id=1,
        section="Problem definition",
        question="Is the business problem connected to an ML task?",
        block_weight=10,
        question_weight=2,
    )

    with pytest.raises(ValidationError, match="duplicate checklist item id"):
        Checklist(version="test", items=[item, item])


def test_checklist_finds_item_by_id() -> None:
    item = ChecklistItem(
        id=7,
        section="Metrics",
        question="Are online and offline metrics separated?",
        block_weight=7,
        question_weight=3,
    )

    checklist = Checklist(version="test", items=[item])

    assert checklist.by_id(7) == item


def test_item_assessment_requires_remark_when_score_is_not_complete() -> None:
    with pytest.raises(ValidationError, match="remark is required"):
        ItemAssessment(item_id=1, score=0.5)


def test_item_assessment_allows_no_remark_for_complete_score() -> None:
    assessment = ItemAssessment(item_id=1, score=1)

    assert assessment.remark is None
