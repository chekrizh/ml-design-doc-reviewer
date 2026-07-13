from dataclasses import dataclass


@dataclass(frozen=True)
class PromptPair:
    system_prompt: str
    user_prompt: str
