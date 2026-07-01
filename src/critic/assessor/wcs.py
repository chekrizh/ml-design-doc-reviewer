from critic.domain.assessment import AssessorOutput
from critic.domain.assessor_checklist import AssessorChecklist


def compute_wcs(output: AssessorOutput, checklist: AssessorChecklist) -> float:
    scores_by_id = {score.criterion_id: float(score.score) for score in output.criteria}
    weighted_score = sum(
        criterion.weight * scores_by_id[criterion.id] for criterion in checklist.criteria
    )
    total_weight = sum(criterion.weight for criterion in checklist.criteria)
    return weighted_score / total_weight
