"""High-level AI assistant orchestration for financial insights and chat."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.ai.context_builder import FinancialContextBuilder
from app.ai.ollama_service import OllamaService
from app.ai.prompts import AIPrompts
from app.ai.response_parser import AIResponseParser
from app.core.ai_settings import get_ai_settings
from app.schemas.ai_schema import AIChatRequest, AIChatResponse, AIInsightsResponse, FinancialAIContext


class FinancialAIAssistantService:
    """Coordinates analytics context, prompt generation, and Ollama responses."""

    def __init__(self, ollama_service: OllamaService | None = None) -> None:
        self.ollama_service = ollama_service or OllamaService()
        self.settings = get_ai_settings()

    @staticmethod
    def _trim_history(history: list[dict[str, str]], max_messages: int) -> list[dict[str, str]]:
        if max_messages <= 0:
            return []
        return history[-max_messages:]

    async def generate_financial_insights(
        self,
        db: Session,
        user_id: int,
        period: str = "monthly",
    ) -> AIInsightsResponse:
        """Generate AI-powered financial summary, insights, and recommendations."""

        context = FinancialContextBuilder.build_context(db, user_id, period)
        prompt = AIPrompts.build_financial_insights_prompt(context)
        raw = await self.ollama_service.generate_response(
            prompt,
            model=self.settings.default_model,
            temperature=self.settings.temperature,
            timeout=self.settings.timeout_seconds,
        )
        parsed = AIResponseParser.parse_financial_insights(raw)
        return parsed

    async def chat(
        self,
        db: Session,
        user_id: int,
        request: AIChatRequest,
    ) -> AIChatResponse:
        """Generate a conversational finance-focused answer."""

        context = FinancialContextBuilder.build_context(db, user_id)
        # Add current message to history and keep last max_history_messages
        history_with_current = [item.model_dump() for item in request.history]
        history_with_current.append({"role": "user", "content": request.message})
        trimmed_history = self._trim_history(
            history_with_current,
            self.settings.max_history_messages,
        )
        prompt = AIPrompts.build_chat_prompt(
            context=context,
            user_message=request.message,
            history=trimmed_history,
            conversation_id=request.conversation_id,
        )

        raw = await self.ollama_service.generate_response(
            prompt,
            model=self.settings.default_model,
            temperature=self.settings.temperature,
            timeout=self.settings.timeout_seconds,
        )
        parsed = AIResponseParser.parse_chat_response(raw)
        return parsed
