from pathlib import Path

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str = Field(validation_alias=AliasChoices("OPENAI_API_KEY", "openai_api_key"))
    openai_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        validation_alias=AliasChoices("OPENAI_BASE_URL", "openai_base_url"),
    )
    model: str = Field(
        default="openai/gpt-4o-mini",
        validation_alias=AliasChoices("CRITIC_MODEL", "model"),
    )
    top_n: int = Field(default=5, validation_alias=AliasChoices("CRITIC_TOP_N", "top_n"), ge=1)
    log_file: Path = Field(
        default=Path("logs/critic.log"),
        validation_alias=AliasChoices("CRITIC_LOG_FILE", "log_file"),
    )
    checklist_path: Path | None = Field(
        default=None,
        validation_alias=AliasChoices("CRITIC_CHECKLIST_PATH", "checklist_path"),
    )

    @field_validator("checklist_path", mode="before")
    @classmethod
    def blank_checklist_path_uses_default(cls, value: object) -> object:
        if value == "":
            return None
        return value
