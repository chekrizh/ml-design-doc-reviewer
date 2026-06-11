from fakes import FakeLLMClient

from critic.domain.checklist import load_default_checklist
from critic.domain.critique import CriticOutput
from critic.reviewer import critique


async def test_critique_renders_prompt_and_returns_output() -> None:
    llm = FakeLLMClient()

    result = await critique(llm, load_default_checklist(), "My ML design doc")

    assert result.output.items[0].item_id == 1
    assert llm.schema is CriticOutput
    assert llm.user_prompt is not None
    assert "My ML design doc" in llm.user_prompt


async def test_critique_records_llm_duration_ms() -> None:
    llm = FakeLLMClient()
    clock_values = iter([10.0, 10.1234])

    result = await critique(
        llm,
        load_default_checklist(),
        "My ML design doc",
        clock=lambda: next(clock_values),
    )

    assert result.llm_duration_ms == 123
