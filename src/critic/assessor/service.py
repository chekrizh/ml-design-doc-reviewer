from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from critic.assessor.assessor import AssessorResult, assess
from critic.config import AssessorSettings
from critic.domain.assessor_checklist import (
    AssessorChecklist,
    load_default_assessor_checklist,
)
from critic.domain.critique import RankedNote
from critic.jsonl import read_jsonl
from critic.llm.base import LLMClient
from critic.llm.openai_client import OpenAILLMClient
from critic.logging import new_inference_id

ASSESSMENT_LOG_SCHEMA_VERSION = "assessor-eval-log-v1"


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
    ) -> list[str]:
        assessment_ids: list[str] = []
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with output_file.open("a", encoding="utf-8") as file:
            for record in read_jsonl(inference_log_file):
                final_result = record.get("final_result")
                if final_result is None:
                    continue
                notes = [
                    RankedNote.model_validate(note)
                    for note in final_result.get("notes", [])
                ]
                document = _read_snapshot(inference_log_file.parent, record)
                result = await assess(
                    self._llm_client,
                    self._checklist,
                    document=document,
                    notes=notes,
                )
                assessment_id = new_inference_id()
                file.write(
                    json.dumps(
                        self._log_record(assessment_id, record, result),
                        ensure_ascii=False,
                    )
                    + "\n"
                )
                assessment_ids.append(assessment_id)
        return assessment_ids

    def _log_record(
        self,
        assessment_id: str,
        inference_record: dict,
        result: AssessorResult,
    ) -> dict:
        # TODO(design-doc): Section Critique Recall and Cross-section Consistency
        # Recall require joining these judgments with inject_errors.py ground truth.
        return {
            "schema_version": ASSESSMENT_LOG_SCHEMA_VERSION,
            "assessment_id": assessment_id,
            "inference_id": inference_record["inference_id"],
            "created_at": datetime.now(UTC).isoformat(),
            "model": self._model,
            "critic_model": inference_record.get("model"),
            "critic_checklist_version": inference_record.get("checklist_version"),
            "assessor_checklist_version": self._checklist.version,
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

    @classmethod
    def from_settings(cls, settings: AssessorSettings) -> AssessorService:
        checklist = (
            AssessorChecklist.load(settings.checklist_path)
            if settings.checklist_path is not None
            else load_default_assessor_checklist()
        )
        llm_client = OpenAILLMClient(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.model,
        )
        return cls(llm_client=llm_client, checklist=checklist, model=settings.model)

def _read_snapshot(log_dir: Path, record: dict) -> str:
    snapshot_ref = record["input"]["snapshot_ref"]
    return (log_dir / snapshot_ref).read_text(encoding="utf-8")
