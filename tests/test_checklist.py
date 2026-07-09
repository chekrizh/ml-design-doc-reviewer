import json
import subprocess
import zipfile
from pathlib import Path

import pytest

from critic.domain.checklist import Checklist, load_default_checklist


def test_default_checklist_is_packaged_in_wheel(tmp_path: Path) -> None:
    subprocess.run(
        ["uv", "build", "--wheel", "--out-dir", str(tmp_path)],
        check=True,
        capture_output=True,
        text=True,
    )
    [wheel_path] = tmp_path.glob("*.whl")

    with zipfile.ZipFile(wheel_path) as wheel:
        assert "critic/data/critic_checklist.json" in wheel.namelist()
        assert "critic/data/assessor_checklist.json" in wheel.namelist()


def test_default_checklist_loads_all_appendix_items() -> None:
    checklist = load_default_checklist()

    assert checklist.version == "critic-checklist-v4"
    assert len(checklist.items) == 50
    assert [item.id for item in checklist.items] == list(range(1, 51))


def test_default_checklist_preserves_source_weights() -> None:
    checklist = load_default_checklist()

    first = checklist.by_id(1)
    assert first.section == "1.1 Problem Definition"
    assert first.block_weight == 16
    assert first.question_weight == 4

    last = checklist.by_id(50)
    assert last.section == "5.5 Validation vs Monitoring"
    assert last.block_weight == 10
    assert last.question_weight == 1


def test_checklist_load_or_default_supports_default_and_custom_paths(tmp_path: Path) -> None:
    checklist_path = tmp_path / "checklist.json"
    checklist_path.write_text(
        json.dumps(
            {
                "version": "custom",
                "items": [
                    {
                        "id": 1,
                        "section": "Problem",
                        "question": "Is the problem defined?",
                        "block_weight": 2,
                        "question_weight": 3,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    assert Checklist.load_or_default(None).version == "critic-checklist-v4"
    assert Checklist.load_or_default(checklist_path).version == "custom"


def test_checklist_split_keeps_single_batch_behavior() -> None:
    checklist = load_default_checklist()

    [batch] = checklist.split(1)

    assert batch.version == checklist.version
    assert [item.id for item in batch.items] == list(range(1, 51))


def test_checklist_split_distributes_items_evenly() -> None:
    checklist = load_default_checklist()

    batches = checklist.split(5)

    assert [[item.id for item in batch.items] for batch in batches] == [
        list(range(1, 11)),
        list(range(11, 21)),
        list(range(21, 31)),
        list(range(31, 41)),
        list(range(41, 51)),
    ]


def test_checklist_split_distributes_remainder_to_earlier_batches() -> None:
    checklist = load_default_checklist()

    batches = checklist.split(6)

    assert [len(batch.items) for batch in batches] == [9, 9, 8, 8, 8, 8]
    assert [item.id for batch in batches for item in batch.items] == list(range(1, 51))


def test_checklist_split_clamps_batch_count_to_item_count() -> None:
    checklist = load_default_checklist()

    batches = checklist.split(100)

    assert len(batches) == 50
    assert all(len(batch.items) == 1 for batch in batches)
    assert [batch.items[0].id for batch in batches] == list(range(1, 51))


def test_checklist_split_rejects_invalid_batch_count() -> None:
    checklist = load_default_checklist()

    with pytest.raises(ValueError, match="batch_count must be >= 1"):
        checklist.split(0)
