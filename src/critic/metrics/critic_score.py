from collections.abc import Sequence

from critic.domain.checklist import Checklist, Severity
from critic.domain.critique import CriticOutput
from critic.ranker import severity_from_item

SEVERITY_WEIGHTS = {
    Severity.critical: 3,
    Severity.warning: 2,
    Severity.nice_to_have: 1,
}


def critic_document_score(output: CriticOutput, checklist: Checklist) -> float | None:
    if not output.relevant or not output.items:
        return None

    weighted_score = 0.0
    total_weight = 0
    for assessment in output.items:
        item = checklist.by_id(assessment.item_id)
        weight = SEVERITY_WEIGHTS[severity_from_item(item)]
        weighted_score += weight * float(assessment.score)
        total_weight += weight
    return weighted_score / total_weight


def mean_critic_score(outputs: Sequence[CriticOutput], checklist: Checklist) -> float | None:
    scores = [
        score
        for output in outputs
        if (score := critic_document_score(output, checklist)) is not None
    ]
    if not scores:
        return None
    return sum(scores) / len(scores)
