from __future__ import annotations

import json
from importlib import resources
from importlib.resources.abc import Traversable
from pathlib import Path

from pydantic import BaseModel, Field, model_validator

from critic.domain.id_validation import ensure_unique_ids


class ChecklistItem(BaseModel):
    id: int = Field(ge=1)
    section: str = Field(min_length=1)
    question: str = Field(min_length=1)
    block_weight: int = Field(ge=1, le=16)
    question_weight: int = Field(ge=1, le=6)


class Checklist(BaseModel):
    version: str = Field(min_length=1)
    items: list[ChecklistItem] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_ids(self) -> Checklist:
        ensure_unique_ids((item.id for item in self.items), label="checklist item")
        return self

    def by_id(self, item_id: int) -> ChecklistItem:
        for item in self.items:
            if item.id == item_id:
                return item
        raise KeyError(f"checklist item not found: {item_id}")

    def split(self, batch_count: int) -> list[Checklist]:
        if batch_count < 1:
            raise ValueError("batch_count must be >= 1")

        count = min(batch_count, len(self.items))
        base_size, remainder = divmod(len(self.items), count)
        chunks: list[Checklist] = []
        start = 0
        for index in range(count):
            size = base_size + (1 if index < remainder else 0)
            chunks.append(Checklist(version=self.version, items=self.items[start : start + size]))
            start += size
        return chunks

    @classmethod
    def load(cls, path: Path) -> Checklist:
        return _load_checklist(path)


def load_default_checklist() -> Checklist:
    checklist_path = resources.files("critic.data").joinpath("critic_checklist.json")
    return _load_checklist(checklist_path)


def _load_checklist(source: Path | Traversable) -> Checklist:
    with source.open(encoding="utf-8") as file:
        return Checklist.model_validate(json.load(file))
