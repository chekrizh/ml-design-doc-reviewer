from pydantic import BaseModel

from critic.domain.critique import CriticOutput, ItemAssessment


class FakeLLMClient:
    def __init__(self, output: CriticOutput | None = None) -> None:
        self.output = output or complete_critic_output()
        self.system_prompt: str | None = None
        self.user_prompt: str | None = None
        self.schema: type[BaseModel] | None = None

    async def parse(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[BaseModel],
    ) -> CriticOutput:
        self.system_prompt = system_prompt
        self.user_prompt = user_prompt
        self.schema = schema
        return self.output


def complete_critic_output(*overrides: ItemAssessment) -> CriticOutput:
    by_id = {assessment.item_id: assessment for assessment in overrides}
    return CriticOutput(
        relevant=True,
        items=[
            by_id.get(item_id, ItemAssessment(item_id=item_id, score=1)) for item_id in range(1, 39)
        ],
    )
