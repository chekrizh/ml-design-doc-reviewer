from typing import Protocol

from pydantic import BaseModel, Field

from critic.domain.checklist import Checklist
from critic.domain.critique import CriticOutput, RankedNote


class ReviewContext(BaseModel):
    document: str
    checklist: Checklist
    model: str
    top_n: int = Field(ge=1)
    critic_output: CriticOutput | None = None
    relevant: bool = True
    message: str | None = None
    notes: list[RankedNote] = Field(default_factory=list)


class Stage(Protocol):
    async def run(self, context: ReviewContext) -> ReviewContext:
        """Run one pipeline stage."""


class Pipeline:
    def __init__(self, stages: list[Stage]) -> None:
        self._stages = stages

    async def run(self, context: ReviewContext) -> ReviewContext:
        current = context
        for stage in self._stages:
            current = await stage.run(current)
        return current
