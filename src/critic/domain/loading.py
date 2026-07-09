import json
from collections.abc import Iterable
from importlib.resources.abc import Traversable
from pathlib import Path
from typing import Protocol

from pydantic import BaseModel


class _Identified(Protocol):
    id: int


def load_json_model[ModelT: BaseModel](
    source: Path | Traversable,
    model: type[ModelT],
) -> ModelT:
    with source.open(encoding="utf-8") as file:
        return model.model_validate(json.load(file))


def find_by_id[ItemT: _Identified](
    items: Iterable[ItemT],
    item_id: int,
    *,
    label: str,
) -> ItemT:
    for item in items:
        if item.id == item_id:
            return item
    raise KeyError(f"{label} not found: {item_id}")
