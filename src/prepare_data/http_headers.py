"""HTTP request headers tuned for specific article hosts."""

from __future__ import annotations

from urllib.parse import urlparse

MEDIUM_HOST = "medium.com"


def is_medium_url(url: str) -> bool:
    return MEDIUM_HOST in urlparse(url).netloc.lower()


def request_headers_for_url(url: str) -> dict[str, str]:
    if is_medium_url(url):
        return {
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0"
            ),
            "Alt-Used": "medium.com",
        }
    return {
        "User-Agent": "Mozilla/5.0 (compatible; MLDesignDocReviewer/0.1; +dataset-prep)",
    }
