from pathlib import Path

from critic.cli import main
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
