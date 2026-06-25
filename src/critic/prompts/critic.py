from dataclasses import dataclass

from jinja2 import Template

from critic.domain.checklist import Checklist

SYSTEM_PROMPT = """\
You are an experienced ML design document reviewer.

Your task:
1. Score each checklist item on a scale:
   - 1: fully satisfied
   - 0.5: partially satisfied
   - 0: not satisfied
2. Return exactly one item object for every checklist ID, including items with score 1.
   Do not return only weak, missing, or incomplete items.
3. For each item with score < 1, formulate a critical remark or
   guiding question that helps the author find the solution independently.
4. Do not provide a ready-made solution, ready-made design, concrete implementation, or
   corrected section text.
5. Rely strictly on the provided document. If information is insufficient,
   state this explicitly and do not invent facts.
6. Ignore minor stylistic and punctuation issues if they do not
   affect architectural meaning.

Input guardrail:
- If the document is empty, spam, offensive, or irrelevant to ML System
  Design, do not evaluate the checklist.
- In that case, return JSON with "relevant": false and an empty "items": [] list.
- For a relevant document, return "relevant": true and exactly one score for every
  checklist item ID.

The response must be valid JSON compatible with the schema:
{
  "relevant": true,
  "items": [
    {"item_id": 1, "score": 0.5, "remark": "Short remark or question"}
  ]
}
Return only the JSON object: no markdown, no explanations, no ```json and no
closing ```. The first character of the response must be {, the last — }.
"""

USER_PROMPT_TEMPLATE = Template(
    """\
Checklist version: {{ checklist.version }}

Critic checklist:
{% for item in checklist.items -%}
ID {{ item.id }} | section: {{ item.section }}
Importance: block {{ item.block_weight }}/16, question {{ item.question_weight }}/6
Question: {{ item.question }}

{% endfor %}
Document:
{{ document }}
"""
)


@dataclass(frozen=True)
class CriticPrompts:
    system_prompt: str
    user_prompt: str


def render_critic_prompts(checklist: Checklist, document: str) -> CriticPrompts:
    return CriticPrompts(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=USER_PROMPT_TEMPLATE.render(checklist=checklist, document=document),
    )
