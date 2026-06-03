from fakes import FakeLLMClient, complete_critic_output

from critic.domain.checklist import load_default_checklist
from critic.domain.critique import IRRELEVANT_DOCUMENT_MESSAGE, CriticOutput, ItemAssessment
from critic.service import ReviewService


async def test_review_service_returns_ranked_review_result() -> None:
    checklist = load_default_checklist()
    service = ReviewService(
        llm_client=FakeLLMClient(
            complete_critic_output(
                ItemAssessment(item_id=16, score=0.5, remark="Constant baseline is missing."),
                ItemAssessment(
                    item_id=34,
                    score=0,
                    remark="Metrics are disconnected from goals.",
                ),
            )
        ),
        checklist=checklist,
        model="test-model",
        top_n=1,
    )

    result = await service.review("design doc")

    assert result.relevant is True
    assert result.model == "test-model"
    assert result.checklist_version == checklist.version
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
    assert result.message == IRRELEVANT_DOCUMENT_MESSAGE
