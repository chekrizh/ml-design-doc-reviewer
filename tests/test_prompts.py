from critic.domain.checklist import Checklist, ChecklistItem
from critic.prompts.critic import render_critic_prompts


def test_render_critic_prompts_includes_guardrail_and_no_direct_answer_rules() -> None:
    checklist = Checklist(
        version="test",
        items=[
            ChecklistItem(
                id=1,
                section="1. Определение проблемы",
                question="Сформулирована ли бизнес-проблема?",
                block_weight=10,
                question_weight=2,
                b_flag=0,
                q_flag=0,
            )
        ],
    )

    prompts = render_critic_prompts(checklist, "## Design doc\nSome content")

    assert "не выдавай готовое решение" in prompts.system_prompt.lower()
    assert "нерелевант" in prompts.system_prompt.lower()
    assert '"relevant": false' in prompts.system_prompt
    assert "без markdown" in prompts.system_prompt.lower()
    assert "```json" in prompts.system_prompt
    assert "ID 1" in prompts.user_prompt
    assert "Сформулирована ли бизнес-проблема?" in prompts.user_prompt
    assert "## Design doc\nSome content" in prompts.user_prompt
