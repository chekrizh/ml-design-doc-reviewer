from fakes import FakeLLMClient, make_review_context

from critic.domain.checklist import load_default_checklist
from critic.domain.critic_validation import CriticOutputValidationError
from critic.domain.critique import CriticOutput, ItemAssessment
from critic.pipeline.base import Pipeline, ReviewContext
from critic.pipeline.critic import CriticStage


async def test_critic_stage_renders_prompt_and_stores_output() -> None:
    llm = FakeLLMClient()
    context = make_review_context()

    updated = await CriticStage(llm).run(context)

    assert updated.critic_output is not None
    assert updated.critic_output.items[0].item_id == 1
    assert llm.schema is CriticOutput
    assert llm.user_prompt is not None
    assert "My ML design doc" in llm.user_prompt


async def test_critic_stage_records_llm_duration_ms() -> None:
    llm = FakeLLMClient()
    clock_values = iter([10.0, 10.1234])
    context = make_review_context()

    updated = await CriticStage(llm, clock=lambda: next(clock_values)).run(context)

    assert updated.llm_duration_ms == 123


async def test_critic_stage_rejects_unknown_checklist_item_ids() -> None:
    llm = FakeLLMClient(
        CriticOutput(
            relevant=True,
            items=[
                ItemAssessment(item_id=1, score=1),
                ItemAssessment(item_id=39, score=0, remark="Unknown checklist item."),
            ],
        )
    )
    context = make_review_context()

    try:
        await CriticStage(llm).run(context)
    except CriticOutputValidationError as exc:
        assert "unknown item ids: 39" in str(exc)
    else:
        raise AssertionError("expected invalid LLM item ids to be rejected")


async def test_critic_stage_rejects_partial_relevant_checklist_scores() -> None:
    llm = FakeLLMClient(
        CriticOutput(
            relevant=True,
            items=[ItemAssessment(item_id=1, score=1)],
        )
    )
    context = make_review_context()

    try:
        await CriticStage(llm).run(context)
    except CriticOutputValidationError as exc:
        assert "missing item ids" in str(exc)
    else:
        raise AssertionError("expected partial LLM checklist coverage to be rejected")


async def test_critic_stage_rejects_irrelevant_output_with_items() -> None:
    llm = FakeLLMClient(
        CriticOutput(
            relevant=False,
            items=[ItemAssessment(item_id=1, score=0, remark="Should not be scored.")],
        )
    )
    context = make_review_context(document="spam")

    try:
        await CriticStage(llm).run(context)
    except CriticOutputValidationError as exc:
        assert "irrelevant output must not include checklist items" in str(exc)
    else:
        raise AssertionError("expected irrelevant output with items to be rejected")


class AppendStage:
    def __init__(self, suffix: str) -> None:
        self.suffix = suffix

    async def run(self, context: ReviewContext) -> ReviewContext:
        return context.model_copy(update={"document": context.document + self.suffix})


async def test_pipeline_runs_stages_in_order() -> None:
    context = ReviewContext(
        document="doc",
        checklist=load_default_checklist(),
        model="test-model",
        top_n=5,
    )
    pipeline = Pipeline([AppendStage(" A"), AppendStage(" B")])

    updated = await pipeline.run(context)

    assert updated.document == "doc A B"
