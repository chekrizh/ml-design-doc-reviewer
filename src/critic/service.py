import logging

from critic.config import Settings
from critic.domain.checklist import Checklist, load_default_checklist
from critic.domain.critic_validation import CriticOutputValidationError
from critic.domain.critique import (
    IRRELEVANT_DOCUMENT_MESSAGE,
    CriticOutput,
    RankedNote,
    ReviewResult,
)
from critic.llm.base import LLMClient
from critic.llm.openai_client import OpenAILLMClient
from critic.logging import (
    LOGGER_NAME,
    JsonlInferenceLogger,
    configure_file_logging,
    new_inference_id,
)
from critic.ranker import rank_notes
from critic.reviewer import CriticResult, critique


class ReviewService:
    def __init__(
        self,
        *,
        llm_client: LLMClient,
        checklist: Checklist,
        model: str,
        top_n: int,
        logger: logging.Logger | None = None,
        inference_logger: JsonlInferenceLogger | None = None,
    ) -> None:
        self._llm_client = llm_client
        self._checklist = checklist
        self._model = model
        self._top_n = top_n
        self._logger = logger or logging.getLogger(LOGGER_NAME)
        self._inference_logger = inference_logger

    async def review(self, document: str) -> ReviewResult:
        inference_id = new_inference_id()
        self._log_started(inference_id, document)
        try:
            critic_result = await critique(self._llm_client, self._checklist, document)
        except CriticOutputValidationError as exc:
            self._log_review_failed(inference_id)
            self._log_failure(inference_id, document, exc)
            raise
        except Exception:
            self._log_review_failed(inference_id)
            raise

        notes = rank_notes(critic_result.output, self._checklist, top_n=self._top_n)
        result = self._build_result(critic_result.output, notes)
        self._log_completed(inference_id, result, critic_result.llm_duration_ms)
        self._log_inference(inference_id, document, critic_result, notes, result)
        return result

    def _build_result(self, output: CriticOutput, notes: list[RankedNote]) -> ReviewResult:
        # TODO(design-doc): include the full checklist score in ReviewResult
        # when online Progression Delta metrics are introduced.
        return ReviewResult(
            relevant=output.relevant,
            message=None if output.relevant else IRRELEVANT_DOCUMENT_MESSAGE,
            notes=notes,
            checklist_version=self._checklist.version,
            model=self._model,
        )

    def _log_started(self, inference_id: str, document: str) -> None:
        self._logger.info(
            "review_started inference_id=%s model=%s checklist_version=%s "
            "document_length=%d top_n=%d",
            inference_id,
            self._model,
            self._checklist.version,
            len(document),
            self._top_n,
        )

    def _log_completed(self, inference_id: str, result: ReviewResult, llm_duration_ms: int) -> None:
        self._logger.info(
            "review_completed inference_id=%s model=%s relevant=%s notes_count=%d "
            "llm_duration_ms=%s",
            inference_id,
            self._model,
            result.relevant,
            len(result.notes),
            llm_duration_ms,
        )

    def _log_review_failed(self, inference_id: str) -> None:
        self._logger.exception("review_failed inference_id=%s model=%s", inference_id, self._model)

    def _log_inference(
        self,
        inference_id: str,
        document: str,
        critic_result: CriticResult,
        notes: list[RankedNote],
        result: ReviewResult,
    ) -> None:
        if self._inference_logger is None:
            return
        # Baseline writes raw inference records only. Turning these logs
        # into a curated real dataset is a separate offline pipeline.
        try:
            self._inference_logger.write(
                inference_id=inference_id,
                input_document=document,
                critic_output=critic_result.output,
                top_n_notes=notes,
                final_result=result,
                top_n=self._top_n,
                llm_duration_ms=critic_result.llm_duration_ms,
            )
        except OSError as exc:
            self._logger.warning(
                "inference_log_failed inference_id=%s model=%s error=%s",
                inference_id,
                self._model,
                exc,
                exc_info=True,
            )

    def _log_failure(
        self, inference_id: str, document: str, exc: CriticOutputValidationError
    ) -> None:
        if self._inference_logger is None:
            return
        try:
            self._inference_logger.write_failure(
                inference_id=inference_id,
                input_document=document,
                critic_output=exc.critic_output,
                model=self._model,
                checklist_version=self._checklist.version,
                top_n=self._top_n,
                llm_duration_ms=exc.llm_duration_ms,
                error=exc,
            )
        except OSError as log_exc:
            self._logger.warning(
                "inference_failure_log_failed inference_id=%s model=%s error=%s",
                inference_id,
                self._model,
                log_exc,
                exc_info=True,
            )

    @classmethod
    def from_settings(cls, settings: Settings) -> "ReviewService":
        checklist = (
            Checklist.load(settings.checklist_path)
            if settings.checklist_path is not None
            else load_default_checklist()
        )
        llm_client = OpenAILLMClient(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.model,
        )
        inference_logger = (
            JsonlInferenceLogger(settings.inference_log_file)
            if settings.inference_log_file is not None
            else None
        )
        return cls(
            llm_client=llm_client,
            checklist=checklist,
            model=settings.model,
            top_n=settings.top_n,
            logger=configure_file_logging(settings.log_file),
            inference_logger=inference_logger,
        )
