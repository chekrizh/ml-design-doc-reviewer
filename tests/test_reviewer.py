from fakes import FakeLLMClient

from critic.domain.checklist import load_default_checklist
from critic.domain.critic_validation import CriticOutputValidationError
from critic.domain.critique import CriticOutput, ItemAssessment
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


async def test_critique_rejects_unknown_checklist_item_ids() -> None:
    llm = FakeLLMClient(
        CriticOutput(
            relevant=True,
            items=[
                ItemAssessment(item_id=1, score=1),
                ItemAssessment(item_id=39, score=0, remark="Unknown checklist item."),
            ],
        )
    )

    try:
        await critique(llm, load_default_checklist(), "My ML design doc")
    except CriticOutputValidationError as exc:
        assert "unknown item ids: 39" in str(exc)
    else:
        raise AssertionError("expected invalid LLM item ids to be rejected")


async def test_critique_rejects_partial_relevant_checklist_scores() -> None:
    llm = FakeLLMClient(
        CriticOutput(
            relevant=True,
            items=[ItemAssessment(item_id=1, score=1)],
        )
    )

    try:
        await critique(llm, load_default_checklist(), "My ML design doc")
    except CriticOutputValidationError as exc:
        assert "missing item ids" in str(exc)
    else:
        raise AssertionError("expected partial LLM checklist coverage to be rejected")


async def test_critique_rejects_irrelevant_output_with_items() -> None:
    llm = FakeLLMClient(
        CriticOutput(
            relevant=False,
            items=[ItemAssessment(item_id=1, score=0, remark="Should not be scored.")],
        )
    )

    try:
        await critique(llm, load_default_checklist(), "spam")
    except CriticOutputValidationError as exc:
        assert "irrelevant output must not include checklist items" in str(exc)
    else:
        raise AssertionError("expected irrelevant output with items to be rejected")
