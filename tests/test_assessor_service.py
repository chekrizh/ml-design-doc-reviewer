import json
from pathlib import Path

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
    ) -> AssessorOutput:
        return self.output


class SequencedAssessorLLMClient:
    def __init__(self, outputs: list[AssessorOutput]) -> None:
        self.outputs = outputs

    async def parse(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[BaseModel],
    ) -> AssessorOutput:
        return self.outputs.pop(0)


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

    assessment_ids = await service.assess_inference_log(inference_log, assessment_log)

    [assessment_id] = assessment_ids
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


async def test_assessor_service_allows_missing_inference_id(
    tmp_path: Path,
) -> None:
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

    await service.assess_inference_log(inference_log, assessment_log)

    [record] = [
        json.loads(line) for line in assessment_log.read_text(encoding="utf-8").splitlines()
    ]
    assert record["inference_id"] is None


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

    assessment_ids = await service.assess_inference_log(inference_log, assessment_log)

    [failed_record, successful_record] = [
        json.loads(line) for line in assessment_log.read_text(encoding="utf-8").splitlines()
    ]
    assert assessment_ids == [successful_record["assessment_id"]]
    assert failed_record["status"] == "failed"
    assert failed_record["inference_id"] == "inf-1"
    assert failed_record["model"] == "assessor-model"
    assert failed_record["error"]["type"] == "AssessmentValidationError"
    assert "missing criterion ids" in failed_record["error"]["message"]
    assert "status" not in successful_record
    assert successful_record["inference_id"] == "inf-2"
