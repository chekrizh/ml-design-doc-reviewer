from dataclasses import dataclass

from jinja2 import Template

from critic.domain.assessor_checklist import AssessorChecklist
from critic.domain.critique import RankedNote

SYSTEM_PROMPT = """\
You are an independent LLM-as-a-Judge assessor for ML design document critique.

Your task:
1. Score every assessor checklist criterion on a scale:
   - 1: fully satisfied
   - 0.5: partially satisfied
   - 0: not satisfied
2. Judge every shown critique note with three boolean flags:
   - direct_answer_violation: true if the note gives a ready-made answer or solution
   - false_critique: true if the note is factually wrong or criticizes nonexistent content
   - grounded: true if the note is supported by a concrete fragment of the submitted document
3. In this baseline there is no RAG. Treat groundedness as document-groundedness only.
4. Evaluate critique quality only. Do not rewrite the critique and do not solve the design task.

The response must be valid JSON compatible with the schema:
{
  "criteria": [
    {"criterion_id": 1, "score": 1, "justification": "Short reason"}
  ],
  "notes": [
    {
      "item_id": 2,
      "direct_answer_violation": false,
      "false_critique": false,
      "grounded": true
    }
  ]
}
Return only the JSON object: no markdown, no explanations, no ```json and no closing ```.
"""

USER_PROMPT_TEMPLATE = Template(
    """\
Assessor checklist version: {{ checklist.version }}

Assessor checklist:
{% for criterion in checklist.criteria -%}
ID {{ criterion.id }} | weight: {{ criterion.weight }}
Question: {{ criterion.question }}

{% endfor %}
Document:
{{ document }}

Critique notes to assess:
{% for note in notes -%}
item_id: {{ note.item_id }}
section: {{ note.section }}
critic_checklist_question: {{ note.question }}
critic_score: {{ note.score }}
remark: {{ note.remark }}

{% endfor %}
"""
)


@dataclass(frozen=True)
class AssessorPrompts:
    system_prompt: str
    user_prompt: str


def render_assessor_prompts(
    checklist: AssessorChecklist,
    document: str,
    notes: list[RankedNote],
) -> AssessorPrompts:
    return AssessorPrompts(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=USER_PROMPT_TEMPLATE.render(
            checklist=checklist,
            document=document,
            notes=notes,
        ),
    )
