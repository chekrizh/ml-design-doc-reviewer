from __future__ import annotations

import hashlib
import json
from typing import Any

DesignDocumentInput = str | dict[str, Any] | list[Any]

PROVISIONAL_JSON_INPUT_CONTRACT_STATUS = "provisional_requires_product_alignment"


def render_design_document_for_prompt(document: DesignDocumentInput) -> str:
    if isinstance(document, str):
        return document
    return json.dumps(document, ensure_ascii=False, indent=2, sort_keys=True)


def build_input_log_entry(
    document: DesignDocumentInput,
    *,
    include_snapshot: bool,
) -> dict[str, Any]:
    rendered_document = render_design_document_for_prompt(document)
    entry: dict[str, Any] = {
        "kind": "text" if isinstance(document, str) else "design_doc_json",
        "snapshot": document if include_snapshot else None,
    }
    if not include_snapshot:
        entry.update(
            {
                "redacted": True,
                "document_length": len(rendered_document),
                "document_sha256": hashlib.sha256(rendered_document.encode("utf-8")).hexdigest(),
            }
        )
    return entry
