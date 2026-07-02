import argparse
import json
from pathlib import Path

import pytest

from critic.cli import build_parser, main
from critic.domain.assessor_checklist import load_default_assessor_checklist
from critic.domain.critique import ReviewResult


class FakeService:
    def __init__(self) -> None:
        self.document: str | None = None

    async def review(self, document: str) -> ReviewResult:
        self.document = document
        return ReviewResult(
            relevant=True,
            notes=[],
            checklist_version="test",
            model="test-model",
        )


class FakeAssessorService:
    def __init__(self) -> None:
        self.inference_log_file: Path | None = None
        self.output_file: Path | None = None

    async def assess_inference_log(
        self,
        inference_log_file: Path,
        output_file: Path,
    ) -> list[str]:
        self.inference_log_file = inference_log_file
        self.output_file = output_file
        return ["assessment-1"]


def test_cli_reads_document_and_prints_review_json(tmp_path: Path, capsys) -> None:
    document_path = tmp_path / "doc.md"
    document_path.write_text("design doc", encoding="utf-8")
    service = FakeService()

    exit_code = main(["review", str(document_path)], service_factory=lambda: service)

    captured = capsys.readouterr()
    assert exit_code == 0
    assert service.document == "design doc"
    assert '"relevant": true' in captured.out
    assert '"model": "test-model"' in captured.out


def test_cli_assess_reads_inference_log_and_prints_assessment_ids(
    tmp_path: Path,
    capsys,
) -> None:
    inference_log = tmp_path / "inference.jsonl"
    output_file = tmp_path / "assessment-eval.jsonl"
    inference_log.write_text("", encoding="utf-8")
    service = FakeAssessorService()

    exit_code = main(
        ["assess", str(inference_log), "--output", str(output_file)],
        assessor_service_factory=lambda: service,
    )

    captured = capsys.readouterr()
    assert exit_code == 0
    assert service.inference_log_file == inference_log
    assert service.output_file == output_file
    assert '"assessment_ids": ["assessment-1"]' in captured.out


def test_cli_assess_uses_env_output_with_assessor_factory(
    tmp_path: Path,
    monkeypatch,
) -> None:
    inference_log = tmp_path / "inference.jsonl"
    output_file = tmp_path / "env-assessment-eval.jsonl"
    inference_log.write_text("", encoding="utf-8")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
    monkeypatch.setenv("ASSESSOR_MODEL", "openai/gpt-4o-mini")
    monkeypatch.setenv("ASSESSOR_EVAL_LOG_FILE", str(output_file))
    service = FakeAssessorService()

    exit_code = main(["assess", str(inference_log)], assessor_service_factory=lambda: service)

    assert exit_code == 0
    assert service.output_file == output_file


def test_cli_assess_with_assessor_factory_does_not_require_service_settings(
    tmp_path: Path,
    monkeypatch,
) -> None:
    inference_log = tmp_path / "inference.jsonl"
    output_file = tmp_path / "assessment-eval.jsonl"
    inference_log.write_text("", encoding="utf-8")
    for name in [
        "OPENAI_API_KEY",
        "OPENAI_BASE_URL",
        "ASSESSOR_MODEL",
        "ASSESSOR_EVAL_LOG_FILE",
    ]:
        monkeypatch.delenv(name, raising=False)
    service = FakeAssessorService()

    exit_code = main(
        ["assess", str(inference_log), "--output", str(output_file)],
        assessor_service_factory=lambda: service,
    )

    assert exit_code == 0
    assert service.inference_log_file == inference_log
    assert service.output_file == output_file


def test_cli_assess_with_assessor_factory_without_output_uses_default_log_file(
    tmp_path: Path,
    monkeypatch,
) -> None:
    inference_log = tmp_path / "inference.jsonl"
    inference_log.write_text("", encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    for name in [
        "OPENAI_API_KEY",
        "OPENAI_BASE_URL",
        "ASSESSOR_MODEL",
        "ASSESSOR_EVAL_LOG_FILE",
    ]:
        monkeypatch.delenv(name, raising=False)
    service = FakeAssessorService()

    exit_code = main(["assess", str(inference_log)], assessor_service_factory=lambda: service)

    assert exit_code == 0
    assert service.inference_log_file == inference_log
    assert service.output_file == Path("logs/assessment-eval.jsonl")


def test_cli_assess_without_factory_without_output_uses_default_log_file(
    tmp_path: Path,
    monkeypatch,
) -> None:
    inference_log = tmp_path / "inference.jsonl"
    inference_log.write_text("", encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
    monkeypatch.setenv("ASSESSOR_MODEL", "openai/gpt-4o-mini")
    monkeypatch.delenv("ASSESSOR_EVAL_LOG_FILE", raising=False)
    service = FakeAssessorService()

    monkeypatch.setattr("critic.cli.AssessorService.from_settings", lambda settings: service)

    exit_code = main(["assess", str(inference_log)])

    assert exit_code == 0
    assert service.inference_log_file == inference_log
    assert service.output_file == Path("logs/assessment-eval.jsonl")


def test_cli_metrics_reads_logs_and_prints_report(tmp_path: Path, capsys) -> None:
    assessment_log = tmp_path / "assessment-eval.jsonl"
    inference_log = tmp_path / "inference.jsonl"
    golden = tmp_path / "golden.json"
    checklist = load_default_assessor_checklist()
    assessment_log.write_text(
        json.dumps(
            {
                "criteria": [
                    {
                        "criterion_id": criterion.id,
                        "weight": criterion.weight,
                        "score": 1,
                    }
                    for criterion in checklist.criteria
                ],
                "notes": [
                    {
                        "item_id": 1,
                        "direct_answer_violation": False,
                        "false_critique": False,
                        "grounded": True,
                    }
                ],
            }
        )
        + "\n",
        encoding="utf-8",
    )
    inference_log.write_text(
        json.dumps(
            {
                "critic_output": {
                    "relevant": True,
                    "items": [{"item_id": 1, "score": 1}],
                }
            }
        )
        + "\n",
        encoding="utf-8",
    )
    golden.write_text(
        json.dumps(
            {
                "total_section": 2,
                "found_section": 1,
                "total_cross": 4,
                "found_cross": 3,
                "expert_scores": [0, 0, 0.5, 0.5, 1, 1],
                "assessor_scores": [0, 0.5, 0.5, 0.5, 1, 0],
            }
        ),
        encoding="utf-8",
    )

    exit_code = main(
        [
            "metrics",
            str(assessment_log),
            "--inference-log",
            str(inference_log),
            "--golden",
            str(golden),
        ]
    )

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["mean_wcs"] == 1.0
    assert payload["wcs_quality_label"] == "excellent"
    assert payload["direct_answer_violation_rate"] == 0.0
    assert payload["grounded_claim_rate"] == 1.0
    assert payload["section_critique_recall"] == 0.5
    assert payload["cross_section_consistency_recall"] == 0.75
    assert payload["cohens_kappa"] == pytest.approx(0.5)
    assert payload["mean_critic_score"] == 1.0


def test_cli_help_lists_review_assess_and_metrics_commands() -> None:
    help_text = build_parser().format_help()

    assert "{review,assess,metrics}" in help_text


def test_cli_errors_if_parser_returns_unknown_command(monkeypatch) -> None:
    class ParserWithUnexpectedCommand:
        error_message: str | None = None

        def parse_args(self, argv):
            return argparse.Namespace(command="unexpected")

        def error(self, message):
            self.error_message = message
            raise SystemExit(2)

    parser = ParserWithUnexpectedCommand()
    monkeypatch.setattr("critic.cli.build_parser", lambda: parser)

    with pytest.raises(SystemExit) as error:
        main(["unexpected"])

    assert error.value.code == 2
    assert parser.error_message == "unknown command: unexpected"
