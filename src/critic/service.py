import logging

from critic.config import Settings
from critic.domain.checklist import Checklist, load_default_checklist
from critic.domain.critic_validation import CriticOutputValidationError
from critic.domain.critique import IRRELEVANT_DOCUMENT_MESSAGE, ReviewResult
from critic.llm.base import LLMClient
from critic.llm.openai_client import OpenAILLMClient
from critic.logging import LOGGER_NAME, JsonlInferenceLogger, configure_file_logging
from critic.ranker import rank_notes
from critic.reviewer import critique


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
        self._logger.info(
            "review_started model=%s checklist_version=%s document_length=%d top_n=%d",
            self._model,
            self._checklist.version,
            len(document),
            self._top_n,
        )
        try:
            critic_result = await critique(self._llm_client, self._checklist, document)
            notes = rank_notes(critic_result.output, self._checklist, top_n=self._top_n)
            # TODO(design-doc): include the full checklist score in ReviewResult
            # when online Progression Delta metrics are introduced.
            result = ReviewResult(
                relevant=critic_result.output.relevant,
                message=None if critic_result.output.relevant else IRRELEVANT_DOCUMENT_MESSAGE,
                notes=notes,
                checklist_version=self._checklist.version,
                model=self._model,
            )
            self._logger.info(
                "review_completed model=%s relevant=%s notes_count=%d llm_duration_ms=%s",
                self._model,
                result.relevant,
                len(result.notes),
                critic_result.llm_duration_ms,
            )
            if self._inference_logger is not None:
                # Baseline writes raw inference records only. Turning these logs
                # into a curated real dataset is a separate offline pipeline.
                try:
                    self._inference_logger.write(
                        input_document=document,
                        critic_output=critic_result.output,
                        top_n_notes=notes,
                        final_result=result,
                        top_n=self._top_n,
                        llm_duration_ms=critic_result.llm_duration_ms,
                    )
                except OSError as exc:
                    self._logger.warning(
                        "inference_log_failed model=%s error=%s",
                        self._model,
                        exc,
                        exc_info=True,
                    )
            return result
        except CriticOutputValidationError as exc:
            self._logger.exception("review_failed model=%s", self._model)
            if self._inference_logger is not None:
                self._inference_logger.write_failure(
                    input_document=document,
                    critic_output=exc.critic_output,
                    model=self._model,
                    checklist_version=self._checklist.version,
                    top_n=self._top_n,
                    llm_duration_ms=exc.llm_duration_ms,
                    error=exc,
                )
            raise
        except Exception:
            self._logger.exception("review_failed model=%s", self._model)
            raise

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
        return cls(
            llm_client=llm_client,
            checklist=checklist,
            model=settings.model,
            top_n=settings.top_n,
            logger=configure_file_logging(settings.log_file),
            inference_logger=JsonlInferenceLogger(
                settings.inference_log_file,
            ),
        )
