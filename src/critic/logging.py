import logging
from pathlib import Path

LOGGER_NAME = "critic"


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
