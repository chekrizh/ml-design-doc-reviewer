from critic.domain.checklist import Checklist
from critic.domain.critique import CriticOutput
from critic.domain.id_validation import describe_id_set_problems


class CriticOutputValidationError(ValueError):
    """Raised when the LLM output violates the checklist contract."""

    def __init__(
        self,
        message: str,
        *,
        critic_output: CriticOutput | None = None,
        llm_duration_ms: int | None = None,
    ) -> None:
        super().__init__(message)
        self.critic_output = critic_output
        self.llm_duration_ms = llm_duration_ms


def validate_critic_output(output: CriticOutput, checklist: Checklist) -> None:
    if not output.relevant:
        if output.items:
            raise CriticOutputValidationError(
                "irrelevant output must not include checklist items",
                critic_output=output,
            )
        return

    expected_ids = {item.id for item in checklist.items}
    actual_ids = [item.item_id for item in output.items]
    problems = describe_id_set_problems(actual_ids, expected_ids, label="item")

    if problems:
        raise CriticOutputValidationError("; ".join(problems), critic_output=output)
