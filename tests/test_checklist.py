import subprocess
import zipfile
from pathlib import Path

from critic.domain.checklist import load_default_checklist


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
