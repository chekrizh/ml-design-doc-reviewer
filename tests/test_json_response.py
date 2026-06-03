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
