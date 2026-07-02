from collections import Counter
from collections.abc import Iterable


def describe_id_set_problems(
    actual_ids: Iterable[int],
    expected_ids: set[int],
    *,
    label: str,
) -> list[str]:
    actual_id_list = list(actual_ids)
    actual_id_set = set(actual_id_list)

    duplicate_ids = sorted(
        item_id for item_id, count in Counter(actual_id_list).items() if count > 1
    )
    unknown_ids = sorted(actual_id_set - expected_ids)
    missing_ids = sorted(expected_ids - actual_id_set)

    problems: list[str] = []
    if duplicate_ids:
        formatted_ids = ", ".join(str(item_id) for item_id in duplicate_ids)
        problems.append(f"duplicate {label} ids: {formatted_ids}")
    if unknown_ids:
        formatted_ids = ", ".join(str(item_id) for item_id in unknown_ids)
        problems.append(f"unknown {label} ids: {formatted_ids}")
    if missing_ids:
        formatted_ids = ", ".join(str(item_id) for item_id in missing_ids)
        problems.append(f"missing {label} ids: {formatted_ids}")
    return problems
