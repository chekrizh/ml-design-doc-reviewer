import asyncio
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
    batch_count: int = 1,
) -> CriticResult:
    batches = checklist.split(batch_count)
    started_at = clock()
    first_output = await _run_batch(llm_client, batches[0], document)

    if not first_output.relevant or len(batches) == 1:
        output = first_output
    else:
        rest_outputs = await asyncio.gather(
            *(_run_batch(llm_client, batch, document) for batch in batches[1:])
        )
        merged_items = list(first_output.items)
        for batch_output in rest_outputs:
            merged_items.extend(batch_output.items)
        output = CriticOutput(relevant=True, items=merged_items)

    llm_duration_ms = int((clock() - started_at) * 1000)

    try:
        validate_critic_output(output, checklist)
    except CriticOutputValidationError as exc:
        exc.llm_duration_ms = llm_duration_ms
        raise

    return CriticResult(output=output, llm_duration_ms=llm_duration_ms)


async def _run_batch(
    llm_client: LLMClient,
    checklist: Checklist,
    document: str,
) -> CriticOutput:
    prompts = render_critic_prompts(checklist, document)
    return await llm_client.parse(prompts.system_prompt, prompts.user_prompt, CriticOutput)
