import json
from pathlib import Path

from critic.metrics.records import (
    GoldenErrors,
    load_golden_errors,
    parse_assessor_records,
    parse_critic_records,
)


def test_parse_assessor_records_rebuilds_assessor_output(tmp_path: Path) -> None:
    log_path = tmp_path / "assessment-eval.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "assessment_id": "assessment-1",
                "criteria": [
                    {
                        "criterion_id": 1,
                        "weight": 3,
                        "score": 0.5,
                        "justification": "Partially tied to the checklist.",
                    }
                ],
                "notes": [
                    {
                        "item_id": 2,
                        "direct_answer_violation": False,
                        "false_critique": True,
                        "grounded": True,
                    }
                ],
            }
        )
        + "\n",
        encoding="utf-8",
    )

    [output] = parse_assessor_records(log_path)

    assert output.criteria[0].criterion_id == 1
    assert output.criteria[0].score == 0.5
    assert output.criteria[0].justification == "Partially tied to the checklist."
    assert output.notes[0].item_id == 2
    assert output.notes[0].false_critique is True


def test_parse_critic_records_rebuilds_critic_output(tmp_path: Path) -> None:
    log_path = tmp_path / "inference.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "inference_id": "inf-1",
                "critic_output": {
                    "relevant": True,
                    "items": [
                        {"item_id": 1, "score": 1},
                        {"item_id": 2, "score": 0, "remark": "Missing root cause analysis."},
                    ],
                },
            }
        )
        + "\n"
        + json.dumps({"inference_id": "inf-2", "critic_output": None})
        + "\n",
        encoding="utf-8",
    )

    [output] = parse_critic_records(log_path)

    assert output.relevant is True
    assert [item.item_id for item in output.items] == [1, 2]
    assert output.items[1].remark == "Missing root cause analysis."


def test_load_golden_errors_reads_json_file(tmp_path: Path) -> None:
    golden_path = tmp_path / "golden.json"
    golden_path.write_text(
        json.dumps(
            {
                "total_section": 4,
                "found_section": 3,
                "total_cross": 2,
                "found_cross": 1,
            }
        ),
        encoding="utf-8",
    )

    golden = load_golden_errors(golden_path)

    assert golden == GoldenErrors(
        total_section=4,
        found_section=3,
        total_cross=2,
        found_cross=1,
    )


def test_golden_errors_rejects_found_counts_above_totals() -> None:
    try:
        GoldenErrors(total_section=1, found_section=2, total_cross=0, found_cross=0)
    except ValueError as exc:
        assert "found_section" in str(exc)
    else:
        raise AssertionError("GoldenErrors accepted found_section above total_section")
