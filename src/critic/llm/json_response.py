import re

_JSON_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*(.*?)\s*```\s*$", re.DOTALL | re.IGNORECASE)


def extract_json_payload(content: str) -> str:
    stripped = content.strip()
    fenced_match = _JSON_FENCE_RE.match(stripped)
    if fenced_match:
        stripped = fenced_match.group(1).strip()

    object_start = stripped.find("{")
    object_end = stripped.rfind("}")
    if object_start != -1 and object_end != -1 and object_start < object_end:
        return stripped[object_start : object_end + 1]
    return stripped
