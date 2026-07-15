from pydantic import BaseModel

from critic.assessor.assessor import assess
from critic.domain.assessment import AssessorOutput, CriterionScore, NoteJudgment
from critic.domain.assessor_checklist import load_default_assessor_checklist
from critic.domain.critique import RankedNote
from critic.image_parsing import ImageToReview


class FakeAssessorLLMClient:
    def __init__(self, output: AssessorOutput) -> None:
        self.output = output
        self.system_prompt: str | None = None
        self.user_prompt: str | None = None
        self.schema: type[BaseModel] | None = None
        self.images: list | None = None

    async def parse(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[BaseModel],
        images: list | None = None,
    ) -> AssessorOutput:
        self.system_prompt = system_prompt
        self.user_prompt = user_prompt
        self.schema = schema
        self.images = images
        return self.output


def _complete_output() -> AssessorOutput:
    checklist = load_default_assessor_checklist()
    return AssessorOutput(
        criteria=[
            CriterionScore(criterion_id=criterion.id, score=1) for criterion in checklist.criteria
        ],
        notes=[
            NoteJudgment(
                item_id=2,
                direct_answer_violation=False,
                false_critique=False,
                grounded=True,
            )
        ],
    )


def _note() -> RankedNote:
    return RankedNote(
        item_id=2,
        section="1.1 Problem Definition",
        question="Was root-cause analysis conducted?",
        score=0,
        remark="No root-cause analysis is documented.",
        priority=16.3,
    )


async def test_assess_calls_llm_with_assessor_schema_and_computes_wcs() -> None:
    checklist = load_default_assessor_checklist()
    llm_client = FakeAssessorLLMClient(_complete_output())
    ticks = iter([10.0, 10.25])

    result = await assess(
        llm_client,
        checklist,
        document="design doc body",
        notes=[_note()],
        clock=lambda: next(ticks),
    )

    assert llm_client.schema is AssessorOutput
    assert "design doc body" in (llm_client.user_prompt or "")
    assert "No root-cause analysis is documented." in (llm_client.user_prompt or "")
    user_prompt = llm_client.user_prompt or ""
    assert "Assessor checklist version:" not in user_prompt
    assert user_prompt.index("design doc body") < user_prompt.index("Assessor checklist:")
    assert user_prompt.index("Assessor checklist:") < user_prompt.index("Critique notes to assess:")
    assert result.output == llm_client.output
    assert result.wcs == 1.0
    assert result.llm_duration_ms == 250


async def test_assess_forwards_images_to_llm_client() -> None:
    checklist = load_default_assessor_checklist()
    llm_client = FakeAssessorLLMClient(_complete_output())
    images = [
        ImageToReview(b64content="Zm9v", mime_type="image/png", suffix=".png", alt_text="img_001")
    ]

    await assess(
        llm_client,
        checklist,
        document="design doc body",
        notes=[_note()],
        images=images,
    )

    assert llm_client.images == images
