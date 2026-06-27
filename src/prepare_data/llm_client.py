"""Sync OpenAI-compatible chat client for dataset preparation."""

from __future__ import annotations

import logging
import time

from openai import APIStatusError, OpenAI, RateLimitError

logger = logging.getLogger(__name__)


class OpenAIChatClient:
    """Thin sync wrapper around the OpenAI SDK (same stack as the critic agent)."""

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        model: str,
        timeout: float = 300.0,
        temperature: float = 0.2,
    ) -> None:
        self._client = OpenAI(api_key=api_key, base_url=base_url, timeout=timeout)
        self._model = model
        self._temperature = temperature

    def complete(
        self,
        system_prompt: str,
        user_message: str,
        *,
        max_tokens: int = 8192,
        max_retries: int = 6,
        retry_base_seconds: float = 5.0,
    ) -> str:
        last_error: Exception | None = None

        for attempt in range(max_retries):
            try:
                response = self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    temperature=self._temperature,
                    max_tokens=max_tokens,
                )
                content = response.choices[0].message.content
                if not content:
                    raise RuntimeError("LLM returned empty content")
                return content
            except RateLimitError as exc:
                last_error = exc
                if attempt >= max_retries - 1:
                    raise
                wait = retry_base_seconds * (2**attempt)
                logger.warning(
                    "Rate limited by LLM API, retrying in %.0fs (attempt %d/%d)",
                    wait,
                    attempt + 1,
                    max_retries,
                )
                time.sleep(wait)
            except APIStatusError as exc:
                if exc.status_code == 429 and attempt < max_retries - 1:
                    last_error = exc
                    wait = retry_base_seconds * (2**attempt)
                    logger.warning(
                        "HTTP 429 from LLM API, retrying in %.0fs (attempt %d/%d)",
                        wait,
                        attempt + 1,
                        max_retries,
                    )
                    time.sleep(wait)
                    continue
                raise

        raise RuntimeError("LLM request failed after retries") from last_error
