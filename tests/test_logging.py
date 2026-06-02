import json
from pathlib import Path

from pydantic import BaseModel

from critic.domain.checklist import load_default_checklist
from critic.domain.critique import CriticOutput, ItemAssessment
from critic.logging import JsonlInferenceLogger, configure_file_logging
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


async def test_review_service_writes_structured_inference_log_with_json_snapshot(
    tmp_path: Path,
) -> None:
    inference_log_file = tmp_path / "inference.jsonl"
    service = ReviewService(
        llm_client=FakeLLMClient(),
        checklist=load_default_checklist(),
        model="test-model",
        top_n=5,
        inference_logger=JsonlInferenceLogger(inference_log_file),
    )
    document_snapshot = {
        "version_id": "draft-7",
        "blocks": [
            {"type": "text", "content": "Need model baseline"},
            {"type": "image", "path": "s3://bucket/architecture.png"},
        ],
    }

    await service.review(document_snapshot)

    records = [
        json.loads(line)
        for line in inference_log_file.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert len(records) == 1
    record = records[0]
    assert record["schema_version"] == "critic-inference-log-v1"
    assert record["input_contract_status"] == "provisional_requires_product_alignment"
    assert record["input"]["kind"] == "design_doc_json"
    assert record["input"]["snapshot"] == document_snapshot
    assert record["critic_output"]["relevant"] is True
    assert len(record["critic_output"]["items"]) == 38
    assert record["top_n_notes"] == []
    assert record["final_result"]["model"] == "test-model"


async def test_review_service_can_redact_input_snapshot_in_inference_log(tmp_path: Path) -> None:
    inference_log_file = tmp_path / "inference.jsonl"
    service = ReviewService(
        llm_client=FakeLLMClient(),
        checklist=load_default_checklist(),
        model="test-model",
        top_n=5,
        inference_logger=JsonlInferenceLogger(inference_log_file, include_input_snapshot=False),
    )

    await service.review("SECRET user design doc content")

    record = json.loads(inference_log_file.read_text(encoding="utf-8"))
    assert record["input"]["kind"] == "text"
    assert record["input"]["snapshot"] is None
    assert record["input"]["redacted"] is True
    assert record["input"]["document_length"] == 30
    assert "SECRET user design doc content" not in inference_log_file.read_text(encoding="utf-8")
