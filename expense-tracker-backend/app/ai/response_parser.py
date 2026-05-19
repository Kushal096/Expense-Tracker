"""Helpers for parsing and validating Ollama responses."""

from __future__ import annotations

import json
import logging
from typing import Any

from app.schemas.ai_schema import AIChatResponse, AIInsightsResponse

logger = logging.getLogger(__name__)


class AIResponseParser:
    """Parse model output into validated response schemas."""

    @staticmethod
    def _normalize_list(value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str):
            parts = [part.strip("-• \t\r\n") for part in value.splitlines()]
            return [part for part in parts if part]
        return [str(value).strip()] if str(value).strip() else []

    @staticmethod
    def _strip_code_fences(text: str) -> str:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.lstrip("`")
            if "\n" in cleaned:
                cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
        return cleaned.strip()

    @classmethod
    def _extract_json_object(cls, text: str) -> dict[str, Any]:
        cleaned = cls._strip_code_fences(text)

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        decoder = json.JSONDecoder()
        for start in range(len(cleaned)):
            if cleaned[start] not in "{[":
                continue
            try:
                parsed, _ = decoder.raw_decode(cleaned[start:])
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                continue

        logger.debug("Unable to parse JSON from AI output. Returning empty object.")
        return {}

    @classmethod
    def parse_financial_insights(cls, text: str) -> AIInsightsResponse:
        payload = cls._extract_json_object(text)
        summary = str(payload.get("summary", "")).strip()
        insights = cls._normalize_list(payload.get("insights"))
        recommendations = cls._normalize_list(payload.get("recommendations"))

        if not summary:
            summary = "Financial insights are temporarily unavailable. Review your score and top spending categories for guidance."

        return AIInsightsResponse(
            summary=summary,
            insights=insights,
            recommendations=recommendations,
        )

    @classmethod
    def parse_chat_response(cls, text: str) -> AIChatResponse:
        payload = cls._extract_json_object(text)
        print(payload)
        response = str(payload.get("response", "")).strip()
        if not response:
            response = cls._strip_code_fences(text).strip()
        if not response:
            response = "I could not generate a live AI response right now, but I can still help you review your income, expenses, savings rate, and budget usage."
        return AIChatResponse(response=response)
