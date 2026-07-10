import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from critic.domain.critique import CriticOutput, RankedNote, ReviewResult

LOGGER_NAME = "critic"
INFERENCE_LOG_SCHEMA_VERSION = "critic-inference-log-v2"
SNAPSHOT_DIR_NAME = "snapshots"


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


class JsonlInferenceLogger:
    def __init__(self, log_file: Path) -> None:
        self._log_file = log_file

    def write(
        self,
        *,
        inference_id: str,
        input_document: str,
        critic_output: CriticOutput | None,
        top_n_notes: list[RankedNote],
        final_result: ReviewResult,
        top_n: int,
        llm_duration_ms: int | None,
    ) -> str:
        snapshot_ref = self._write_snapshot(inference_id, input_document)
        return self._persist(
            inference_id,
            {
                "model": final_result.model,
                "checklist_version": final_result.checklist_version,
                "top_n": top_n,
                "timings": {"llm_duration_ms": llm_duration_ms},
                "input": _input_log_entry(input_document, snapshot_ref),
                "critic_output": critic_output.model_dump(mode="json") if critic_output else None,
                "top_n_notes": [note.model_dump(mode="json") for note in top_n_notes],
                "final_result": final_result.model_dump(mode="json"),
            },
        )

    def write_failure(
        self,
        *,
        inference_id: str,
        input_document: str,
        critic_output: CriticOutput | None,
        model: str,
        checklist_version: str,
        top_n: int,
        llm_duration_ms: int | None,
        error: Exception,
    ) -> str:
        snapshot_ref = self._write_snapshot(inference_id, input_document)
        return self._persist(
            inference_id,
            {
                "status": "failed",
                "model": model,
                "checklist_version": checklist_version,
                "top_n": top_n,
                "timings": {"llm_duration_ms": llm_duration_ms},
                "input": _input_log_entry(input_document, snapshot_ref),
                "critic_output": critic_output.model_dump(mode="json") if critic_output else None,
                "top_n_notes": [],
                "final_result": None,
                "error": {"type": type(error).__name__, "message": str(error)},
            },
        )

    def _write_snapshot(self, inference_id: str, document: str) -> str:
        # The full document lives in a sidecar file so that inference.jsonl stays
        # small and greppable. The jsonl only keeps a relative reference.
        snapshot_dir = self._log_file.parent / SNAPSHOT_DIR_NAME
        snapshot_dir.mkdir(parents=True, exist_ok=True)
        snapshot_path = snapshot_dir / f"{inference_id}.md"
        snapshot_path.write_text(document, encoding="utf-8")
        return f"{SNAPSHOT_DIR_NAME}/{inference_id}.md"

    def _persist(self, inference_id: str, record: dict) -> str:
        self._log_file.parent.mkdir(parents=True, exist_ok=True)
        # TODO(design-doc): add document/version lineage when partial snapshots
        # and dataset accumulation are introduced. For now this is a run id.
        entry = {
            "schema_version": INFERENCE_LOG_SCHEMA_VERSION,
            "inference_id": inference_id,
            "created_at": datetime.now(UTC).isoformat(),
            **record,
        }
        with self._log_file.open("a", encoding="utf-8") as file:
            file.write(json.dumps(entry, ensure_ascii=False) + "\n")
        return inference_id


def _input_log_entry(document: str, snapshot_ref: str) -> dict[str, object]:
    # The baseline treats the submitted file as the current document snapshot.
    # Snapshot metadata such as parent document id and completion percent is future work.
    return {
        "kind": "text",
        "document_length": len(document),
        "snapshot_ref": snapshot_ref,
    }


def new_inference_id() -> str:
    return str(uuid4())
