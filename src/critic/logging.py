import base64
import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from critic.domain.critique import CriticOutput, RankedNote, ReviewResult
from critic.image_parsing import ImageToReview

LOGGER_NAME = "critic"
INFERENCE_LOG_SCHEMA_VERSION = "critic-inference-log-v2"
SNAPSHOT_DIR_NAME = "snapshots"
SNAPSHOT_IMAGES_DIR_PREFIX = f"{SNAPSHOT_DIR_NAME}/images"


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
        input_images: list[ImageToReview] | None,
        critic_output: CriticOutput | None,
        top_n_notes: list[RankedNote],
        final_result: ReviewResult,
        top_n: int,
        llm_duration_ms: int | None,
    ) -> str:
        return self._persist(
            inference_id,
            self._record(
                inference_id=inference_id,
                input_document=input_document,
                input_images=input_images,
                model=final_result.model,
                checklist_version=final_result.checklist_version,
                top_n=top_n,
                llm_duration_ms=llm_duration_ms,
                critic_output=critic_output,
                top_n_notes=top_n_notes,
                final_result=final_result,
            ),
        )

    def write_failure(
        self,
        *,
        inference_id: str,
        input_document: str,
        input_images: list[ImageToReview] | None,
        critic_output: CriticOutput | None,
        model: str,
        checklist_version: str,
        top_n: int,
        llm_duration_ms: int | None,
        error: Exception,
    ) -> str:
        return self._persist(
            inference_id,
            self._record(
                inference_id=inference_id,
                input_document=input_document,
                input_images=input_images,
                model=model,
                checklist_version=checklist_version,
                top_n=top_n,
                llm_duration_ms=llm_duration_ms,
                critic_output=critic_output,
                top_n_notes=[],
                final_result=None,
                status="failed",
                error=error,
            ),
        )

    def _record(
        self,
        *,
        inference_id: str,
        input_document: str,
        input_images: list[ImageToReview] | None,
        model: str,
        checklist_version: str,
        top_n: int,
        llm_duration_ms: int | None,
        critic_output: CriticOutput | None,
        top_n_notes: list[RankedNote],
        final_result: ReviewResult | None,
        status: str | None = None,
        error: Exception | None = None,
    ) -> dict:
        snapshot_document_ref, snapshot_images_dir = self._write_snapshot(
            inference_id, input_document, input_images
        )
        record: dict = {}
        if status is not None:
            record["status"] = status
        record.update(
            {
                "model": model,
                "checklist_version": checklist_version,
                "top_n": top_n,
                "timings": {"llm_duration_ms": llm_duration_ms},
                "input": _input_log_entry(
                    input_document, snapshot_document_ref, snapshot_images_dir
                ),
                "critic_output": critic_output.model_dump(mode="json") if critic_output else None,
                "top_n_notes": [note.model_dump(mode="json") for note in top_n_notes],
                "final_result": final_result.model_dump(mode="json") if final_result else None,
            }
        )
        if error is not None:
            record["error"] = {"type": type(error).__name__, "message": str(error)}
        return record

    def _write_snapshot(
        self, inference_id: str, document: str, images: list[ImageToReview] | None
    ) -> tuple[str, str | None]:
        # The full document lives in a sidecar file so that inference.jsonl stays
        # small and greppable. The jsonl only keeps a relative reference.
        snapshot_dir = self._log_file.parent / SNAPSHOT_DIR_NAME
        snapshot_dir.mkdir(parents=True, exist_ok=True)
        snapshot_path = snapshot_dir / f"{inference_id}.md"
        snapshot_path.write_text(document, encoding="utf-8")

        # TODO: Currently images are stored in folder alongside the document file for backward
        # compatibility. Consider making snapshot a separate directory for document, images and
        # other potential stuff.
        snapshot_images_dir_ref = None
        if images:
            snapshot_images_dir_ref = f"{SNAPSHOT_IMAGES_DIR_PREFIX}-{inference_id}"
            snapshot_images_dir = self._log_file.parent / snapshot_images_dir_ref
            snapshot_images_dir.mkdir(parents=True, exist_ok=True)
            for image in images:
                bytes_ = base64.b64decode(image.b64content.encode())
                image_path = snapshot_images_dir / f"{image.label}{image.suffix}"
                image_path.write_bytes(bytes_)

        return f"{SNAPSHOT_DIR_NAME}/{inference_id}.md", snapshot_images_dir_ref

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


def _input_log_entry(
    document: str, snapshot_ref: str, snapshot_images_dir: str | None
) -> dict[str, object]:
    # The baseline treats the submitted file as the current document snapshot.
    # Snapshot metadata such as parent document id and completion percent is future work.
    data = {
        "kind": "text",
        "document_length": len(document),
        "snapshot_ref": snapshot_ref,
    }
    if snapshot_images_dir:
        data["snapshot_images_dir"] = snapshot_images_dir

    return data


def new_inference_id() -> str:
    return str(uuid4())
