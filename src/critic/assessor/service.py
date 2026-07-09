from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from critic.assessor.assessor import AssessorResult, assess
from critic.config import AssessorSettings
from critic.domain.assessor_checklist import AssessorChecklist
from critic.domain.critique import RankedNote
from critic.jsonl import read_jsonl
from critic.llm.base import LLMClient
from critic.llm.openai_client import OpenAILLMClient
from critic.logging import SNAPSHOT_DIR_NAME, new_inference_id

ASSESSMENT_LOG_SCHEMA_VERSION = "assessor-eval-log-v1"


@dataclass(frozen=True)
class AssessmentRunResult:
    assessment_ids: list[str]
    failed_count: int


class AssessorService:
    def __init__(
        self,
        *,
        llm_client: LLMClient,
        checklist: AssessorChecklist,
        model: str,
    ) -> None:
        self._llm_client = llm_client
        self._checklist = checklist
        self._model = model

    async def assess_inference_log(
        self,
        inference_log_file: Path,
        output_file: Path,
    ) -> AssessmentRunResult:
        assessment_ids: list[str] = []
        failed_count = 0
        assessed_inference_ids = _existing_successful_inference_ids(output_file)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with output_file.open("a", encoding="utf-8") as file:
            for record in read_jsonl(inference_log_file):
                final_result = record.get("final_result")
                if final_result is None:
                    continue
                inference_id = record.get("inference_id")
                if not isinstance(inference_id, str) or not inference_id:
                    raise ValueError("inference_id is required")
                if inference_id in assessed_inference_ids:
                    continue
                assessment_id = new_inference_id()
                try:
                    notes = [
                        RankedNote.model_validate(note) for note in final_result.get("notes", [])
                    ]
                    document = _read_snapshot(inference_log_file.parent, record)
                    result = await assess(
                        self._llm_client,
                        self._checklist,
                        document=document,
                        notes=notes,
                    )
                except Exception as exc:
                    file.write(
                        json.dumps(
                            self._failure_log_record(assessment_id, record, exc),
                            ensure_ascii=False,
                        )
                        + "\n"
                    )
                    failed_count += 1
                    continue
                file.write(
                    json.dumps(
                        self._log_record(assessment_id, record, result),
                        ensure_ascii=False,
                    )
                    + "\n"
                )
                assessment_ids.append(assessment_id)
                assessed_inference_ids.add(inference_id)
        return AssessmentRunResult(
            assessment_ids=assessment_ids,
            failed_count=failed_count,
        )

    def _log_record(
        self,
        assessment_id: str,
        inference_record: dict,
        result: AssessorResult,
    ) -> dict:
        # TODO(design-doc): Section Critique Recall and Cross-section Consistency
        # Recall require joining these judgments with inject_errors.py ground truth.
        return {
            **self._record_header(assessment_id, inference_record),
            "timings": {"llm_duration_ms": result.llm_duration_ms},
            "criteria": [
                {
                    "criterion_id": score.criterion_id,
                    "weight": self._checklist.by_id(score.criterion_id).weight,
                    "score": score.score,
                    "justification": score.justification,
                }
                for score in result.output.criteria
            ],
            "notes": [note.model_dump(mode="json") for note in result.output.notes],
            "wcs": result.wcs,
        }

    def _failure_log_record(
        self,
        assessment_id: str,
        inference_record: dict,
        error: Exception,
    ) -> dict:
        return {
            **self._record_header(assessment_id, inference_record),
            "status": "failed",
            "error": {"type": type(error).__name__, "message": str(error)},
        }

    def _record_header(self, assessment_id: str, inference_record: dict) -> dict:
        return {
            "schema_version": ASSESSMENT_LOG_SCHEMA_VERSION,
            "assessment_id": assessment_id,
            "inference_id": inference_record["inference_id"],
            "created_at": datetime.now(UTC).isoformat(),
            "model": self._model,
            "critic_model": inference_record.get("model"),
            "critic_checklist_version": inference_record.get("checklist_version"),
            "assessor_checklist_version": self._checklist.version,
        }

    @classmethod
    def from_settings(cls, settings: AssessorSettings) -> AssessorService:
        return cls(
            llm_client=OpenAILLMClient.from_settings(settings),
            checklist=AssessorChecklist.load_or_default(settings.checklist_path),
            model=settings.model,
        )


def _read_snapshot(log_dir: Path, record: dict) -> str:
    snapshot_ref = record["input"]["snapshot_ref"]
    if not isinstance(snapshot_ref, str):
        raise ValueError("snapshot_ref must be a relative path under snapshots/")

    snapshot_path = Path(snapshot_ref)
    snapshot_root = (log_dir / SNAPSHOT_DIR_NAME).resolve()
    resolved_snapshot_path = (log_dir / snapshot_path).resolve()
    try:
        resolved_snapshot_path.relative_to(snapshot_root)
    except ValueError as exc:
        raise ValueError("snapshot_ref must be a relative path under snapshots/") from exc

    return resolved_snapshot_path.read_text(encoding="utf-8")


def _existing_successful_inference_ids(output_file: Path) -> set[str]:
    if not output_file.exists():
        return set()
    return {
        inference_id
        for record in read_jsonl(output_file)
        if record.get("status") != "failed"
        if isinstance((inference_id := record.get("inference_id")), str)
    }
