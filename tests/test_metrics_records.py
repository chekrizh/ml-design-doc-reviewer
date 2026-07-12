import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from critic.domain.assessment import AssessmentValidationError
from critic.domain.assessor_checklist import load_default_assessor_checklist
from critic.domain.checklist import load_default_checklist
from critic.metrics import records
from critic.metrics.records import (
    GoldenErrors,
    load_golden_errors,
    parse_assessor_records,
    parse_critic_records,
)


def test_parse_assessor_records_rebuilds_assessor_output(tmp_path: Path) -> None:
    checklist = load_default_assessor_checklist()
    log_path = tmp_path / "assessment-eval.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "assessment_id": "assessment-1",
                "criteria": [
                    {
                        "criterion_id": criterion.id,
                        "weight": criterion.weight,
                        "score": 0.5 if criterion.id == 1 else 1,
                        "justification": "Partially tied to the checklist.",
                    }
                    for criterion in checklist.criteria
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

    [output] = parse_assessor_records(log_path, assessor_checklist=checklist)

    assert output.criteria[0].criterion_id == 1
    assert output.criteria[0].score == 0.5
    assert output.criteria[0].justification == "Partially tied to the checklist."
    assert output.notes[0].item_id == 2
    assert output.notes[0].false_critique is True


def test_parse_assessor_records_rejects_missing_expected_criteria(tmp_path: Path) -> None:
    log_path = tmp_path / "assessment-eval.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "assessment_id": "assessment-1",
                "criteria": [{"criterion_id": 1, "score": 1}],
                "notes": [],
            }
        )
        + "\n",
        encoding="utf-8",
    )

    with pytest.raises(AssessmentValidationError, match="missing criterion ids"):
        parse_assessor_records(
            log_path,
            assessor_checklist=load_default_assessor_checklist(),
        )


def test_parse_assessor_records_rejects_checklist_version_mismatch(tmp_path: Path) -> None:
    checklist = load_default_assessor_checklist()
    log_path = tmp_path / "assessment-eval.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "assessment_id": "assessment-1",
                "assessor_checklist_version": "different-version",
                "criteria": [
                    {"criterion_id": criterion.id, "score": 1} for criterion in checklist.criteria
                ],
                "notes": [],
            }
        )
        + "\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="assessor checklist version mismatch"):
        parse_assessor_records(log_path, assessor_checklist=checklist)


def test_parse_assessor_records_skips_failed_assessment_records(tmp_path: Path) -> None:
    checklist = load_default_assessor_checklist()
    log_path = tmp_path / "assessment-eval.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "assessment_id": "failed-assessment",
                "status": "failed",
                "inference_id": "inf-1",
                "error": {
                    "type": "AssessmentValidationError",
                    "message": "missing criterion ids: 1",
                },
            }
        )
        + "\n"
        + json.dumps(
            {
                "assessment_id": "successful-assessment",
                "criteria": [
                    {
                        "criterion_id": criterion.id,
                        "score": 1,
                    }
                    for criterion in checklist.criteria
                ],
                "notes": [],
            }
        )
        + "\n",
        encoding="utf-8",
    )

    [output] = parse_assessor_records(log_path, assessor_checklist=checklist)

    assert [score.criterion_id for score in output.criteria] == [
        criterion.id for criterion in checklist.criteria
    ]


def test_count_assessment_records_reports_successful_and_failed_rows(tmp_path: Path) -> None:
    log_path = tmp_path / "assessment-eval.jsonl"
    log_path.write_text(
        json.dumps({"assessment_id": "failed-assessment", "status": "failed"})
        + "\n"
        + json.dumps({"assessment_id": "successful-assessment", "criteria": [], "notes": []})
        + "\n",
        encoding="utf-8",
    )

    counts = records.count_assessment_records(log_path)

    assert counts.total == 2
    assert counts.successful == 1
    assert counts.failed == 1


def test_count_assessment_records_uses_latest_retry_state(tmp_path: Path) -> None:
    log_path = tmp_path / "assessment-eval.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "assessment_id": "failed-assessment",
                "inference_id": "inf-1",
                "status": "failed",
            }
        )
        + "\n"
        + json.dumps(
            {
                "assessment_id": "successful-assessment",
                "inference_id": "inf-1",
                "criteria": [],
                "notes": [],
            }
        )
        + "\n",
        encoding="utf-8",
    )

    counts = records.count_assessment_records(log_path)

    assert counts.total == 1
    assert counts.successful == 1
    assert counts.failed == 0


def test_parse_assessor_records_uses_latest_successful_record_per_inference(
    tmp_path: Path,
) -> None:
    checklist = load_default_assessor_checklist()
    log_path = tmp_path / "assessment-eval.jsonl"
    records = [
        {
            "assessment_id": "first-assessment",
            "inference_id": "inf-1",
            "criteria": [
                {"criterion_id": criterion.id, "score": 0} for criterion in checklist.criteria
            ],
            "notes": [],
        },
        {
            "assessment_id": "latest-assessment",
            "inference_id": "inf-1",
            "criteria": [
                {"criterion_id": criterion.id, "score": 1} for criterion in checklist.criteria
            ],
            "notes": [],
        },
    ]
    log_path.write_text(
        "\n".join(json.dumps(record) for record in records) + "\n",
        encoding="utf-8",
    )

    outputs = parse_assessor_records(log_path, assessor_checklist=checklist)

    assert len(outputs) == 1
    assert all(score.score == 1 for score in outputs[0].criteria)


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


def test_parse_critic_records_skips_failed_inference_records(tmp_path: Path) -> None:
    log_path = tmp_path / "inference.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "inference_id": "failed-inf",
                "status": "failed",
                "final_result": None,
                "critic_output": {
                    "relevant": True,
                    "items": [{"item_id": 999999, "score": 1}],
                },
            }
        )
        + "\n"
        + json.dumps(
            {
                "inference_id": "successful-inf",
                "critic_output": {
                    "relevant": True,
                    "items": [{"item_id": 1, "score": 1}],
                },
            }
        )
        + "\n",
        encoding="utf-8",
    )

    [output] = parse_critic_records(log_path)

    assert [item.item_id for item in output.items] == [1]


def test_parse_critic_records_accepts_guardrail_rejected_records_for_loaded_checklist(
    tmp_path: Path,
) -> None:
    log_path = tmp_path / "inference.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "inference_id": "irrelevant-inf",
                "critic_output": {"relevant": False, "items": []},
            }
        )
        + "\n",
        encoding="utf-8",
    )

    [output] = parse_critic_records(log_path, critic_checklist=load_default_checklist())

    assert output.relevant is False
    assert output.items == []


def test_parse_critic_records_rejects_invalid_critic_output_shape(tmp_path: Path) -> None:
    log_path = tmp_path / "inference.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "inference_id": "invalid-inf",
                "critic_output": {
                    "items": [{"item_id": 1, "score": 1}],
                },
            }
        )
        + "\n",
        encoding="utf-8",
    )

    with pytest.raises(ValidationError, match="relevant"):
        parse_critic_records(log_path)


def test_parse_critic_records_rejects_unknown_item_ids_for_loaded_checklist(
    tmp_path: Path,
) -> None:
    log_path = tmp_path / "inference.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "inference_id": "drifted-inf",
                "critic_output": {
                    "relevant": True,
                    "items": [{"item_id": 999999, "score": 1}],
                },
            }
        )
        + "\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="unknown item ids: 999999"):
        parse_critic_records(log_path, critic_checklist=load_default_checklist())


def test_parse_critic_records_rejects_missing_item_ids_for_loaded_checklist(
    tmp_path: Path,
) -> None:
    log_path = tmp_path / "inference.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "inference_id": "partial-inf",
                "critic_output": {
                    "relevant": True,
                    "items": [{"item_id": 1, "score": 1}],
                },
            }
        )
        + "\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="missing item ids"):
        parse_critic_records(log_path, critic_checklist=load_default_checklist())


def test_parse_critic_records_rejects_checklist_version_mismatch(tmp_path: Path) -> None:
    checklist = load_default_checklist()
    log_path = tmp_path / "inference.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "inference_id": "drifted-inf",
                "checklist_version": "different-version",
                "critic_output": {
                    "relevant": True,
                    "items": [{"item_id": item.id, "score": 1} for item in checklist.items],
                },
            }
        )
        + "\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="critic checklist version mismatch"):
        parse_critic_records(log_path, critic_checklist=checklist)


def test_load_golden_errors_reads_json_file(tmp_path: Path) -> None:
    golden_path = tmp_path / "golden.json"
    golden_path.write_text(
        json.dumps(
            {
                "total_section": 4,
                "found_section": 3,
                "total_cross": 2,
                "found_cross": 1,
                "expert_scores": [0, 0, 0.5, 0.5, 1, 1],
                "assessor_scores": [0, 0.5, 0.5, 0.5, 1, 0],
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
        expert_scores=[0, 0, 0.5, 0.5, 1, 1],
        assessor_scores=[0, 0.5, 0.5, 0.5, 1, 0],
    )


def test_golden_errors_rejects_found_counts_above_totals() -> None:
    try:
        GoldenErrors(total_section=1, found_section=2, total_cross=0, found_cross=0)
    except ValueError as exc:
        assert "found_section" in str(exc)
    else:
        raise AssertionError("GoldenErrors accepted found_section above total_section")
