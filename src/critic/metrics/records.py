from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path

from pydantic import BaseModel, Field, model_validator

from critic.domain.assessment import (
    AssessorOutput,
    CriterionScore,
    NoteJudgment,
    validate_assessor_criteria,
)
from critic.domain.assessor_checklist import AssessorChecklist
from critic.domain.checklist import Checklist
from critic.domain.critique import CriticOutput
from critic.domain.id_validation import describe_id_set_problems
from critic.domain.scoring import Score
from critic.jsonl import read_jsonl


class GoldenErrors(BaseModel):
    total_section: int = Field(ge=0)
    found_section: int = Field(ge=0)
    total_cross: int = Field(ge=0)
    found_cross: int = Field(ge=0)
    expert_scores: list[Score] = Field(default_factory=list)
    assessor_scores: list[Score] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_golden_metrics(self) -> GoldenErrors:
        problems: list[str] = []
        if self.found_section > self.total_section:
            problems.append("found_section must be less than or equal to total_section")
        if self.found_cross > self.total_cross:
            problems.append("found_cross must be less than or equal to total_cross")
        if len(self.expert_scores) != len(self.assessor_scores):
            problems.append("expert_scores and assessor_scores must have the same length")
        if problems:
            raise ValueError("; ".join(problems))
        return self


class AssessmentRecordCounts(BaseModel):
    total: int = Field(ge=0)
    successful: int = Field(ge=0)
    failed: int = Field(ge=0)


def parse_assessor_records(
    path: Path,
    *,
    assessor_checklist: AssessorChecklist,
) -> list[AssessorOutput]:
    outputs: list[AssessorOutput] = []
    for record in _latest_assessment_records(path):
        if record.get("status") == "failed":
            continue
        _validate_checklist_version(
            record,
            field="assessor_checklist_version",
            expected=assessor_checklist.version,
            label="assessor",
        )
        output = AssessorOutput(
            criteria=[CriterionScore.model_validate(score) for score in record.get("criteria", [])],
            notes=[NoteJudgment.model_validate(note) for note in record.get("notes", [])],
        )
        validate_assessor_criteria(output, assessor_checklist)
        outputs.append(output)
    return outputs


def count_assessment_records(path: Path) -> AssessmentRecordCounts:
    records = _latest_assessment_records(path)
    total = len(records)
    failed = sum(record.get("status") == "failed" for record in records)
    return AssessmentRecordCounts(
        total=total,
        successful=total - failed,
        failed=failed,
    )


def parse_critic_records(
    path: Path,
    *,
    critic_checklist: Checklist | None = None,
) -> list[CriticOutput]:
    outputs: list[CriticOutput] = []
    for record in _successful_records(path):
        critic_output = record.get("critic_output")
        if critic_output is not None:
            if critic_checklist is not None:
                _validate_checklist_version(
                    record,
                    field="checklist_version",
                    expected=critic_checklist.version,
                    label="critic",
                )
            output = CriticOutput.model_validate(critic_output)
            if critic_checklist is not None:
                _validate_critic_metric_item_ids(
                    output,
                    critic_checklist,
                    inference_id=record.get("inference_id"),
                )
            outputs.append(output)
    return outputs


def _successful_records(path: Path) -> Iterator[dict]:
    for record in read_jsonl(path):
        if record.get("status") != "failed":
            yield record


def _latest_assessment_records(path: Path) -> list[dict]:
    latest_by_source: dict[str, dict] = {}
    for index, record in enumerate(read_jsonl(path)):
        latest_by_source[_assessment_record_key(record, index)] = record
    return list(latest_by_source.values())


def _assessment_record_key(record: dict, index: int) -> str:
    inference_id = record.get("inference_id")
    if inference_id is not None:
        return f"inference_id:{inference_id}"
    assessment_id = record.get("assessment_id")
    if assessment_id is not None:
        return f"assessment_id:{assessment_id}"
    return f"row:{index}"


def _validate_checklist_version(
    record: dict,
    *,
    field: str,
    expected: str,
    label: str,
) -> None:
    actual = record.get(field)
    if actual is not None and actual != expected:
        raise ValueError(
            f"{label} checklist version mismatch: expected {expected!r}, got {actual!r}"
        )


def _validate_critic_metric_item_ids(
    output: CriticOutput,
    checklist: Checklist,
    *,
    inference_id: str | None,
) -> None:
    # Guardrail-rejected documents are relevant=false with no items by design
    # (see critic_validation.validate_critic_output); they never scored the
    # checklist, so full item-id coverage does not apply to them.
    if not output.relevant:
        return

    actual_ids = [item.item_id for item in output.items]
    expected_ids = {item.id for item in checklist.items}
    problems = describe_id_set_problems(actual_ids, expected_ids, label="item")
    if problems:
        context = (
            f"inference_id={inference_id}" if inference_id is not None else "unknown inference_id"
        )
        raise ValueError(f"invalid critic metrics record ({context}): {'; '.join(problems)}")


def load_golden_errors(path: Path) -> GoldenErrors:
    return GoldenErrors.model_validate(json.loads(path.read_text(encoding="utf-8")))
