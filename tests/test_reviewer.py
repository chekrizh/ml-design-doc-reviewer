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


def _complete_output_for_ids(*item_ids: int) -> CriticOutput:
    return CriticOutput(
        relevant=True,
        items=[ItemAssessment(item_id=item_id, score=1) for item_id in item_ids],
    )


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


async def test_critique_splits_checklist_into_batches_and_merges_outputs() -> None:
    checklist = load_default_checklist()
    llm = RecordingLLMClient(
        _complete_output_for_ids(*range(1, 18)),
        _complete_output_for_ids(*range(18, 35)),
        _complete_output_for_ids(*range(35, 51)),
    )

    result = await critique(llm, checklist, "My ML design doc", batch_count=3)

    assert [item.item_id for item in result.output.items] == list(range(1, 51))
    assert len(llm.user_prompts) == 3
    assert "ID 1 |" in llm.user_prompts[0]
    assert "ID 17 |" in llm.user_prompts[0]
    assert "ID 18 |" not in llm.user_prompts[0]
    assert "ID 18 |" in llm.user_prompts[1]
    assert "ID 34 |" in llm.user_prompts[1]
    assert "ID 35 |" not in llm.user_prompts[1]
    assert "ID 35 |" in llm.user_prompts[2]
    assert "ID 50 |" in llm.user_prompts[2]


async def test_critique_stops_after_first_batch_when_document_is_irrelevant() -> None:
    checklist = load_default_checklist()
    llm = RecordingLLMClient(
        CriticOutput(relevant=False, items=[]),
        _complete_output_for_ids(*range(11, 21)),
    )

    result = await critique(llm, checklist, "spam", batch_count=5)

    assert result.output == CriticOutput(relevant=False, items=[])
    assert len(llm.user_prompts) == 1
