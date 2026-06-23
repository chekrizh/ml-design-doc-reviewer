from critic.domain.checklist import Checklist, ChecklistItem
from critic.prompts.critic import render_critic_prompts


def test_render_critic_prompts_includes_guardrail_and_no_direct_answer_rules() -> None:
    checklist = Checklist(
        version="test",
        items=[
            ChecklistItem(
                id=1,
                section="1. Problem Definition",
                question="Is the business problem formulated?",
                block_weight=10,
                question_weight=2,
            )
        ],
    )

    prompts = render_critic_prompts(checklist, "## Design doc\nSome content")

    assert "do not provide a ready-made solution" in prompts.system_prompt.lower()
    assert "irrelevant" in prompts.system_prompt.lower()
    assert "exactly one item object for every checklist id" in prompts.system_prompt.lower()
    assert '"relevant": false' in prompts.system_prompt
    assert "no markdown" in prompts.system_prompt.lower()
    assert "```json" in prompts.system_prompt
    assert "ID 1" in prompts.user_prompt
    assert "Importance: block 10/16, question 2/6" in prompts.user_prompt
    assert "B_T_F" not in prompts.user_prompt
    assert "Is the business problem formulated?" in prompts.user_prompt
    assert "## Design doc\nSome content" in prompts.user_prompt
