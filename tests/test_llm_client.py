from pydantic import BaseModel

from critic.llm.openai_client import OpenAILLMClient


class Output(BaseModel):
    value: int


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


class _NativeClient:
    def __init__(self) -> None:
        self.beta = type(
            "Beta",
            (),
            {"chat": type("Chat", (), {"completions": _NativeCompletions()})()},
        )()


def test_openai_client_uses_native_structured_parse() -> None:
    raw_client = _NativeClient()
    client = OpenAILLMClient(raw_client=raw_client, model="test-model")

    result = client.parse_sync("system", "user", Output)

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


class _FallbackClient:
    def __init__(self) -> None:
        completions = _FallbackCompletions()
        self.beta = type("Beta", (), {"chat": type("Chat", (), {"completions": completions})()})()
        self.chat = type("Chat", (), {"completions": completions})()


def test_openai_client_falls_back_to_json_mode_with_one_retry() -> None:
    raw_client = _FallbackClient()
    client = OpenAILLMClient(raw_client=raw_client, model="test-model")

    result = client.parse_sync("system", "user", Output)

    assert result == Output(value=7)


class _RuntimeFailureCompletions:
    async def parse(self, **kwargs: object) -> object:
        raise RuntimeError("transport failed")


class _RuntimeFailureClient:
    def __init__(self) -> None:
        self.beta = type(
            "Beta",
            (),
            {"chat": type("Chat", (), {"completions": _RuntimeFailureCompletions()})()},
        )()


def test_openai_client_does_not_mask_runtime_errors_with_json_fallback() -> None:
    client = OpenAILLMClient(raw_client=_RuntimeFailureClient(), model="test-model")

    try:
        client.parse_sync("system", "user", Output)
    except RuntimeError as exc:
        assert "transport failed" in str(exc)
    else:
        raise AssertionError("expected runtime errors to be propagated")
