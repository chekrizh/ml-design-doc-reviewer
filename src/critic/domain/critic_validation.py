from collections import Counter

from critic.domain.checklist import Checklist
from critic.domain.critique import CriticOutput


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
    actual_id_set = set(actual_ids)

    duplicate_ids = sorted(id for id, count in Counter(actual_ids).items() if count > 1)
    unknown_ids = sorted(actual_id_set - expected_ids)
    missing_ids = sorted(expected_ids - actual_id_set)

    problems: list[str] = []
    if duplicate_ids:
        problems.append(f"duplicate item ids: {_format_ids(duplicate_ids)}")
    if unknown_ids:
        problems.append(f"unknown item ids: {_format_ids(unknown_ids)}")
    if missing_ids:
        problems.append(f"missing item ids: {_format_ids(missing_ids)}")

    if problems:
        raise CriticOutputValidationError("; ".join(problems), critic_output=output)


def _format_ids(item_ids: list[int]) -> str:
    return ", ".join(str(item_id) for item_id in item_ids)
