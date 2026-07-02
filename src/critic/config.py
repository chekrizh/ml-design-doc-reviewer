from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class _CriticBaseSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
        populate_by_name=True,
    )


class _OpenAISettings(_CriticBaseSettings):
    openai_api_key: str = Field(alias="OPENAI_API_KEY")
    openai_base_url: str = Field(alias="OPENAI_BASE_URL")


class Settings(_OpenAISettings):
    model: str = Field(alias="CRITIC_MODEL")
    top_n: int = Field(alias="CRITIC_TOP_N", ge=1)
    log_file: Path = Field(alias="CRITIC_LOG_FILE")
    inference_log_file: Path | None = Field(default=None, alias="CRITIC_INFERENCE_LOG_FILE")
    checklist_path: Path | None = Field(
        default=None,
        alias="CRITIC_CHECKLIST_PATH",
    )


class AssessorSettings(_OpenAISettings):
    model: str = Field(alias="ASSESSOR_MODEL")
    eval_log_file: Path = Field(
        default=Path("logs/assessment-eval.jsonl"),
        alias="ASSESSOR_EVAL_LOG_FILE",
    )
    checklist_path: Path | None = Field(
        default=None,
        alias="ASSESSOR_CHECKLIST_PATH",
    )


class AssessorOutputSettings(_CriticBaseSettings):
    eval_log_file: Path = Field(
        default=Path("logs/assessment-eval.jsonl"),
        alias="ASSESSOR_EVAL_LOG_FILE",
    )
