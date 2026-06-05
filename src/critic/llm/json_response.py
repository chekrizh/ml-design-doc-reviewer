import json
from collections.abc import Iterator
from dataclasses import dataclass


@dataclass(frozen=True)
class _JsonObjectCandidate:
    payload: str
    start: int
    end: int


def extract_json_payload(content: str) -> str:
    """Extract the best JSON object from a noisy LLM response.

    LLMs may include prompt/schema examples after the actual answer. Prefer a
    JSON object that stands on its own line/block; inline objects are usually
    examples embedded in prose. If there is no standalone object, keep the
    conservative fallback of returning the last parseable JSON object.
    """
    stripped = content.strip()
    candidates = list(_iter_valid_json_objects(stripped))
    if not candidates:
        return stripped

    for candidate in candidates:
        if _is_standalone_json_block(stripped, candidate):
            return candidate.payload

    return candidates[-1].payload


def _iter_valid_json_objects(content: str) -> Iterator[_JsonObjectCandidate]:
    decoder = json.JSONDecoder()
    object_start = 0
    while object_start < len(content):
        if content[object_start] != "{":
            object_start += 1
            continue
        try:
            _, object_end = decoder.raw_decode(content[object_start:])
        except json.JSONDecodeError:
            object_start += 1
            continue
        end = object_start + object_end
        yield _JsonObjectCandidate(payload=content[object_start:end], start=object_start, end=end)
        object_start = end


def _is_standalone_json_block(content: str, candidate: _JsonObjectCandidate) -> bool:
    line_start = content.rfind("\n", 0, candidate.start) + 1
    line_end = content.find("\n", candidate.end)
    if line_end == -1:
        line_end = len(content)

    prefix = content[line_start : candidate.start]
    suffix = content[candidate.end : line_end]
    return not prefix.strip() and not suffix.strip()
