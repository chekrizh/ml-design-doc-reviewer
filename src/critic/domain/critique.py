from typing import Literal

from pydantic import BaseModel, Field, model_validator

from critic.domain.checklist import Severity

Score = Literal[0, 0.5, 1]


class ItemAssessment(BaseModel):
    item_id: int = Field(ge=1)
    score: Score
    remark: str | None = None

    @model_validator(mode="after")
    def validate_remark_for_incomplete_score(self) -> "ItemAssessment":
        if self.score < 1 and not (self.remark and self.remark.strip()):
            raise ValueError("remark is required when score is lower than 1")
        return self


class CriticOutput(BaseModel):
    relevant: bool
    items: list[ItemAssessment] = Field(default_factory=list)


class RankedNote(BaseModel):
    item_id: int = Field(ge=1)
    section: str
    question: str
    score: float
    remark: str
    severity: Severity
    priority: float


class ReviewResult(BaseModel):
    relevant: bool
    message: str | None = None
    notes: list[RankedNote] = Field(default_factory=list)
    checklist_version: str
    model: str
