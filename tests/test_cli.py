from pathlib import Path
from typing import Any

from critic.cli import main
from critic.domain.critique import ReviewResult


class FakeService:
    def __init__(self) -> None:
        self.document: Any | None = None

    async def review(self, document: Any) -> ReviewResult:
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


def test_cli_accepts_json_design_doc_snapshot(tmp_path: Path, capsys) -> None:
    document_path = tmp_path / "doc.json"
    document_path.write_text(
        """
        {
          "version_id": "draft-7",
          "blocks": [
            {"title": "Baseline Solution", "type": "text", "content": "Need model baseline"},
            {"title": "Problem definition", "type": "image", "path": "s3://bucket/architecture.png"}
          ]
        }
        """,
        encoding="utf-8",
    )
    service = FakeService()

    exit_code = main(["review", str(document_path)], service_factory=lambda: service)

    captured = capsys.readouterr()
    assert exit_code == 0
    assert service.document == {
        "version_id": "draft-7",
        "blocks": [
            {
                "title": "Baseline Solution",
                "type": "text",
                "content": "Need model baseline",
            },
            {
                "title": "Problem definition",
                "type": "image",
                "path": "s3://bucket/architecture.png",
            },
        ],
    }
    assert '"relevant": true' in captured.out
