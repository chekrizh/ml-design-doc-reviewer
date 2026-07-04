from collections.abc import Sequence

from critic.domain.checklist import Checklist
from critic.domain.critique import CriticOutput


def critic_document_score(output: CriticOutput, checklist: Checklist) -> float | None:
    if not output.relevant or not output.items:
        return None

    weighted_score = 0.0
    total_weight = 0
    for assessment in output.items:
        item = checklist.by_id(assessment.item_id)
        # Baseline scores full documents only, so B_F_T_i from the design doc
        # formula is implicitly 1 until partial snapshots are introduced.
        weight = item.block_weight * item.question_weight
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
