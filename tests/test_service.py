import logging

import pytest
from fakes import FakeLLMClient, complete_critic_output
from pydantic import BaseModel

from critic.config import Settings
from critic.domain.checklist import load_default_checklist
from critic.domain.critic_validation import CriticOutputValidationError
from critic.domain.critique import IRRELEVANT_DOCUMENT_MESSAGE, CriticOutput, ItemAssessment
from critic.service import ReviewService


class FailingInferenceLogger:
    def write_failure(self, **kwargs) -> str:
        raise OSError("disk full")


class RecordingLLMClient:
    def __init__(self, *outputs: CriticOutput) -> None:
        self.outputs = list(outputs)
        self.user_prompts: list[str] = []

    async def parse(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[BaseModel],
    ) -> CriticOutput:
        self.user_prompts.append(user_prompt)
        return self.outputs.pop(0)


def _complete_output_for_ids(*item_ids: int) -> CriticOutput:
    return CriticOutput(
        relevant=True,
        items=[ItemAssessment(item_id=item_id, score=1) for item_id in item_ids],
    )


async def test_review_service_returns_ranked_review_result() -> None:
    checklist = load_default_checklist()
    service = ReviewService(
        llm_client=FakeLLMClient(
            complete_critic_output(
                ItemAssessment(item_id=16, score=0.5, remark="Constant baseline is missing."),
                ItemAssessment(
                    item_id=46,
                    score=0,
                    remark="Metrics are disconnected from goals.",
                ),
            )
        ),
        checklist=checklist,
        model="test-model",
        top_n=1,
        checklist_batch_count=1,
    )

    result = await service.review("design doc")

    assert result.relevant is True
    assert result.model == "test-model"
    assert result.checklist_version == checklist.version
    assert [note.item_id for note in result.notes] == [46]


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


async def test_review_service_passes_checklist_batch_count_to_critique() -> None:
    checklist = load_default_checklist()
    llm = RecordingLLMClient(
        _complete_output_for_ids(*range(1, 26)),
        _complete_output_for_ids(*range(26, 51)),
    )
    service = ReviewService(
        llm_client=llm,
        checklist=checklist,
        model="test-model",
        top_n=5,
        checklist_batch_count=2,
    )

    result = await service.review("design doc")

    assert result.relevant is True
    assert len(llm.user_prompts) == 2
    assert "ID 25 |" in llm.user_prompts[0]
    assert "ID 26 |" not in llm.user_prompts[0]
    assert "ID 26 |" in llm.user_prompts[1]


async def test_review_service_preserves_validation_error_when_failure_logging_fails(
    caplog,
) -> None:
    logger = logging.getLogger("test.inference_failure_log_failure")
    service = ReviewService(
        llm_client=FakeLLMClient(CriticOutput(relevant=True, items=[])),
        checklist=load_default_checklist(),
        model="test-model",
        top_n=5,
        checklist_batch_count=1,
        logger=logger,
        inference_logger=FailingInferenceLogger(),
    )

    with (
        caplog.at_level(logging.WARNING, logger=logger.name),
        pytest.raises(CriticOutputValidationError, match="missing item ids"),
    ):
        await service.review("design doc")

    assert "inference_failure_log_failed" in caplog.text
    assert "model=test-model" in caplog.text
    assert "error=disk full" in caplog.text


def test_review_service_from_settings_disables_inference_logging_by_default(tmp_path) -> None:
    service = ReviewService.from_settings(
        Settings(
            openai_api_key="test-key",
            openai_base_url="https://openrouter.ai/api/v1",
            model="test-model",
            top_n=5,
            checklist_batch_count=3,
            log_file=tmp_path / "critic.log",
            _env_file=None,
        )
    )

    assert service._inference_logger is None
    assert service._checklist_batch_count == 3
