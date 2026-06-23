import pytest
from pydantic import ValidationError

from critic.config import Settings


def _set_required_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
    monkeypatch.setenv("CRITIC_MODEL", "openai/gpt-4o-mini")
    monkeypatch.setenv("CRITIC_TOP_N", "5")
    monkeypatch.setenv("CRITIC_LOG_FILE", "logs/critic.log")


def test_settings_reads_values_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required_env(monkeypatch)

    settings = Settings(_env_file=None)

    assert settings.openai_api_key == "test-key"
    assert str(settings.openai_base_url) == "https://openrouter.ai/api/v1"
    assert settings.model == "openai/gpt-4o-mini"
    assert settings.top_n == 5
    assert settings.log_file.name == "critic.log"
    assert settings.inference_log_file is None


def test_settings_requires_env_values(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "OPENAI_API_KEY",
        "OPENAI_BASE_URL",
        "CRITIC_MODEL",
        "CRITIC_TOP_N",
        "CRITIC_LOG_FILE",
    ):
        monkeypatch.delenv(name, raising=False)

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_settings_accepts_critic_prefixed_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required_env(monkeypatch)
    monkeypatch.setenv("CRITIC_MODEL", "anthropic/claude-3.5-sonnet")
    monkeypatch.setenv("CRITIC_TOP_N", "3")

    settings = Settings(openai_api_key="test-key", _env_file=None)

    assert settings.model == "anthropic/claude-3.5-sonnet"
    assert settings.top_n == 3


def test_settings_treats_blank_checklist_path_as_default(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required_env(monkeypatch)
    monkeypatch.setenv("CRITIC_CHECKLIST_PATH", "")

    settings = Settings(openai_api_key="test-key", _env_file=None)

    assert settings.checklist_path is None


def test_settings_accepts_log_file_override(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required_env(monkeypatch)
    monkeypatch.setenv("CRITIC_LOG_FILE", "tmp/custom.log")

    settings = Settings(openai_api_key="test-key", _env_file=None)

    assert str(settings.log_file) == "tmp/custom.log"


def test_settings_accepts_inference_log_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_required_env(monkeypatch)
    monkeypatch.setenv("CRITIC_INFERENCE_LOG_FILE", "tmp/inference.jsonl")

    settings = Settings(openai_api_key="test-key", _env_file=None)

    assert str(settings.inference_log_file) == "tmp/inference.jsonl"
