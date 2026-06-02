import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol
from uuid import uuid4

from critic.domain.critique import CriticOutput, RankedNote, ReviewResult
from critic.domain.document import (
    PROVISIONAL_JSON_INPUT_CONTRACT_STATUS,
    DesignDocumentInput,
    build_input_log_entry,
)

LOGGER_NAME = "critic"
INFERENCE_LOG_SCHEMA_VERSION = "critic-inference-log-v1"


def configure_file_logging(log_file: Path) -> logging.Logger:
    log_file.parent.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger(LOGGER_NAME)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    resolved_path = log_file.resolve()
    if not _has_file_handler(logger, resolved_path):
        handler = logging.FileHandler(resolved_path, encoding="utf-8")
        handler.setLevel(logging.INFO)
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
        logger.addHandler(handler)

    return logger


def _has_file_handler(logger: logging.Logger, log_file: Path) -> bool:
    for handler in logger.handlers:
        if (
            isinstance(handler, logging.FileHandler)
            and Path(handler.baseFilename).resolve() == log_file
        ):
            return True
    return False


class InferenceLogger(Protocol):
    def write(
        self,
        *,
        input_document: DesignDocumentInput,
        critic_output: CriticOutput | None,
        top_n_notes: list[RankedNote],
        final_result: ReviewResult,
        top_n: int,
    ) -> str:
        """Write a structured inference log entry and return its id."""


class JsonlInferenceLogger:
    def __init__(self, log_file: Path, *, include_input_snapshot: bool = True) -> None:
        self._log_file = log_file
        self._include_input_snapshot = include_input_snapshot

    def write(
        self,
        *,
        input_document: DesignDocumentInput,
        critic_output: CriticOutput | None,
        top_n_notes: list[RankedNote],
        final_result: ReviewResult,
        top_n: int,
    ) -> str:
        self._log_file.parent.mkdir(parents=True, exist_ok=True)
        inference_id = str(uuid4())
        record = {
            "schema_version": INFERENCE_LOG_SCHEMA_VERSION,
            "inference_id": inference_id,
            "created_at": datetime.now(UTC).isoformat(),
            "input_contract_status": PROVISIONAL_JSON_INPUT_CONTRACT_STATUS,
            "model": final_result.model,
            "checklist_version": final_result.checklist_version,
            "top_n": top_n,
            "input": build_input_log_entry(
                input_document,
                include_snapshot=self._include_input_snapshot,
            ),
            "critic_output": critic_output.model_dump(mode="json") if critic_output else None,
            "top_n_notes": [note.model_dump(mode="json") for note in top_n_notes],
            "final_result": final_result.model_dump(mode="json"),
        }
        with self._log_file.open("a", encoding="utf-8") as file:
            file.write(json.dumps(record, ensure_ascii=False) + "\n")
        return inference_id
