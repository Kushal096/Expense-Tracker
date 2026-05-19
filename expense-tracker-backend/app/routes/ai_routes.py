"""AI-powered financial assistant API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.financial_assistant_service import FinancialAIAssistantService
from app.db.database import get_db
from app.dependencies.auth_dependencies import extract_user_id, get_current_user
from app.schemas.ai_schema import (
    AIChatRequest,
    AIChatResponse,
    AIInsightsResponse,
    FinancialInsightsRequest,
)

router = APIRouter(prefix="/ai", tags=["ai"])
_service = FinancialAIAssistantService()


@router.post(
    "/financial-insights",
    response_model=AIInsightsResponse,
    summary="Generate AI financial insights",
    description="Returns AI-generated summary, insights, and recommendations based on existing analytics.",
)
async def generate_financial_insights(
    request: FinancialInsightsRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> AIInsightsResponse:
    """Generate an AI analysis of the user's financial analytics."""

    user_id = extract_user_id(current_user)
    return await _service.generate_financial_insights(db, user_id, request.period)


@router.post(
    "/chat",
    response_model=AIChatResponse,
    summary="Chat with the financial assistant",
    description="Conversational AI assistant for finance-focused guidance using analytics context.",
)
async def chat_with_financial_assistant(
    request: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> AIChatResponse:
    """Chat with the AI assistant using the user's current financial context."""

    user_id = extract_user_id(current_user)
    return await _service.chat(db, user_id, request)
