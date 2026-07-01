from collections.abc import Callable
from dataclasses import dataclass
from time import perf_counter

from critic.assessor.prompts import render_assessor_prompts
from critic.assessor.wcs import compute_wcs
from critic.domain.assessment import AssessorOutput, validate_assessor_output
from critic.domain.assessor_checklist import AssessorChecklist
from critic.domain.critique import RankedNote
from critic.llm.base import LLMClient


@dataclass(frozen=True)
class AssessorResult:
    output: AssessorOutput
    wcs: float
    llm_duration_ms: int


async def assess(
    llm_client: LLMClient,
    checklist: AssessorChecklist,
    *,
    document: str,
    notes: list[RankedNote],
    clock: Callable[[], float] = perf_counter,
) -> AssessorResult:
    prompts = render_assessor_prompts(checklist, document, notes)
    started_at = clock()
    output = await llm_client.parse(prompts.system_prompt, prompts.user_prompt, AssessorOutput)
    llm_duration_ms = int((clock() - started_at) * 1000)

    validate_assessor_output(
        output,
        checklist,
        expected_note_ids=[note.item_id for note in notes],
    )
    return AssessorResult(
        output=output,
        wcs=compute_wcs(output, checklist),
        llm_duration_ms=llm_duration_ms,
    )
