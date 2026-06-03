from __future__ import annotations

import json
from enum import StrEnum
from importlib import resources
from pathlib import Path

from pydantic import BaseModel, Field, model_validator


class Severity(StrEnum):
    critical = "critical"
    warning = "warning"
    nice_to_have = "nice_to_have"


class ChecklistItem(BaseModel):
    id: int = Field(ge=1)
    section: str = Field(min_length=1)
    question: str = Field(min_length=1)
    block_weight: int = Field(ge=1, le=10)
    question_weight: int = Field(ge=1, le=5)


class Checklist(BaseModel):
    version: str = Field(min_length=1)
    items: list[ChecklistItem] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_ids(self) -> Checklist:
        item_ids = [item.id for item in self.items]
        if len(item_ids) != len(set(item_ids)):
            raise ValueError("duplicate checklist item id")
        return self

    def by_id(self, item_id: int) -> ChecklistItem:
        for item in self.items:
            if item.id == item_id:
                return item
        raise KeyError(f"checklist item not found: {item_id}")

    @classmethod
    def load(cls, path: Path) -> Checklist:
        with path.open(encoding="utf-8") as file:
            return cls.model_validate(json.load(file))


def load_default_checklist() -> Checklist:
    checklist_path = resources.files("critic.data").joinpath("critic_checklist.json")
    with checklist_path.open(encoding="utf-8") as file:
        return Checklist.model_validate(json.load(file))
