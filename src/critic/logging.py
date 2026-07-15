import base64
import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from critic.domain.critique import CriticOutput, RankedNote, ReviewResult
from critic.image_parsing import ImageToReview

LOGGER_NAME = "critic"
INFERENCE_LOG_SCHEMA_VERSION = "critic-inference-log-v3"
SNAPSHOT_MANIFEST_VERSION = "snapshot-manifest-v1"
SNAPSHOT_MANIFEST_FILENAME = "manifest.json"
SNAPSHOTS_DIR_NAME = "snapshots"
SNAPSHOT_IMAGES_DIR_NAME = "images"


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
        snapshot_dir = self._write_snapshot(inference_id, input_document, input_images)
        record: dict = {}
        if status is not None:
            record["status"] = status
        record.update(
            {
                "model": model,
                "checklist_version": checklist_version,
                "top_n": top_n,
                "timings": {"llm_duration_ms": llm_duration_ms},
                "input_snapshot_dir": str(snapshot_dir.relative_to(self._log_file.parent)),
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
    ) -> Path:
        snapshot_manifest: dict[str, Any] = {"version": SNAPSHOT_MANIFEST_VERSION}

        # The full document lives in a sidecar file so that inference.jsonl stays
        # small and greppable. The jsonl only keeps a relative reference.
        snapshot_dir = self._log_file.parent / SNAPSHOTS_DIR_NAME / inference_id
        snapshot_dir.mkdir(parents=True, exist_ok=True)

        snapshot_document_path = snapshot_dir / f"{inference_id}.md"
        snapshot_document_path.write_text(document, encoding="utf-8")
        snapshot_manifest["document_length"] = len(document)
        snapshot_manifest["document_ref"] = snapshot_document_path.name

        if images:
            snapshot_images_dir = snapshot_dir / SNAPSHOT_IMAGES_DIR_NAME
            snapshot_images_dir.mkdir(parents=True, exist_ok=True)
            snapshot_manifest["images"] = []
            for index, image in enumerate(images, start=1):
                bytes_ = base64.b64decode(image.b64content.encode())
                image_path = snapshot_images_dir / f"image_{index}{image.suffix}"
                image_path.write_bytes(bytes_)

                local_path = str(
                    "padding_that_will_be_removed_to_satisfy_metadata_path_format"
                    / Path(*image_path.parts[-2:])
                )
                snapshot_manifest["images"].append(
                    {"alt_text": image.alt_text, "local_path": local_path}
                )

            snapshot_manifest["image_count"] = len(images)
        with open(snapshot_dir / SNAPSHOT_MANIFEST_FILENAME, "w", encoding="utf-8") as f:
            json.dump(snapshot_manifest, f, indent=2)

        return snapshot_dir

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


def new_inference_id() -> str:
    return str(uuid4())
