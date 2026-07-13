import json
from pathlib import Path

import pytest
from pydantic import BaseModel

from critic.assessor.service import ASSESSMENT_LOG_SCHEMA_VERSION, AssessorService
from critic.domain.assessment import AssessorOutput, CriterionScore, NoteJudgment
from critic.domain.assessor_checklist import load_default_assessor_checklist
from critic.domain.critique import RankedNote


class FakeAssessorLLMClient:
    def __init__(self, output: AssessorOutput) -> None:
        self.output = output

    async def parse(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[BaseModel],
        images: list | None = None,
    ) -> AssessorOutput:
        return self.output


class RecordingAssessorLLMClient:
    def __init__(self, output: AssessorOutput) -> None:
        self.output = output
        self.images: list | None = None

    async def parse(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[BaseModel],
        images: list | None = None,
    ) -> AssessorOutput:
        self.images = images
        return self.output


class SequencedAssessorLLMClient:
    def __init__(self, outputs: list[AssessorOutput]) -> None:
        self.outputs = outputs

    async def parse(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[BaseModel],
        images: list | None = None,
    ) -> AssessorOutput:
        return self.outputs.pop(0)


def _complete_output(*, include_note: bool = True) -> AssessorOutput:
    checklist = load_default_assessor_checklist()
    return AssessorOutput(
        criteria=[
            CriterionScore(criterion_id=criterion.id, score=1) for criterion in checklist.criteria
        ],
        notes=(
            [
                NoteJudgment(
                    item_id=2,
                    direct_answer_violation=False,
                    false_critique=False,
                    grounded=True,
                )
            ]
            if include_note
            else []
        ),
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


async def test_assessor_service_reads_inference_log_and_writes_assessment_log(
    tmp_path: Path,
) -> None:
    snapshot_dir = tmp_path / "snapshots"
    snapshot_dir.mkdir()
    (snapshot_dir / "inf-1.md").write_text("design doc body", encoding="utf-8")
    inference_log = tmp_path / "inference.jsonl"
    assessment_log = tmp_path / "assessment-eval.jsonl"
    inference_log.write_text(
        json.dumps(
            {
                "schema_version": "critic-inference-log-v2",
                "inference_id": "inf-1",
                "model": "critic-model",
                "checklist_version": "critic-checklist-v4",
                "input": {"snapshot_ref": "snapshots/inf-1.md"},
                "final_result": {"notes": [_note().model_dump(mode="json")]},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    service = AssessorService(
        llm_client=FakeAssessorLLMClient(_complete_output()),
        checklist=load_default_assessor_checklist(),
        model="assessor-model",
    )

    run_result = await service.assess_inference_log(inference_log, assessment_log)

    [assessment_id] = run_result.assessment_ids
    assert run_result.failed_count == 0
    [record] = [
        json.loads(line) for line in assessment_log.read_text(encoding="utf-8").splitlines()
    ]
    assert record["schema_version"] == ASSESSMENT_LOG_SCHEMA_VERSION
    assert record["assessment_id"] == assessment_id
    assert record["inference_id"] == "inf-1"
    assert record["model"] == "assessor-model"
    assert record["critic_model"] == "critic-model"
    assert record["assessor_checklist_version"] == "assessor-checklist-v1"
    assert record["wcs"] == 1.0
    assert record["criteria"][0]["weight"] == 3
    assert record["notes"] == [
        {
            "item_id": 2,
            "direct_answer_violation": False,
            "false_critique": False,
            "grounded": True,
        }
    ]


async def test_assessor_service_loads_snapshot_images_and_forwards_them(
    tmp_path: Path,
) -> None:
    snapshot_dir = tmp_path / "snapshots"
    snapshot_dir.mkdir()
    (snapshot_dir / "inf-1.md").write_text("design doc body", encoding="utf-8")
    images_dir = snapshot_dir / "images-inf-1"
    images_dir.mkdir()
    (images_dir / "img_001.png").write_bytes(b"fake-png-bytes")
    inference_log = tmp_path / "inference.jsonl"
    assessment_log = tmp_path / "assessment-eval.jsonl"
    inference_log.write_text(
        json.dumps(
            {
                "schema_version": "critic-inference-log-v2",
                "inference_id": "inf-1",
                "input": {
                    "snapshot_ref": "snapshots/inf-1.md",
                    "snapshot_images_dir": "snapshots/images-inf-1",
                },
                "final_result": {"notes": [_note().model_dump(mode="json")]},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    llm_client = RecordingAssessorLLMClient(_complete_output())
    service = AssessorService(
        llm_client=llm_client,
        checklist=load_default_assessor_checklist(),
        model="assessor-model",
    )

    run_result = await service.assess_inference_log(inference_log, assessment_log)

    assert run_result.failed_count == 0
    [image] = llm_client.images or []
    assert image.label == "img_001"
    assert image.mime_type == "image/png"


async def test_assessor_service_treats_missing_snapshot_images_dir_as_no_images(
    tmp_path: Path,
) -> None:
    snapshot_dir = tmp_path / "snapshots"
    snapshot_dir.mkdir()
    (snapshot_dir / "inf-1.md").write_text("design doc body", encoding="utf-8")
    inference_log = tmp_path / "inference.jsonl"
    assessment_log = tmp_path / "assessment-eval.jsonl"
    inference_log.write_text(
        json.dumps(
            {
                "schema_version": "critic-inference-log-v2",
                "inference_id": "inf-1",
                "input": {"snapshot_ref": "snapshots/inf-1.md"},
                "final_result": {"notes": [_note().model_dump(mode="json")]},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    llm_client = RecordingAssessorLLMClient(_complete_output())
    service = AssessorService(
        llm_client=llm_client,
        checklist=load_default_assessor_checklist(),
        model="assessor-model",
    )

    run_result = await service.assess_inference_log(inference_log, assessment_log)

    assert run_result.failed_count == 0
    assert llm_client.images is None


async def test_assessor_service_rejects_snapshot_images_dir_outside_snapshot_dir(
    tmp_path: Path,
) -> None:
    log_dir = tmp_path / "logs"
    snapshot_dir = log_dir / "snapshots"
    snapshot_dir.mkdir(parents=True)
    (snapshot_dir / "inf-1.md").write_text("design doc body", encoding="utf-8")
    secret_dir = tmp_path / "secret_images"
    secret_dir.mkdir()
    (secret_dir / "leak.png").write_bytes(b"SECRET")
    inference_log = log_dir / "inference.jsonl"
    assessment_log = tmp_path / "assessment-eval.jsonl"
    inference_log.write_text(
        json.dumps(
            {
                "schema_version": "critic-inference-log-v2",
                "inference_id": "inf-1",
                "input": {
                    "snapshot_ref": "snapshots/inf-1.md",
                    "snapshot_images_dir": "../secret_images",
                },
                "final_result": {"notes": []},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    service = AssessorService(
        llm_client=FakeAssessorLLMClient(_complete_output(include_note=False)),
        checklist=load_default_assessor_checklist(),
        model="assessor-model",
    )

    run_result = await service.assess_inference_log(inference_log, assessment_log)

    [record] = [
        json.loads(line) for line in assessment_log.read_text(encoding="utf-8").splitlines()
    ]
    assert run_result.assessment_ids == []
    assert run_result.failed_count == 1
    assert record["status"] == "failed"
    assert record["error"]["type"] == "ValueError"
    assert "snapshot_images_dir" in record["error"]["message"]


async def test_assessor_service_requires_inference_id(tmp_path: Path) -> None:
    snapshot_dir = tmp_path / "snapshots"
    snapshot_dir.mkdir()
    (snapshot_dir / "snapshot.md").write_text("design doc body", encoding="utf-8")
    inference_log = tmp_path / "inference.jsonl"
    assessment_log = tmp_path / "assessment-eval.jsonl"
    inference_log.write_text(
        json.dumps(
            {
                "schema_version": "critic-inference-log-v2",
                "input": {"snapshot_ref": "snapshots/snapshot.md"},
                "final_result": {"notes": [_note().model_dump(mode="json")]},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    service = AssessorService(
        llm_client=FakeAssessorLLMClient(_complete_output()),
        checklist=load_default_assessor_checklist(),
        model="assessor-model",
    )

    with pytest.raises(ValueError, match="inference_id is required"):
        await service.assess_inference_log(inference_log, assessment_log)


async def test_assessor_service_rejects_snapshot_refs_outside_snapshot_dir(
    tmp_path: Path,
) -> None:
    log_dir = tmp_path / "logs"
    log_dir.mkdir()
    (tmp_path / "secret.txt").write_text("SECRET local file", encoding="utf-8")
    inference_log = log_dir / "inference.jsonl"
    assessment_log = tmp_path / "assessment-eval.jsonl"
    inference_log.write_text(
        json.dumps(
            {
                "schema_version": "critic-inference-log-v2",
                "inference_id": "inf-1",
                "input": {"snapshot_ref": "../secret.txt"},
                "final_result": {"notes": []},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    service = AssessorService(
        llm_client=FakeAssessorLLMClient(_complete_output(include_note=False)),
        checklist=load_default_assessor_checklist(),
        model="assessor-model",
    )

    run_result = await service.assess_inference_log(inference_log, assessment_log)

    [record] = [
        json.loads(line) for line in assessment_log.read_text(encoding="utf-8").splitlines()
    ]
    assert run_result.assessment_ids == []
    assert run_result.failed_count == 1
    assert record["status"] == "failed"
    assert record["inference_id"] == "inf-1"
    assert record["error"]["type"] == "ValueError"
    assert "snapshot_ref" in record["error"]["message"]


async def test_assessor_service_records_malformed_input_and_continues(tmp_path: Path) -> None:
    inference_log = tmp_path / "inference.jsonl"
    assessment_log = tmp_path / "assessment-eval.jsonl"
    inference_log.write_text(
        json.dumps(
            {
                "inference_id": "inf-1",
                "input": None,
                "final_result": {"notes": []},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    service = AssessorService(
        llm_client=FakeAssessorLLMClient(_complete_output(include_note=False)),
        checklist=load_default_assessor_checklist(),
        model="assessor-model",
    )

    run_result = await service.assess_inference_log(inference_log, assessment_log)

    [record] = [
        json.loads(line) for line in assessment_log.read_text(encoding="utf-8").splitlines()
    ]
    assert run_result.assessment_ids == []
    assert run_result.failed_count == 1
    assert record["status"] == "failed"
    assert record["error"]["type"] == "TypeError"


async def test_assessor_service_skips_already_assessed_inference_ids(
    tmp_path: Path,
) -> None:
    snapshot_dir = tmp_path / "snapshots"
    snapshot_dir.mkdir()
    (snapshot_dir / "inf-1.md").write_text("design doc body", encoding="utf-8")
    inference_log = tmp_path / "inference.jsonl"
    assessment_log = tmp_path / "assessment-eval.jsonl"
    inference_log.write_text(
        json.dumps(
            {
                "schema_version": "critic-inference-log-v2",
                "inference_id": "inf-1",
                "input": {"snapshot_ref": "snapshots/inf-1.md"},
                "final_result": {"notes": [_note().model_dump(mode="json")]},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    service = AssessorService(
        llm_client=FakeAssessorLLMClient(_complete_output()),
        checklist=load_default_assessor_checklist(),
        model="assessor-model",
    )

    first_result = await service.assess_inference_log(inference_log, assessment_log)
    second_result = await service.assess_inference_log(inference_log, assessment_log)

    records = [json.loads(line) for line in assessment_log.read_text(encoding="utf-8").splitlines()]
    assert len(first_result.assessment_ids) == 1
    assert first_result.failed_count == 0
    assert second_result.assessment_ids == []
    assert second_result.failed_count == 0
    assert len(records) == 1
    assert records[0]["inference_id"] == "inf-1"


async def test_assessor_service_records_failed_assessment_and_continues_batch(
    tmp_path: Path,
) -> None:
    snapshot_dir = tmp_path / "snapshots"
    snapshot_dir.mkdir()
    (snapshot_dir / "inf-1.md").write_text("first design doc", encoding="utf-8")
    (snapshot_dir / "inf-2.md").write_text("second design doc", encoding="utf-8")
    inference_log = tmp_path / "inference.jsonl"
    assessment_log = tmp_path / "assessment-eval.jsonl"
    records = [
        {
            "schema_version": "critic-inference-log-v2",
            "inference_id": inference_id,
            "model": "critic-model",
            "checklist_version": "critic-checklist-v4",
            "input": {"snapshot_ref": f"snapshots/{inference_id}.md"},
            "final_result": {"notes": [_note().model_dump(mode="json")]},
        }
        for inference_id in ["inf-1", "inf-2"]
    ]
    inference_log.write_text(
        "\n".join(json.dumps(record) for record in records) + "\n",
        encoding="utf-8",
    )
    service = AssessorService(
        llm_client=SequencedAssessorLLMClient(
            [
                AssessorOutput(criteria=[], notes=[]),
                _complete_output(),
            ]
        ),
        checklist=load_default_assessor_checklist(),
        model="assessor-model",
    )

    run_result = await service.assess_inference_log(inference_log, assessment_log)

    [failed_record, successful_record] = [
        json.loads(line) for line in assessment_log.read_text(encoding="utf-8").splitlines()
    ]
    assert run_result.assessment_ids == [successful_record["assessment_id"]]
    assert run_result.failed_count == 1
    assert failed_record["status"] == "failed"
    assert failed_record["inference_id"] == "inf-1"
    assert failed_record["model"] == "assessor-model"
    assert failed_record["error"]["type"] == "AssessmentValidationError"
    assert "missing criterion ids" in failed_record["error"]["message"]
    assert "status" not in successful_record
    assert successful_record["inference_id"] == "inf-2"


async def test_assessor_service_retries_failed_assessment_on_next_run(tmp_path: Path) -> None:
    snapshot_dir = tmp_path / "snapshots"
    snapshot_dir.mkdir()
    (snapshot_dir / "inf-1.md").write_text("design doc body", encoding="utf-8")
    inference_log = tmp_path / "inference.jsonl"
    assessment_log = tmp_path / "assessment-eval.jsonl"
    inference_log.write_text(
        json.dumps(
            {
                "inference_id": "inf-1",
                "input": {"snapshot_ref": "snapshots/inf-1.md"},
                "final_result": {"notes": [_note().model_dump(mode="json")]},
            }
        )
        + "\n",
        encoding="utf-8",
    )
    service = AssessorService(
        llm_client=SequencedAssessorLLMClient(
            [
                AssessorOutput(criteria=[], notes=[]),
                _complete_output(),
            ]
        ),
        checklist=load_default_assessor_checklist(),
        model="assessor-model",
    )

    first_result = await service.assess_inference_log(inference_log, assessment_log)
    second_result = await service.assess_inference_log(inference_log, assessment_log)

    records = [json.loads(line) for line in assessment_log.read_text(encoding="utf-8").splitlines()]
    assert first_result.assessment_ids == []
    assert first_result.failed_count == 1
    assert second_result.assessment_ids == [records[1]["assessment_id"]]
    assert second_result.failed_count == 0
    assert records[0]["status"] == "failed"
    assert "status" not in records[1]
