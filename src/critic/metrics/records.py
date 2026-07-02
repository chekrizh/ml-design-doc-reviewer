from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, Field, model_validator

from critic.domain.assessment import (
    AssessorOutput,
    CriterionScore,
    NoteJudgment,
    validate_assessor_criteria,
)
from critic.domain.assessor_checklist import AssessorChecklist
from critic.domain.critique import CriticOutput
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
    for record in read_jsonl(path):
        output = AssessorOutput(
            criteria=[
                CriterionScore.model_validate(score) for score in record.get("criteria", [])
            ],
            notes=[NoteJudgment.model_validate(note) for note in record.get("notes", [])],
        )
        validate_assessor_criteria(output, assessor_checklist)
        outputs.append(output)
    return outputs


def parse_critic_records(path: Path) -> list[CriticOutput]:
    outputs: list[CriticOutput] = []
    for record in read_jsonl(path):
        critic_output = record.get("critic_output")
        if critic_output is not None:
            outputs.append(CriticOutput.model_validate(critic_output))
    return outputs


def load_golden_errors(path: Path) -> GoldenErrors:
    return GoldenErrors.model_validate(json.loads(path.read_text(encoding="utf-8")))
