from critic.config import Settings


def test_settings_uses_openrouter_defaults() -> None:
    settings = Settings(openai_api_key="test-key")

    assert str(settings.openai_base_url) == "https://openrouter.ai/api/v1"
    assert settings.model == "openai/gpt-4o-mini"
    assert settings.top_n == 5
    assert settings.log_file.name == "critic.log"


def test_settings_accepts_critic_prefixed_overrides(monkeypatch) -> None:
    monkeypatch.setenv("CRITIC_MODEL", "anthropic/claude-3.5-sonnet")
    monkeypatch.setenv("CRITIC_TOP_N", "3")

    settings = Settings(openai_api_key="test-key")

    assert settings.model == "anthropic/claude-3.5-sonnet"
    assert settings.top_n == 3


def test_settings_treats_blank_checklist_path_as_default(monkeypatch) -> None:
    monkeypatch.setenv("CRITIC_CHECKLIST_PATH", "")

    settings = Settings(openai_api_key="test-key")

    assert settings.checklist_path is None


def test_settings_accepts_log_file_override(monkeypatch) -> None:
    monkeypatch.setenv("CRITIC_LOG_FILE", "tmp/custom.log")

    settings = Settings(openai_api_key="test-key")

    assert str(settings.log_file) == "tmp/custom.log"


def test_settings_accepts_inference_log_overrides(monkeypatch) -> None:
    monkeypatch.setenv("CRITIC_INFERENCE_LOG_FILE", "tmp/inference.jsonl")
    monkeypatch.setenv("CRITIC_LOG_INPUT_SNAPSHOT", "false")

    settings = Settings(openai_api_key="test-key")

    assert str(settings.inference_log_file) == "tmp/inference.jsonl"
    assert settings.log_input_snapshot is False
