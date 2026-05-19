"""Reusable asynchronous Ollama integration."""

from __future__ import annotations

import logging
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.core.ai_settings import get_ai_settings

logger = logging.getLogger(__name__)


class OllamaServiceError(RuntimeError):
    """Raised when the Ollama backend cannot be reached or returns invalid data."""


class OllamaService:
    """Async client wrapper for local Ollama generation APIs."""

    def __init__(self) -> None:
        self.settings = get_ai_settings()

    def _build_payload(
        self,
        prompt: str,
        *,
        model: str | None = None,
        temperature: float | None = None,
        stream: bool = False,
    ) -> dict[str, Any]:
        return {
            "model": model or self.settings.default_model,
            "prompt": prompt,
            "stream": stream,
            "format": "json",
            "options": {
                "temperature": temperature if temperature is not None else self.settings.temperature,
            },
        }

    def _post_with_retries(
        self,
        payload: dict[str, Any],
        *,
        timeout: float | None = None,
    ) -> requests.Response:
        max_retries = self.settings.max_retries
        base_delay = self.settings.retry_delay_seconds
        request_timeout = timeout or self.settings.timeout_seconds
        url = f"{self.settings.base_url.rstrip('/')}/api/generate"

        session = requests.Session()
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=base_delay,
            status_forcelist=[408, 429, 500, 502, 503, 504],
            allowed_methods=["POST"],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        last_error: Exception | None = None

        for attempt in range(max_retries + 1):
            try:
                response = session.post(url, json=payload, timeout=request_timeout)
                response.raise_for_status()
                session.close()
                return response
            except (requests.Timeout, requests.RequestException, requests.HTTPError) as exc:
                last_error = exc
                logger.warning(
                    "Ollama request failed on attempt %s/%s: %s",
                    attempt + 1,
                    max_retries + 1,
                    exc,
                )
                if attempt >= max_retries:
                    break

        session.close()
        raise OllamaServiceError("Unable to reach local Ollama service.") from last_error

    async def generate_response(
        self,
        prompt: str,
        *,
        model: str | None = None,
        temperature: float | None = None,
        timeout: float | None = None,
        stream: bool = False,
    ) -> str:
        """Generate a single non-streaming response from Ollama."""

        if stream:
            raise NotImplementedError("Streaming responses are reserved for future use.")

        payload = self._build_payload(prompt, model=model, temperature=temperature, stream=False)
        response = self._post_with_retries(payload, timeout=timeout)
        data = response.json()
        return str(data.get("response", "")).strip()
