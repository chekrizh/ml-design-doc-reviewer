from critic.domain.checklist import load_default_checklist


def test_default_checklist_loads_all_appendix_items() -> None:
    checklist = load_default_checklist()

    assert checklist.version == "critic-checklist-v1"
    assert len(checklist.items) == 38
    assert [item.id for item in checklist.items] == list(range(1, 39))


def test_default_checklist_preserves_source_weights_and_flags() -> None:
    checklist = load_default_checklist()

    first = checklist.by_id(1)
    assert first.section == "1. Определение проблемы"
    assert first.block_weight == 10
    assert first.question_weight == 2
    assert first.b_flag == 0
    assert first.q_flag == 0

    last = checklist.by_id(38)
    assert last.section == "15. между разделами"
    assert last.block_weight == 10
    assert last.question_weight == 1
    assert last.b_flag == 1
    assert last.q_flag == 0
