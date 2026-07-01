from critic.domain.id_validation import describe_id_set_problems


def test_describe_id_set_problems_reports_duplicate_unknown_and_missing_ids() -> None:
    problems = describe_id_set_problems([1, 1, 4], {1, 2, 3}, label="item")

    assert problems == [
        "duplicate item ids: 1",
        "unknown item ids: 4",
        "missing item ids: 2, 3",
    ]
