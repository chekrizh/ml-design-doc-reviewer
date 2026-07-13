import json
from pathlib import Path

from critic.domain.assessor_checklist import AssessorChecklist, load_default_assessor_checklist


def test_default_assessor_checklist_loads_appendix_items() -> None:
    checklist = load_default_assessor_checklist()

    assert checklist.version == "assessor-checklist-v1"
    assert len(checklist.criteria) == 9
    assert [criterion.id for criterion in checklist.criteria] == list(range(1, 10))


def test_default_assessor_checklist_preserves_design_doc_weights() -> None:
    checklist = load_default_assessor_checklist()

    assert checklist.by_id(1).weight == 3
    assert checklist.by_id(4).weight == 3
    assert checklist.by_id(5).weight == 2
    assert checklist.by_id(6).weight == 2
    assert checklist.by_id(7).weight == 1
    assert checklist.by_id(9).weight == 1


def test_default_assessor_checklist_names_groundedness_criterion() -> None:
    checklist = load_default_assessor_checklist()

    criterion = checklist.by_id(2)

    assert "grounded" in criterion.question.lower()


def test_assessor_checklist_load_or_default_supports_default_and_custom_paths(
    tmp_path: Path,
) -> None:
    checklist_path = tmp_path / "assessor-checklist.json"
    checklist_path.write_text(
        json.dumps(
            {
                "version": "custom",
                "criteria": [{"id": 1, "question": "Is the critique grounded?", "weight": 2}],
            }
        ),
        encoding="utf-8",
    )

    assert AssessorChecklist.load_or_default(None).version == "assessor-checklist-v1"
    assert AssessorChecklist.load_or_default(checklist_path).version == "custom"
