import json
from pathlib import Path

from critic.jsonl import read_jsonl


def test_read_jsonl_skips_blank_lines_and_parses_records(tmp_path: Path) -> None:
    path = tmp_path / "records.jsonl"
    path.write_text(
        json.dumps({"id": 1}) + "\n\n" + json.dumps({"id": 2, "ok": True}) + "\n",
        encoding="utf-8",
    )

    assert read_jsonl(path) == [{"id": 1}, {"id": 2, "ok": True}]
