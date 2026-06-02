from pathlib import Path

from pydantic import BaseModel

from critic.domain.checklist import load_default_checklist
from critic.domain.critique import CriticOutput, ItemAssessment
from critic.logging import configure_file_logging
from critic.service import ReviewService


class FakeLLMClient:
    async def parse(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[BaseModel],
    ) -> CriticOutput:
        return CriticOutput(
            relevant=True,
            items=[ItemAssessment(item_id=item_id, score=1) for item_id in range(1, 39)],
        )


def test_configure_file_logging_writes_to_log_file(tmp_path: Path) -> None:
    log_file = tmp_path / "critic.log"
    logger = configure_file_logging(log_file)

    logger.info("hello")

    assert log_file.exists()
    assert "hello" in log_file.read_text(encoding="utf-8")


async def test_review_service_logs_lifecycle_without_document_content(tmp_path: Path) -> None:
    log_file = tmp_path / "critic.log"
    logger = configure_file_logging(log_file)
    service = ReviewService(
        llm_client=FakeLLMClient(),
        checklist=load_default_checklist(),
        model="test-model",
        top_n=5,
        logger=logger,
    )

    await service.review("SECRET user design doc content")

    log_content = log_file.read_text(encoding="utf-8")
    assert "review_started" in log_content
    assert "review_completed" in log_content
    assert "document_length=30" in log_content
    assert "SECRET user design doc content" not in log_content
