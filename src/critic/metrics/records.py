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


def parse_assessor_records(
    path: Path,
    *,
    assessor_checklist: AssessorChecklist,
) -> list[AssessorOutput]:
    outputs: list[AssessorOutput] = []
    for record in _successful_records(path):
        output = AssessorOutput(
            criteria=[CriterionScore.model_validate(score) for score in record.get("criteria", [])],
            notes=[NoteJudgment.model_validate(note) for note in record.get("notes", [])],
        )
        validate_assessor_criteria(output, assessor_checklist)
        outputs.append(output)
    return outputs


def parse_critic_records(
    path: Path,
    *,
    critic_checklist: Checklist | None = None,
) -> list[CriticOutput]:
    outputs: list[CriticOutput] = []
    for record in _successful_records(path):
        critic_output = record.get("critic_output")
        if critic_output is not None:
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
