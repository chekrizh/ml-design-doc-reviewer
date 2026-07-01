from __future__ import annotations

import json
from importlib import resources
from importlib.resources.abc import Traversable
from pathlib import Path

from pydantic import BaseModel, Field, model_validator


class AssessorCriterion(BaseModel):
    id: int = Field(ge=1)
    question: str = Field(min_length=1)
    weight: int = Field(ge=1, le=3)


class AssessorChecklist(BaseModel):
    version: str = Field(min_length=1)
    criteria: list[AssessorCriterion] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_ids(self) -> AssessorChecklist:
        criterion_ids = [criterion.id for criterion in self.criteria]
        if len(criterion_ids) != len(set(criterion_ids)):
            raise ValueError("duplicate assessor criterion id")
        return self

    def by_id(self, criterion_id: int) -> AssessorCriterion:
        for criterion in self.criteria:
            if criterion.id == criterion_id:
                return criterion
        raise KeyError(f"assessor criterion not found: {criterion_id}")

    @classmethod
    def load(cls, path: Path) -> AssessorChecklist:
        return _load_assessor_checklist(path)


def load_default_assessor_checklist() -> AssessorChecklist:
    checklist_path = resources.files("critic.data").joinpath("assessor_checklist.json")
    return _load_assessor_checklist(checklist_path)


def _load_assessor_checklist(source: Path | Traversable) -> AssessorChecklist:
    with source.open(encoding="utf-8") as file:
        return AssessorChecklist.model_validate(json.load(file))
