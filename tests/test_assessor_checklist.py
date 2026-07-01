from critic.domain.assessor_checklist import load_default_assessor_checklist


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
