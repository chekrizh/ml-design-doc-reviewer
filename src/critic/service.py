import logging

from critic.config import Settings
from critic.domain.checklist import Checklist, load_default_checklist
from critic.domain.critique import ReviewResult
from critic.domain.document import DesignDocumentInput, render_design_document_for_prompt
from critic.llm.base import LLMClient
from critic.llm.openai_client import OpenAILLMClient
from critic.logging import InferenceLogger, JsonlInferenceLogger, configure_file_logging
from critic.pipeline.base import Pipeline, ReviewContext
from critic.pipeline.critic import CriticStage
from critic.pipeline.ranker import RankerStage


class ReviewService:
    def __init__(
        self,
        *,
        llm_client: LLMClient,
        checklist: Checklist,
        model: str,
        top_n: int,
        logger: logging.Logger | None = None,
        inference_logger: InferenceLogger | None = None,
    ) -> None:
        self._checklist = checklist
        self._model = model
        self._top_n = top_n
        self._logger = logger or logging.getLogger("critic")
        self._inference_logger = inference_logger
        self._pipeline = Pipeline([CriticStage(llm_client), RankerStage()])

    async def review(self, document: DesignDocumentInput) -> ReviewResult:
        document_for_prompt = render_design_document_for_prompt(document)
        self._logger.info(
            "review_started model=%s checklist_version=%s document_length=%d top_n=%d",
            self._model,
            self._checklist.version,
            len(document_for_prompt),
            self._top_n,
        )
        context = ReviewContext(
            document=document_for_prompt,
            checklist=self._checklist,
            model=self._model,
            top_n=self._top_n,
        )
        try:
            result_context = await self._pipeline.run(context)
            result = ReviewResult(
                relevant=result_context.relevant,
                message=result_context.message,
                notes=result_context.notes,
                checklist_version=self._checklist.version,
                model=self._model,
            )
            self._logger.info(
                "review_completed model=%s relevant=%s notes_count=%d llm_duration_ms=%s",
                self._model,
                result.relevant,
                len(result.notes),
                result_context.llm_duration_ms,
            )
            if self._inference_logger is not None:
                self._inference_logger.write(
                    input_document=document,
                    critic_output=result_context.critic_output,
                    top_n_notes=result_context.notes,
                    final_result=result,
                    top_n=self._top_n,
                    llm_duration_ms=result_context.llm_duration_ms,
                )
            return result
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
                include_input_snapshot=settings.log_input_snapshot,
            ),
        )
