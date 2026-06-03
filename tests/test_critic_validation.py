import pytest
from fakes import complete_critic_output

from critic.domain.checklist import load_default_checklist
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
            ItemAssessment(item_id=39, score=0, remark="Unknown checklist item."),
        ],
    )

    with pytest.raises(CriticOutputValidationError, match="unknown item ids: 39"):
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
