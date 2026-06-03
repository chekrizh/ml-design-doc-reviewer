from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
        populate_by_name=True,
    )

    openai_api_key: str
    openai_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
    )
    model: str = Field(
        default="openai/gpt-4o-mini",
        alias="CRITIC_MODEL",
    )
    top_n: int = Field(default=5, alias="CRITIC_TOP_N", ge=1)
    log_file: Path = Field(
        default=Path("logs/critic.log"),
        alias="CRITIC_LOG_FILE",
    )
    inference_log_file: Path = Field(
        default=Path("logs/inference.jsonl"),
        alias="CRITIC_INFERENCE_LOG_FILE",
    )
    checklist_path: Path | None = Field(
        default=None,
        alias="CRITIC_CHECKLIST_PATH",
    )
