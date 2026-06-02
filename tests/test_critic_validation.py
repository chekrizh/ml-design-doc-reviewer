import pytest

from critic.domain.checklist import load_default_checklist
from critic.domain.critic_validation import CriticOutputValidationError, validate_critic_output
from critic.domain.critique import CriticOutput, ItemAssessment


def test_validate_critic_output_accepts_complete_relevant_output() -> None:
    output = CriticOutput(
        relevant=True,
        items=[ItemAssessment(item_id=item_id, score=1) for item_id in range(1, 39)],
    )

    validate_critic_output(output, load_default_checklist())


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
