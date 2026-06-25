from collections.abc import Callable
from dataclasses import dataclass
from time import perf_counter

from critic.domain.checklist import Checklist
from critic.domain.critic_validation import CriticOutputValidationError, validate_critic_output
from critic.domain.critique import CriticOutput
from critic.llm.base import LLMClient
from critic.prompts.critic import render_critic_prompts


@dataclass(frozen=True)
class CriticResult:
    output: CriticOutput
    llm_duration_ms: int


async def critique(
    llm_client: LLMClient,
    checklist: Checklist,
    document: str,
    *,
    clock: Callable[[], float] = perf_counter,
) -> CriticResult:
    prompts = render_critic_prompts(checklist, document)
    started_at = clock()
    output = await llm_client.parse(prompts.system_prompt, prompts.user_prompt, CriticOutput)
    llm_duration_ms = int((clock() - started_at) * 1000)

    try:
        validate_critic_output(output, checklist)
    except CriticOutputValidationError as exc:
        exc.llm_duration_ms = llm_duration_ms
        raise

    return CriticResult(output=output, llm_duration_ms=llm_duration_ms)
