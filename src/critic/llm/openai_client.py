from __future__ import annotations

import logging
from typing import Any

from openai import AsyncOpenAI, BadRequestError
from pydantic import ValidationError

from critic.image_parsing import ImageToReview
from critic.llm.base import SchemaT
from critic.llm.json_response import extract_json_payload
from critic.logging import LOGGER_NAME


class OpenAILLMClient:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str,
        raw_client: Any | None = None,
        temperature: float = 0.2,
    ) -> None:
        self._client = raw_client or AsyncOpenAI(api_key=api_key, base_url=base_url)
        self._model = model
        self._temperature = temperature
        self._logger = logging.getLogger(LOGGER_NAME)

    async def parse(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[SchemaT],
        images: list[ImageToReview] | None = None,
    ) -> SchemaT:
        try:
            return await self._parse_native(system_prompt, user_prompt, schema, images)
        except (AttributeError, TypeError, NotImplementedError, BadRequestError, ValidationError):
            return await self._parse_json_fallback(system_prompt, user_prompt, schema, images)

    async def _parse_native(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[SchemaT],
        images: list[ImageToReview] | None = None,
    ) -> SchemaT:
        messages = self._messages(system_prompt, user_prompt, images)
        response = await self._client.beta.chat.completions.parse(
            model=self._model,
            messages=messages,
            response_format=schema,
            temperature=self._temperature,
        )
        parsed = response.choices[0].message.parsed
        if not isinstance(parsed, schema):
            return schema.model_validate(parsed)
        return parsed

    async def _parse_json_fallback(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[SchemaT],
        images: list[ImageToReview] | None = None,
    ) -> SchemaT:
        last_error: Exception | None = None
        for attempt in range(2):
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=self._messages(system_prompt, user_prompt, images),
                response_format={"type": "json_object"},
                temperature=self._temperature,
            )
            content = response.choices[0].message.content or "{}"
            try:
                return schema.model_validate_json(extract_json_payload(content))
            except ValidationError as exc:
                self._logger.warning(
                    "llm_invalid_json_response model=%s attempt=%d raw_content=%r",
                    self._model,
                    attempt + 1,
                    content,
                )
                last_error = exc
        if last_error is None:
            raise RuntimeError("LLM JSON fallback returned no response")
        raise last_error

    @staticmethod
    def _messages(
        system_prompt: str, user_prompt: str, images: list[ImageToReview] | None = None
    ) -> list[dict[str, str | list]]:
        if images is None:
            images = []

        user_content = []
        for image in sorted(images, key=lambda x: x.label):
            user_content.append({"text": f"Image: {image.label}"})
            user_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{image.mime_type};base64,{image.b64content}"},
                }
            )

        user_content.append({"type": "text", "text": user_prompt})

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]
