from critic.domain.critique import CriticOutput
from critic.llm.base import LLMClient
from critic.pipeline.base import ReviewContext
from critic.prompts.critic import render_critic_prompts


class CriticOutputValidationError(ValueError):
    """Raised when the LLM output violates the checklist contract."""


class CriticStage:
    def __init__(self, llm_client: LLMClient) -> None:
        self._llm_client = llm_client

    async def run(self, context: ReviewContext) -> ReviewContext:
        prompts = render_critic_prompts(context.checklist, context.document)
        critic_output = await self._llm_client.parse(
            prompts.system_prompt,
            prompts.user_prompt,
            CriticOutput,
        )
        _validate_critic_output(critic_output, context)
        return context.model_copy(update={"critic_output": critic_output})


def _validate_critic_output(output: CriticOutput, context: ReviewContext) -> None:
    if not output.relevant:
        if output.items:
            raise CriticOutputValidationError("irrelevant output must not include checklist items")
        return

    expected_ids = {item.id for item in context.checklist.items}
    actual_ids = [item.item_id for item in output.items]
    actual_id_set = set(actual_ids)

    duplicate_ids = sorted({item_id for item_id in actual_ids if actual_ids.count(item_id) > 1})
    unknown_ids = sorted(actual_id_set - expected_ids)
    missing_ids = sorted(expected_ids - actual_id_set)

    problems: list[str] = []
    if duplicate_ids:
        problems.append(f"duplicate item ids: {_format_ids(duplicate_ids)}")
    if unknown_ids:
        problems.append(f"unknown item ids: {_format_ids(unknown_ids)}")
    if missing_ids:
        problems.append(f"missing item ids: {_format_ids(missing_ids)}")

    if problems:
        raise CriticOutputValidationError("; ".join(problems))


def _format_ids(item_ids: list[int]) -> str:
    return ", ".join(str(item_id) for item_id in item_ids)
