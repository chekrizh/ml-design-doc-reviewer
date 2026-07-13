import pytest
from fakes import complete_critic_output

from critic.domain import critic_validation
from critic.domain.checklist import Checklist, ChecklistItem, load_default_checklist
from critic.domain.critic_validation import CriticOutputValidationError, validate_critic_output
from critic.domain.critique import CriticOutput, ItemAssessment


def test_validate_critic_output_accepts_complete_relevant_output() -> None:
    checklist = load_default_checklist()

    validate_critic_output(complete_critic_output(checklist=checklist), checklist)


def test_validate_critic_output_rejects_unknown_checklist_item_ids() -> None:
    output = CriticOutput(
        relevant=True,
        items=[
            ItemAssessment(item_id=1, score=1),
            ItemAssessment(item_id=51, score=0, remark="Unknown checklist item."),
        ],
    )

    with pytest.raises(CriticOutputValidationError, match="unknown item ids: 51"):
        validate_critic_output(output, load_default_checklist())


def test_validate_critic_output_rejects_partial_relevant_checklist_scores() -> None:
    output = CriticOutput(
        relevant=True,
        items=[ItemAssessment(item_id=1, score=1)],
    )

    with pytest.raises(CriticOutputValidationError, match="missing item ids"):
        validate_critic_output(output, load_default_checklist())


def test_validate_critic_output_rejects_irrelevant_output_with_items() -> None:
    output = CriticOutput(
        relevant=False,
        items=[ItemAssessment(item_id=1, score=0, remark="Should not be scored.")],
    )

    with pytest.raises(
        CriticOutputValidationError,
        match="irrelevant output must not include checklist items",
    ):
        validate_critic_output(output, load_default_checklist())


def test_critic_item_id_problems_describes_contract_violations() -> None:
    checklist = Checklist(
        version="test",
        items=[
            ChecklistItem(
                id=1,
                section="Problem",
                question="Is the problem defined?",
                block_weight=1,
                question_weight=1,
            ),
            ChecklistItem(
                id=2,
                section="Metrics",
                question="Are metrics defined?",
                block_weight=1,
                question_weight=1,
            ),
        ],
    )
    output = CriticOutput(
        relevant=True,
        items=[
            ItemAssessment(item_id=1, score=1),
            ItemAssessment(item_id=1, score=1),
            ItemAssessment(item_id=3, score=1),
        ],
    )

    assert critic_validation.critic_item_id_problems(output, checklist) == [
        "duplicate item ids: 1",
        "unknown item ids: 3",
        "missing item ids: 2",
    ]
