import json
from pathlib import Path

import pytest
from fakes import FakeLLMClient

from critic.domain.checklist import load_default_checklist
from critic.domain.critic_validation import CriticOutputValidationError
from critic.domain.critique import CriticOutput, ItemAssessment
from critic.logging import JsonlInferenceLogger, configure_file_logging
from critic.service import ReviewService


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


async def test_review_service_writes_structured_inference_log_with_text_snapshot(
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
    document = "Need model baseline"

    await service.review(document)

    records = [
        json.loads(line)
        for line in inference_log_file.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert len(records) == 1
    record = records[0]
    assert record["schema_version"] == "critic-inference-log-v1"
    assert record["input"] == {
        "kind": "text",
        "document_length": len(document),
        "snapshot": document,
    }
    assert record["critic_output"]["relevant"] is True
    assert len(record["critic_output"]["items"]) == 38
    assert record["top_n_notes"] == []
    assert record["final_result"]["model"] == "test-model"
    assert record["timings"]["llm_duration_ms"] >= 0


async def test_review_service_writes_inference_log_on_critic_validation_failure(
    tmp_path: Path,
) -> None:
    inference_log_file = tmp_path / "inference.jsonl"
    service = ReviewService(
        llm_client=FakeLLMClient(
            CriticOutput(
                relevant=True,
                items=[ItemAssessment(item_id=1, score=1)],
            )
        ),
        checklist=load_default_checklist(),
        model="test-model",
        top_n=5,
        inference_logger=JsonlInferenceLogger(inference_log_file),
    )

    with pytest.raises(CriticOutputValidationError):
        await service.review("Design doc")

    records = [
        json.loads(line)
        for line in inference_log_file.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert len(records) == 1
    record = records[0]
    assert record["status"] == "failed"
    assert record["error"]["type"] == "CriticOutputValidationError"
    assert "missing item ids" in record["error"]["message"]
    assert record["critic_output"]["items"] == [{"item_id": 1, "score": 1, "remark": None}]
    assert record["final_result"] is None
