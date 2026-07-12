import json

import pytest

from critic.domain.assessment import AssessorOutput, CriterionScore, NoteJudgment
from critic.domain.assessor_checklist import load_default_assessor_checklist
from critic.domain.checklist import load_default_checklist
from critic.domain.critique import CriticOutput, ItemAssessment
from critic.metrics.records import GoldenErrors
from critic.metrics.report import (
    build_metrics_report,
    critic_score_quality_label,
    kappa_agreement_label,
    wcs_quality_label,
)


def _assessor_output(score: float) -> AssessorOutput:
    checklist = load_default_assessor_checklist()
    return AssessorOutput(
        criteria=[
            CriterionScore(criterion_id=criterion.id, score=score)
            for criterion in checklist.criteria
        ],
        notes=[
            NoteJudgment(
                item_id=1,
                direct_answer_violation=False,
                false_critique=False,
                grounded=True,
            )
        ],
    )


@pytest.mark.parametrize(
    ("wcs", "expected_label"),
    [
        (None, "not_available"),
        (0.59, "needs_work"),
        (0.6, "good_with_gaps"),
        (0.79, "good_with_gaps"),
        (0.8, "excellent"),
    ],
)
def test_wcs_quality_label_uses_design_doc_thresholds(
    wcs: float | None,
    expected_label: str,
) -> None:
    assert wcs_quality_label(wcs) == expected_label


@pytest.mark.parametrize(
    ("score", "expected_label"),
    [
        (None, "not_available"),
        (0.29, "bad"),
        (0.3, "normal"),
        (0.49, "normal"),
        (0.5, "good"),
        (0.79, "good"),
        (0.8, "excellent"),
    ],
)
def test_critic_score_quality_label_uses_checklist_thresholds(
    score: float | None,
    expected_label: str,
) -> None:
    assert critic_score_quality_label(score) == expected_label


@pytest.mark.parametrize(
    ("kappa", "expected_label"),
    [
        (None, "not_available"),
        (0.39, "poor"),
        (0.4, "moderate"),
        (0.59, "moderate"),
        (0.6, "substantial"),
    ],
)
def test_kappa_agreement_label_uses_design_doc_thresholds(
    kappa: float | None,
    expected_label: str,
) -> None:
    assert kappa_agreement_label(kappa) == expected_label


def test_build_metrics_report_populates_available_metrics() -> None:
    report = build_metrics_report(
        assessor_outputs=[_assessor_output(1)],
        assessor_checklist=load_default_assessor_checklist(),
        critic_outputs=[CriticOutput(relevant=True, items=[ItemAssessment(item_id=1, score=1)])],
        critic_checklist=load_default_checklist(),
        golden=GoldenErrors(total_section=2, found_section=1, total_cross=4, found_cross=3),
        cohens_kappa=0.7,
    )

    assert report.mean_wcs == 1.0
    assert report.wcs_quality_label == "excellent"
    assert report.direct_answer_violation_rate == 0
    assert report.false_critique_rate == 0
    assert report.grounded_claim_rate == 1
    assert report.section_critique_recall == 0.5
    assert report.cross_section_consistency_recall == 0.75
    assert report.cohens_kappa == 0.7
    assert report.kappa_agreement_label == "substantial"
    assert report.mean_critic_score == 1.0
    assert report.critic_score_quality_label == "excellent"
    assert report.assessment_total_count == 1
    assert report.assessment_failed_count == 0


def test_build_metrics_report_exposes_failed_assessment_count() -> None:
    report = build_metrics_report(
        assessor_outputs=[_assessor_output(1)],
        assessor_checklist=load_default_assessor_checklist(),
        assessment_total_count=2,
        assessment_failed_count=1,
    )

    assert report.assessment_total_count == 2
    assert report.assessment_failed_count == 1


def test_metrics_report_serializes_unavailable_optional_metrics_as_null() -> None:
    report = build_metrics_report(
        assessor_outputs=[],
        assessor_checklist=load_default_assessor_checklist(),
    )

    payload = json.loads(report.model_dump_json())

    assert payload == {
        "mean_wcs": None,
        "wcs_quality_label": "not_available",
        "direct_answer_violation_rate": None,
        "false_critique_rate": None,
        "grounded_claim_rate": None,
        "section_critique_recall": None,
        "cross_section_consistency_recall": None,
        "cohens_kappa": None,
        "kappa_agreement_label": "not_available",
        "mean_critic_score": None,
        "critic_score_quality_label": "not_available",
        "assessment_total_count": 0,
        "assessment_failed_count": 0,
    }
    assert "assessment_success_count" not in payload
