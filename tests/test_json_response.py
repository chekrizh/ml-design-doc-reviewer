from critic.llm.json_response import extract_json_payload


def test_extract_json_payload_returns_plain_json() -> None:
    assert extract_json_payload('{"value": 7}') == '{"value": 7}'


def test_extract_json_payload_removes_markdown_json_fence() -> None:
    content = '```json\n{"value": 7}\n```'

    assert extract_json_payload(content) == '{"value": 7}'


def test_extract_json_payload_finds_object_inside_wrapping_text() -> None:
    content = 'Here is the JSON:\n{"value": 7}\nThanks.'

    assert extract_json_payload(content) == '{"value": 7}'
