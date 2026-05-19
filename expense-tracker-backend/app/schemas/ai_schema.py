"""Pydantic schemas for AI-powered financial assistant features."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict

from app.schemas.analytics_schema import CashflowData, SavingsTrend


class ChatHistoryMessage(BaseModel):
    """A single historical chat message."""

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class FinancialInsightsRequest(BaseModel):
    """Request body for AI financial insights generation."""

    period: Literal["monthly", "quarterly", "yearly"] = Field(default="monthly")


class AIChatRequest(BaseModel):
    """Request body for conversational AI assistance."""

    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatHistoryMessage] = Field(default_factory=list)
    conversation_id: str | None = Field(default=None, max_length=120)


class AIInsightsResponse(BaseModel):
    """Structured AI insights response."""

    summary: str = Field(min_length=1)
    insights: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class AIChatResponse(BaseModel):
    """Structured AI chat response."""

    response: str = Field(min_length=1)


class AIContextTopCategory(BaseModel):
    """Top category spending summary used in the AI context."""

    category_id: int
    category_name: str
    total_spent: float
    transaction_count: int
    percentage_of_total: float
    average_transaction: float
    trend: str


class AIContextRecentExpense(BaseModel):
    """Recent expense entry included in AI context."""

    id: int
    amount: float
    date: datetime
    description: str | None = None
    category_name: str | None = None


class AIContextRecentIncome(BaseModel):
    """Recent income entry included in AI context."""

    id: int
    amount: float
    date: datetime
    source: str
    category_name: str | None = None


class AIContextBudgetSnapshot(BaseModel):
    """Budget coverage summary for AI context."""

    total_budgets: int
    over_budget: int
    on_track: int
    total_limit: float
    total_spent: float
    overall_utilization_percentage: float


class AIContextRecurringSnapshot(BaseModel):
    """Recurring transaction summary for AI context."""

    total_recurring: int
    active_recurring: int
    income_recurring: int
    expense_recurring: int
    ending_within_30_days: int


class AIContextProjectSnapshot(BaseModel):
    """Project-wide financial data snapshot beyond dashboard analytics."""

    total_expense_transactions: int
    total_income_transactions: int
    distinct_expense_categories_used: int
    distinct_income_categories_used: int
    recent_expenses: list[AIContextRecentExpense] = Field(default_factory=list)
    recent_incomes: list[AIContextRecentIncome] = Field(default_factory=list)
    budget_snapshot: AIContextBudgetSnapshot
    recurring_snapshot: AIContextRecurringSnapshot


class FinancialAIContext(BaseModel):
    """Compact, AI-readable snapshot of a user's financial state."""

    model_config = ConfigDict(from_attributes=True)

    user_id: int
    period: str
    generated_at: datetime

    score: int
    savings_rate_score: int
    budget_adherence_score: int
    expense_stability_score: int
    income_stability_score: int

    total_income: float
    total_expenses: float
    monthly_savings: float
    savings_rate: float
    average_daily_spending: float
    average_transaction_amount: float

    budgets_met: int
    budgets_exceeded: int
    budget_utilization_percentage: float

    top_categories: list[AIContextTopCategory] = Field(default_factory=list)
    cashflow: list[CashflowData] = Field(default_factory=list)
    savings_trends: list[SavingsTrend] = Field(default_factory=list)
    project_modules: list[str] = Field(default_factory=list)
    project_snapshot: AIContextProjectSnapshot | None = None

    baseline_insights: list[str] = Field(default_factory=list)
    baseline_recommendations: list[str] = Field(default_factory=list)


class AIResponseEnvelope(BaseModel):
    """Internal parsing envelope for AI responses."""

    summary: str | None = None
    response: str | None = None
    insights: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
