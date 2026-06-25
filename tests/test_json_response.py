from critic.llm.json_response import extract_json_payload


def test_extract_json_payload_returns_plain_json() -> None:
    assert extract_json_payload('{"value": 7}') == '{"value": 7}'


def test_extract_json_payload_removes_markdown_json_fence() -> None:
    content = '```json\n{"value": 7}\n```'

    assert extract_json_payload(content) == '{"value": 7}'


def test_extract_json_payload_finds_object_inside_wrapping_text() -> None:
    content = 'Here is the JSON:\n{"value": 7}\nThanks.'

    assert extract_json_payload(content) == '{"value": 7}'


def test_extract_json_payload_ignores_example_object_before_actual_json() -> None:
    content = (
        'The system should return a JSON object like {"value": 0}.\n'
        'Here is the result:\n{"value": 7}'
    )

    assert extract_json_payload(content) == '{"value": 7}'


def test_extract_json_payload_keeps_outer_nested_json_object() -> None:
    assert extract_json_payload('{"outer": {"inner": 1}}') == '{"outer": {"inner": 1}}'


def test_extract_json_payload_prefers_leading_review_over_trailing_example() -> None:
    content = (
        '{"relevant": true, "items": [{"item_id": 1, "score": 0.5, "remark": "gap"}]}\n'
        'If irrelevant, return {"relevant": false, "items": []}'
    )

    assert extract_json_payload(content) == (
        '{"relevant": true, "items": [{"item_id": 1, "score": 0.5, "remark": "gap"}]}'
    )


def test_extract_json_payload_prefers_review_over_trailing_example_with_preamble() -> None:
    content = (
        "Review:\n"
        '{"relevant": true, "items": [{"item_id": 1, "score": 0.5, "remark": "gap"}]}\n'
        'If irrelevant, return {"relevant": false, "items": []}'
    )

    assert extract_json_payload(content) == (
        '{"relevant": true, "items": [{"item_id": 1, "score": 0.5, "remark": "gap"}]}'
    )


def test_extract_json_payload_prefers_first_fence_over_trailing_example_fence() -> None:
    content = (
        "```json\n"
        '{"relevant": true, "items": [{"item_id": 1, "score": 0.5, "remark": "gap"}]}\n'
        "```\n"
        "```json\n"
        '{"relevant": false, "items": []}\n'
        "```"
    )

    assert extract_json_payload(content) == (
        '{"relevant": true, "items": [{"item_id": 1, "score": 0.5, "remark": "gap"}]}'
    )


def test_extract_json_payload_keeps_irrelevant_review_over_trailing_schema_example() -> None:
    content = (
        '{"relevant": false, "items": []}\n'
        'Schema example: {"relevant": true, "items": [{"item_id": 1, "score": 0.5, '
        '"remark": "gap"}]}'
    )

    assert extract_json_payload(content) == '{"relevant": false, "items": []}'
