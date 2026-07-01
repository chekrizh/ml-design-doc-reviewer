from collections.abc import Sequence
from typing import Literal

from pydantic import BaseModel

from critic.domain.assessment import AssessorOutput
from critic.domain.assessor_checklist import AssessorChecklist
from critic.domain.checklist import Checklist
from critic.domain.critique import CriticOutput
from critic.metrics.critic_score import mean_critic_score
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


class MetricsReport(BaseModel):
    mean_wcs: float | None
    wcs_quality_label: WcsQualityLabel
    direct_answer_violation_rate: float | None
    false_critique_rate: float | None
    grounded_claim_rate: float | None
    section_critique_recall: float | None
    cross_section_consistency_recall: float | None
    cohens_kappa: float | None
    mean_critic_score: float | None


def build_metrics_report(
    *,
    assessor_outputs: Sequence[AssessorOutput],
    assessor_checklist: AssessorChecklist,
    critic_outputs: Sequence[CriticOutput] | None = None,
    critic_checklist: Checklist | None = None,
    golden: GoldenErrors | None = None,
    cohens_kappa: float | None = None,
) -> MetricsReport:
    wcs = mean_wcs(assessor_outputs, assessor_checklist)
    return MetricsReport(
        mean_wcs=wcs,
        wcs_quality_label=wcs_quality_label(wcs),
        direct_answer_violation_rate=direct_answer_violation_rate(assessor_outputs),
        false_critique_rate=false_critique_rate(assessor_outputs),
        grounded_claim_rate=grounded_claim_rate(assessor_outputs),
        section_critique_recall=(
            section_critique_recall(golden) if golden is not None else None
        ),
        cross_section_consistency_recall=(
            cross_section_consistency_recall(golden) if golden is not None else None
        ),
        cohens_kappa=cohens_kappa,
        mean_critic_score=(
            mean_critic_score(critic_outputs, critic_checklist)
            if critic_outputs is not None and critic_checklist is not None
            else None
        ),
    )


def wcs_quality_label(wcs: float | None) -> WcsQualityLabel:
    if wcs is None:
        return "not_available"
    if wcs >= 0.8:
        return "excellent"
    if wcs >= 0.6:
        return "good_with_gaps"
    return "needs_work"
