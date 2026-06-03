import json
import re

_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL | re.IGNORECASE)


def extract_json_payload(content: str) -> str:
    stripped = content.strip()
    fenced_matches = list(_JSON_FENCE_RE.finditer(stripped))
    if fenced_matches:
        stripped = fenced_matches[-1].group(1).strip()

    json_object = _last_valid_json_object(stripped)
    if json_object is not None:
        return json_object
    return stripped


def _last_valid_json_object(content: str) -> str | None:
    decoder = json.JSONDecoder()
    last_match: str | None = None
    object_start = 0
    while object_start < len(content):
        character = content[object_start]
        if character != "{":
            object_start += 1
            continue
        try:
            _, object_end = decoder.raw_decode(content[object_start:])
        except json.JSONDecodeError:
            object_start += 1
            continue
        last_match = content[object_start : object_start + object_end]
        object_start += object_end
    return last_match
