from typing import Protocol, TypeVar

from pydantic import BaseModel

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class LLMClient(Protocol):
    async def parse(self, system_prompt: str, user_prompt: str, schema: type[SchemaT]) -> SchemaT:
        """Return a validated structured response from the model."""
