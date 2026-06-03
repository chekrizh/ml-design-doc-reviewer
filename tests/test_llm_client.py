import logging
from types import SimpleNamespace

from pydantic import BaseModel

from critic.llm.openai_client import OpenAILLMClient
from critic.logging import LOGGER_NAME


class Output(BaseModel):
    value: int


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


class _ContentMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class _ContentChoice:
    def __init__(self, content: str) -> None:
        self.message = _ContentMessage(content)


class _ContentResponse:
    def __init__(self, content: str) -> None:
        self.choices = [_ContentChoice(content)]


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
