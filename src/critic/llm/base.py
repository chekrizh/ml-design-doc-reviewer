from typing import Protocol, TypeVar

from pydantic import BaseModel

from critic.image_parsing import ImageToReview

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class LLMClient(Protocol):
    async def parse(
        self,
        system_prompt: str,
        user_prompt: str,
        images: list[ImageToReview] | None,
        schema: type[SchemaT],
    ) -> SchemaT:
        """Return a validated structured response from the model."""
