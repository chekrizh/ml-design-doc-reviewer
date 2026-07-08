import logging
from types import SimpleNamespace

from pydantic import BaseModel

from critic.llm.openai_client import OpenAILLMClient
from critic.logging import LOGGER_NAME


class Output(BaseModel):
    value: int


def _usage(
    *,
    prompt_tokens: int = 1200,
    cached_tokens: int = 1024,
    completion_tokens: int = 42,
) -> SimpleNamespace:
    return SimpleNamespace(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens,
        prompt_tokens_details=SimpleNamespace(cached_tokens=cached_tokens),
    )


def _raw_client(completions: object) -> object:
    chat = SimpleNamespace(completions=completions)
    return SimpleNamespace(beta=SimpleNamespace(chat=chat), chat=chat)


class _ParsedMessage:
    parsed = Output(value=42)


class _ParsedChoice:
    message = _ParsedMessage()


class _ParsedResponse:
    choices = [_ParsedChoice()]


class _NativeCompletions:
    async def parse(self, **kwargs: object) -> _ParsedResponse:
        self.kwargs = kwargs
        return _ParsedResponse()


async def test_openai_client_uses_native_structured_parse() -> None:
    raw_client = _raw_client(_NativeCompletions())
    client = OpenAILLMClient(raw_client=raw_client, model="test-model")

    result = await client.parse("system", "user", Output)

    assert result == Output(value=42)


class _UsageParsedResponse(_ParsedResponse):
    usage = _usage(prompt_tokens=1536, cached_tokens=1024, completion_tokens=64)


class _UsageNativeCompletions:
    async def parse(self, **kwargs: object) -> _UsageParsedResponse:
        return _UsageParsedResponse()


async def test_openai_client_logs_cached_tokens_from_native_response(caplog) -> None:
    client = OpenAILLMClient(raw_client=_raw_client(_UsageNativeCompletions()), model="test-model")
    logger = logging.getLogger(LOGGER_NAME)
    previous_propagate = logger.propagate

    try:
        logger.propagate = True
        with caplog.at_level(logging.INFO, logger=LOGGER_NAME):
            result = await client.parse("system", "user", Output)
    finally:
        logger.propagate = previous_propagate

    assert result == Output(value=42)
    assert "llm_usage_recorded model=test-model attempt=None" in caplog.text
    assert "prompt_tokens=1536" in caplog.text
    assert "cached_tokens=1024" in caplog.text
    assert "completion_tokens=64" in caplog.text


class _ContentMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class _ContentChoice:
    def __init__(self, content: str) -> None:
        self.message = _ContentMessage(content)


class _ContentResponse:
    def __init__(self, content: str, usage: object | None = None) -> None:
        self.choices = [_ContentChoice(content)]
        if usage is not None:
            self.usage = usage


class _FallbackCompletions:
    def __init__(self) -> None:
        self.contents = ['{"value": "bad"}', '{"value": 7}']

    async def parse(self, **kwargs: object) -> object:
        raise AttributeError("native structured output is unavailable")

    async def create(self, **kwargs: object) -> _ContentResponse:
        self.kwargs = kwargs
        return _ContentResponse(self.contents.pop(0))


async def test_openai_client_falls_back_to_json_mode_with_one_retry(caplog) -> None:
    raw_client = _raw_client(_FallbackCompletions())
    client = OpenAILLMClient(raw_client=raw_client, model="test-model")
    logger = logging.getLogger(LOGGER_NAME)
    previous_propagate = logger.propagate

    try:
        logger.propagate = True
        with caplog.at_level(logging.WARNING, logger=LOGGER_NAME):
            result = await client.parse("system", "user", Output)
    finally:
        logger.propagate = previous_propagate

    assert result == Output(value=7)
    assert "llm_invalid_json_response" in caplog.text
    assert '{"value": "bad"}' in caplog.text


class _UsageFallbackCompletions:
    def __init__(self) -> None:
        self.responses = [
            _ContentResponse(
                '{"value": "bad"}',
                _usage(prompt_tokens=1200, cached_tokens=0, completion_tokens=8),
            ),
            _ContentResponse(
                '{"value": 7}',
                _usage(prompt_tokens=1200, cached_tokens=1024, completion_tokens=8),
            ),
        ]

    async def parse(self, **kwargs: object) -> object:
        raise AttributeError("native structured output is unavailable")

    async def create(self, **kwargs: object) -> _ContentResponse:
        return self.responses.pop(0)


async def test_openai_client_logs_cached_tokens_from_json_fallback_attempts(caplog) -> None:
    client = OpenAILLMClient(
        raw_client=_raw_client(_UsageFallbackCompletions()),
        model="test-model",
    )
    logger = logging.getLogger(LOGGER_NAME)
    previous_propagate = logger.propagate

    try:
        logger.propagate = True
        with caplog.at_level(logging.INFO, logger=LOGGER_NAME):
            result = await client.parse("system", "user", Output)
    finally:
        logger.propagate = previous_propagate

    assert result == Output(value=7)
    assert "llm_usage_recorded model=test-model attempt=1" in caplog.text
    assert "llm_usage_recorded model=test-model attempt=2" in caplog.text
    assert "cached_tokens=0" in caplog.text
    assert "cached_tokens=1024" in caplog.text


class _FencedJsonCompletions:
    async def parse(self, **kwargs: object) -> object:
        raise Output.model_validate_json('```json\n{"value": 7}\n```')

    async def create(self, **kwargs: object) -> _ContentResponse:
        return _ContentResponse('```json\n{"value": 7}\n```')


async def test_openai_client_accepts_markdown_fenced_json_after_native_parse_failure() -> None:
    client = OpenAILLMClient(raw_client=_raw_client(_FencedJsonCompletions()), model="test-model")

    result = await client.parse("system", "user", Output)

    assert result == Output(value=7)


class _RuntimeFailureCompletions:
    async def parse(self, **kwargs: object) -> object:
        raise RuntimeError("transport failed")


async def test_openai_client_does_not_mask_runtime_errors_with_json_fallback() -> None:
    client = OpenAILLMClient(
        raw_client=_raw_client(_RuntimeFailureCompletions()),
        model="test-model",
    )

    try:
        await client.parse("system", "user", Output)
    except RuntimeError as exc:
        assert "transport failed" in str(exc)
    else:
        raise AssertionError("expected runtime errors to be propagated")
