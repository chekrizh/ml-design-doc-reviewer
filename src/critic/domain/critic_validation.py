from critic.domain.checklist import Checklist
from critic.domain.critique import CriticOutput


class CriticOutputValidationError(ValueError):
    """Raised when the LLM output violates the checklist contract."""


def validate_critic_output(output: CriticOutput, checklist: Checklist) -> None:
    if not output.relevant:
        if output.items:
            raise CriticOutputValidationError("irrelevant output must not include checklist items")
        return

    expected_ids = {item.id for item in checklist.items}
    actual_ids = [item.item_id for item in output.items]
    actual_id_set = set(actual_ids)

    duplicate_ids = sorted({item_id for item_id in actual_ids if actual_ids.count(item_id) > 1})
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
        raise CriticOutputValidationError("; ".join(problems))


def _format_ids(item_ids: list[int]) -> str:
    return ", ".join(str(item_id) for item_id in item_ids)
