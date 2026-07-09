from collections.abc import Sequence
from typing import Literal

from pydantic import BaseModel

from critic.domain.assessment import AssessorOutput
from critic.domain.assessor_checklist import AssessorChecklist
from critic.domain.checklist import Checklist
from critic.domain.critique import CriticOutput
from critic.metrics.critic_score import mean_critic_score
from critic.metrics.kappa import compute_cohens_kappa, interpret_kappa
from critic.metrics.offline import (
    cross_section_consistency_recall,
    direct_answer_violation_rate,
    false_critique_rate,
    grounded_claim_rate,
    mean_wcs,
    section_critique_recall,
)
from critic.metrics.records import GoldenErrors

WcsQualityLabel = Literal["excellent", "good_with_gaps", "needs_work", "not_available"]
CriticScoreQualityLabel = Literal["excellent", "good", "normal", "bad", "not_available"]
KappaAgreementLabel = Literal["poor", "moderate", "substantial", "not_available"]


class MetricsReport(BaseModel):
    mean_wcs: float | None
    wcs_quality_label: WcsQualityLabel
    direct_answer_violation_rate: float | None
    false_critique_rate: float | None
    grounded_claim_rate: float | None
    section_critique_recall: float | None
    cross_section_consistency_recall: float | None
    cohens_kappa: float | None
    kappa_agreement_label: KappaAgreementLabel
    mean_critic_score: float | None
    critic_score_quality_label: CriticScoreQualityLabel
    assessment_total_count: int
    assessment_failed_count: int


def build_metrics_report(
    *,
    assessor_outputs: Sequence[AssessorOutput],
    assessor_checklist: AssessorChecklist,
    critic_outputs: Sequence[CriticOutput] | None = None,
    critic_checklist: Checklist | None = None,
    golden: GoldenErrors | None = None,
    cohens_kappa: float | None = None,
    assessment_total_count: int | None = None,
    assessment_failed_count: int = 0,
) -> MetricsReport:
    wcs = mean_wcs(assessor_outputs, assessor_checklist)
    critic_score = (
        mean_critic_score(critic_outputs, critic_checklist)
        if critic_outputs is not None and critic_checklist is not None
        else None
    )
    kappa = _cohens_kappa_from_golden(golden, cohens_kappa)
    total_count = (
        len(assessor_outputs) + assessment_failed_count
        if assessment_total_count is None
        else assessment_total_count
    )
    return MetricsReport(
        mean_wcs=wcs,
        wcs_quality_label=wcs_quality_label(wcs),
        direct_answer_violation_rate=direct_answer_violation_rate(assessor_outputs),
        false_critique_rate=false_critique_rate(assessor_outputs),
        grounded_claim_rate=grounded_claim_rate(assessor_outputs),
        section_critique_recall=(section_critique_recall(golden) if golden is not None else None),
        cross_section_consistency_recall=(
            cross_section_consistency_recall(golden) if golden is not None else None
        ),
        cohens_kappa=kappa,
        kappa_agreement_label=kappa_agreement_label(kappa),
        mean_critic_score=critic_score,
        critic_score_quality_label=critic_score_quality_label(critic_score),
        assessment_total_count=total_count,
        assessment_failed_count=assessment_failed_count,
    )


def wcs_quality_label(wcs: float | None) -> WcsQualityLabel:
    return _bucket_label(wcs, [(0.8, "excellent"), (0.6, "good_with_gaps")], "needs_work")


def critic_score_quality_label(score: float | None) -> CriticScoreQualityLabel:
    return _bucket_label(score, [(0.8, "excellent"), (0.5, "good"), (0.3, "normal")], "bad")


def kappa_agreement_label(kappa: float | None) -> KappaAgreementLabel:
    if kappa is None:
        return "not_available"
    return interpret_kappa(kappa).value


def _bucket_label(value: float | None, thresholds: Sequence[tuple[float, str]], below: str) -> str:
    if value is None:
        return "not_available"
    for cutoff, label in thresholds:
        if value >= cutoff:
            return label
    return below


def _cohens_kappa_from_golden(
    golden: GoldenErrors | None,
    override: float | None,
) -> float | None:
    if override is not None:
        return override
    if golden is None or not golden.expert_scores:
        return None
    return compute_cohens_kappa(golden.expert_scores, golden.assessor_scores)
