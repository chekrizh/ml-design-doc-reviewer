import logging

from critic.config import Settings
from critic.domain.checklist import Checklist, load_default_checklist
from critic.domain.critique import ReviewResult
from critic.llm.base import LLMClient
from critic.llm.openai_client import OpenAILLMClient
from critic.logging import configure_file_logging
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
    ) -> None:
        self._checklist = checklist
        self._model = model
        self._top_n = top_n
        self._logger = logger or logging.getLogger("critic")
        self._pipeline = Pipeline([CriticStage(llm_client), RankerStage()])

    async def review(self, document: str) -> ReviewResult:
        self._logger.info(
            "review_started model=%s checklist_version=%s document_length=%d top_n=%d",
            self._model,
            self._checklist.version,
            len(document),
            self._top_n,
        )
        context = ReviewContext(
            document=document,
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
                "review_completed model=%s relevant=%s notes_count=%d",
                self._model,
                result.relevant,
                len(result.notes),
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
        )
