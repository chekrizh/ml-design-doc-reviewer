from pydantic import BaseModel

from critic.domain.checklist import load_default_checklist
from critic.domain.critique import CriticOutput, ItemAssessment
from critic.service import ReviewService


class FakeLLMClient:
    def __init__(self, output: CriticOutput) -> None:
        self.output = output

    async def parse(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[BaseModel],
    ) -> CriticOutput:
        return self.output


def _complete_critic_output(*overrides: ItemAssessment) -> CriticOutput:
    by_id = {assessment.item_id: assessment for assessment in overrides}
    return CriticOutput(
        relevant=True,
        items=[
            by_id.get(item_id, ItemAssessment(item_id=item_id, score=1)) for item_id in range(1, 39)
        ],
    )


async def test_review_service_returns_ranked_review_result() -> None:
    service = ReviewService(
        llm_client=FakeLLMClient(
            _complete_critic_output(
                ItemAssessment(item_id=16, score=0.5, remark="Constant baseline is missing."),
                ItemAssessment(
                    item_id=34,
                    score=0,
                    remark="Metrics are disconnected from goals.",
                ),
            )
        ),
        checklist=load_default_checklist(),
        model="test-model",
        top_n=1,
    )

    result = await service.review("design doc")

    assert result.relevant is True
    assert result.model == "test-model"
    assert result.checklist_version == "critic-checklist-v1"
    assert [note.item_id for note in result.notes] == [34]


async def test_review_service_returns_message_for_irrelevant_document() -> None:
    service = ReviewService(
        llm_client=FakeLLMClient(CriticOutput(relevant=False, items=[])),
        checklist=load_default_checklist(),
        model="test-model",
        top_n=5,
    )

    result = await service.review("spam")

    assert result.relevant is False
    assert result.notes == []
    assert result.message is not None
