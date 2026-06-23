import pytest
from fakes import FakeLLMClient

from critic.domain.checklist import load_default_checklist
from critic.domain.critic_validation import CriticOutputValidationError
from critic.domain.critique import CriticOutput, ItemAssessment
from critic.reviewer import critique


class RecordingLLMClient:
    def __init__(self, *outputs: CriticOutput) -> None:
        self.outputs = list(outputs)
        self.user_prompts: list[str] = []

    async def parse(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[CriticOutput],
    ) -> CriticOutput:
        self.user_prompts.append(user_prompt)
        return self.outputs.pop(0)


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


async def test_critique_raises_without_repair_retry_when_model_omits_items() -> None:
    checklist = load_default_checklist()
    llm = RecordingLLMClient(
        CriticOutput(relevant=True, items=[ItemAssessment(item_id=1, score=1)]),
    )

    with pytest.raises(CriticOutputValidationError, match="missing item ids"):
        await critique(llm, checklist, "My ML design doc")

    assert len(llm.user_prompts) == 1
