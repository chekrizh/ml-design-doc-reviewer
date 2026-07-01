from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, Field, model_validator

from critic.domain.assessment import AssessorOutput, CriterionScore, NoteJudgment
from critic.domain.critique import CriticOutput


class GoldenErrors(BaseModel):
    total_section: int = Field(ge=0)
    found_section: int = Field(ge=0)
    total_cross: int = Field(ge=0)
    found_cross: int = Field(ge=0)

    @model_validator(mode="after")
    def validate_found_counts_do_not_exceed_totals(self) -> GoldenErrors:
        problems: list[str] = []
        if self.found_section > self.total_section:
            problems.append("found_section must be less than or equal to total_section")
        if self.found_cross > self.total_cross:
            problems.append("found_cross must be less than or equal to total_cross")
        if problems:
            raise ValueError("; ".join(problems))
        return self


def parse_assessor_records(path: Path) -> list[AssessorOutput]:
    outputs: list[AssessorOutput] = []
    for record in _read_jsonl(path):
        outputs.append(
            AssessorOutput(
                criteria=[
                    CriterionScore.model_validate(score)
                    for score in record.get("criteria", [])
                ],
                notes=[
                    NoteJudgment.model_validate(note)
                    for note in record.get("notes", [])
                ],
            )
        )
    return outputs


def parse_critic_records(path: Path) -> list[CriticOutput]:
    outputs: list[CriticOutput] = []
    for record in _read_jsonl(path):
        critic_output = record.get("critic_output")
        if critic_output is not None:
            outputs.append(CriticOutput.model_validate(critic_output))
    return outputs


def load_golden_errors(path: Path) -> GoldenErrors:
    return GoldenErrors.model_validate(json.loads(path.read_text(encoding="utf-8")))


def _read_jsonl(path: Path) -> list[dict]:
    records: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            records.append(json.loads(line))
    return records
