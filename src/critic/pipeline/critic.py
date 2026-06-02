from collections.abc import Callable
from time import perf_counter

from critic.domain.critic_validation import validate_critic_output
from critic.domain.critique import CriticOutput
from critic.llm.base import LLMClient
from critic.pipeline.base import ReviewContext
from critic.prompts.critic import render_critic_prompts


class CriticStage:
    def __init__(self, llm_client: LLMClient, *, clock: Callable[[], float] = perf_counter) -> None:
        self._llm_client = llm_client
        self._clock = clock

    async def run(self, context: ReviewContext) -> ReviewContext:
        prompts = render_critic_prompts(context.checklist, context.document)
        started_at = self._clock()
        critic_output = await self._llm_client.parse(
            prompts.system_prompt,
            prompts.user_prompt,
            CriticOutput,
        )
        llm_duration_ms = int((self._clock() - started_at) * 1000)
        validate_critic_output(critic_output, context.checklist)
        return context.model_copy(
            update={
                "critic_output": critic_output,
                "llm_duration_ms": llm_duration_ms,
            }
        )
