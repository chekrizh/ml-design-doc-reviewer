from __future__ import annotations

from importlib import resources
from pathlib import Path

from pydantic import BaseModel, Field, model_validator

from critic.domain.id_validation import ensure_unique_ids
from critic.domain.loading import find_by_id, load_json_model


class AssessorCriterion(BaseModel):
    id: int = Field(ge=1)
    question: str = Field(min_length=1)
    weight: int = Field(ge=1, le=3)


class AssessorChecklist(BaseModel):
    version: str = Field(min_length=1)
    criteria: list[AssessorCriterion] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_ids(self) -> AssessorChecklist:
        ensure_unique_ids((criterion.id for criterion in self.criteria), label="assessor criterion")
        return self

    def by_id(self, criterion_id: int) -> AssessorCriterion:
        return find_by_id(self.criteria, criterion_id, label="assessor criterion")

    @classmethod
    def load(cls, path: Path) -> AssessorChecklist:
        return load_json_model(path, cls)

    @classmethod
    def load_or_default(cls, path: Path | None) -> AssessorChecklist:
        return cls.load(path) if path is not None else load_default_assessor_checklist()


def load_default_assessor_checklist() -> AssessorChecklist:
    checklist_path = resources.files("critic.data").joinpath("assessor_checklist.json")
    return load_json_model(checklist_path, AssessorChecklist)
