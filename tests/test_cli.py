from pathlib import Path

from critic.cli import build_parser, main
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


def test_cli_help_lists_review_and_assess_commands() -> None:
    help_text = build_parser().format_help()

    assert "{review,assess}" in help_text
