import pytest

from critic.domain.checklist import load_default_checklist
from critic.domain.critique import CriticOutput, ItemAssessment
from critic.metrics.critic_score import critic_document_score, mean_critic_score


def test_critic_document_score_returns_one_for_fully_satisfied_checklist_items() -> None:
    checklist = load_default_checklist()
    output = CriticOutput(
        relevant=True,
        items=[
            ItemAssessment(item_id=1, score=1),
            ItemAssessment(item_id=34, score=1),
            ItemAssessment(item_id=42, score=1),
        ],
    )

    assert critic_document_score(output, checklist) == 1.0


def test_critic_document_score_uses_severity_weights() -> None:
    checklist = load_default_checklist()
    output = CriticOutput(
        relevant=True,
        items=[
            ItemAssessment(item_id=1, score=1),
            ItemAssessment(item_id=34, score=0.5, remark="Error analysis is underspecified."),
            ItemAssessment(item_id=42, score=0, remark="Monitoring alerts are missing."),
        ],
    )

    assert critic_document_score(output, checklist) == pytest.approx(4 / 6)


def test_critic_document_score_returns_none_without_relevant_items() -> None:
    checklist = load_default_checklist()

    assert critic_document_score(CriticOutput(relevant=False, items=[]), checklist) is None
    assert critic_document_score(CriticOutput(relevant=True, items=[]), checklist) is None


def test_mean_critic_score_ignores_unavailable_document_scores() -> None:
    checklist = load_default_checklist()
    outputs = [
        CriticOutput(relevant=True, items=[ItemAssessment(item_id=1, score=1)]),
        CriticOutput(relevant=False, items=[]),
        CriticOutput(
            relevant=True,
            items=[ItemAssessment(item_id=1, score=0, remark="Problem is missing.")],
        ),
    ]

    assert mean_critic_score(outputs, checklist) == 0.5


def test_mean_critic_score_returns_none_when_all_scores_are_unavailable() -> None:
    outputs = [CriticOutput(relevant=False, items=[])]

    assert mean_critic_score(outputs, load_default_checklist()) is None
