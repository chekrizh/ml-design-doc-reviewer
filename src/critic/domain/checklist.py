from __future__ import annotations

from importlib import resources
from pathlib import Path

from pydantic import BaseModel, Field, model_validator

from critic.domain.id_validation import ensure_unique_ids
from critic.domain.loading import find_by_id, load_json_model


class ChecklistItem(BaseModel):
    id: int = Field(ge=1)
    section: str = Field(min_length=1)
    question: str = Field(min_length=1)
    block_weight: int = Field(ge=1, le=16)
    question_weight: int = Field(ge=1, le=6)

    @property
    def weight(self) -> int:
        return self.block_weight * self.question_weight


class Checklist(BaseModel):
    version: str = Field(min_length=1)
    items: list[ChecklistItem] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_ids(self) -> Checklist:
        ensure_unique_ids((item.id for item in self.items), label="checklist item")
        return self

    def by_id(self, item_id: int) -> ChecklistItem:
        return find_by_id(self.items, item_id, label="checklist item")

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
        return load_json_model(path, cls)

    @classmethod
    def load_or_default(cls, path: Path | None) -> Checklist:
        return cls.load(path) if path is not None else load_default_checklist()


def load_default_checklist() -> Checklist:
    checklist_path = resources.files("critic.data").joinpath("critic_checklist.json")
    return load_json_model(checklist_path, Checklist)
