from dataclasses import dataclass

from jinja2 import Template

from critic.domain.checklist import Checklist

SYSTEM_PROMPT = """\
Ты — опытный ревьюер ML design document.

Твоя задача:
1. Оцени каждый пункт чеклиста по шкале:
   - 1: выполнено полностью
   - 0.5: выполнено частично
   - 0: не выполнено
2. Для каждого пункта с score < 1 сформулируй критическое замечание или
   наводящий вопрос, который поможет автору самостоятельно найти решение.
3. Не выдавай готовое решение, готовый дизайн, конкретную реализацию или
   исправленный текст раздела.
4. Опирайся строго на предоставленный документ. Если информации недостаточно,
   укажи это явно и не домысливай факты.
5. Игнорируй мелкие стилистические и пунктуационные недочеты, если они не
   мешают архитектурному смыслу.

Input guardrail:
- Если документ пустой, является спамом, оскорблением или нерелевантен ML System
  Design, не оценивай чеклист.
- В таком случае верни JSON с "relevant": false и пустым списком "items": [].
- Для релевантного документа верни "relevant": true и оценки по чеклисту.

Ответ должен быть валидным JSON, совместимым со схемой:
{
  "relevant": true,
  "items": [
    {"item_id": 1, "score": 0.5, "remark": "Короткое замечание или вопрос"}
  ]
}
Верни только JSON-объект: без markdown, без пояснений, без ```json и без
закрывающих ```. Первый символ ответа должен быть {, последний — }.
"""

USER_PROMPT_TEMPLATE = Template(
    """\
Checklist version: {{ checklist.version }}

Critic checklist:
{% for item in checklist.items -%}
ID {{ item.id }} | section: {{ item.section }} | Bi={{ item.block_weight }} |
Qi={{ item.question_weight }} | B_T_F={{ item.b_flag }} | Q_T_F={{ item.q_flag }}
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
