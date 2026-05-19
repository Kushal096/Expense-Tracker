"""Analytics schemas for dashboard data.

Pydantic schemas for analytics endpoints.
Provides aggregated financial insights.
"""

from datetime import datetime, date
from pydantic import BaseModel, Field


class CashflowData(BaseModel):
    """Monthly income vs expense cashflow data."""
    
    month: int = Field(description="Month (1-12)")
    year: int = Field(description="Year")
    month_name: str = Field(description="Human-readable month name")
    total_income: float = Field(default=0.0)
    total_expenses: float = Field(default=0.0)
    net_cashflow: float = Field(description="income - expenses (can be negative)")
    transaction_count: int = Field(default=0)


class SavingsTrend(BaseModel):
    """Savings trend over time."""
    
    month: int
    year: int
    month_name: str
    savings: float = Field(description="Amount saved (income - expenses)")
    savings_rate: float = Field(description="Savings as % of income")
    cumulative_savings: float = Field(description="Running total from start date")


class SpendingHeatmap(BaseModel):
    """Spending by category."""
    
    category_id: int
    category_name: str
    total_spent: float
    transaction_count: int
    percentage_of_total: float
    average_transaction: float
    trend: str = Field(description="up|down|stable")


class FinancialScore(BaseModel):
    """Overall financial health score (0-100)."""
    
    score: int = Field(ge=0, le=100, description="Overall score")
    savings_rate_score: int = Field(ge=0, le=100)
    budget_adherence_score: int = Field(ge=0, le=100)
    expense_stability_score: int = Field(ge=0, le=100)
    income_stability_score: int = Field(ge=0, le=100)
    
    insights: list[str] = Field(description="Key insights about financial health")
    recommendations: list[str] = Field(description="Recommendations for improvement")


class CategoryAnalysis(BaseModel):
    """Deep analysis of a single category."""
    
    category_id: int
    category_name: str
    total_spent: float
    transaction_count: int
    average_transaction: float
    min_transaction: float
    max_transaction: float
    stddev: float = Field(description="Standard deviation of transactions")
    
    monthly_breakdown: list[dict] = Field(description="Month-by-month breakdown")
    trend: str = Field(description="up|down|stable")
    budget_allocation: float | None = Field(description="% of total budget if budgeted")


class DashboardOverview(BaseModel):
    """Complete dashboard overview for a period."""
    
    period: str = Field(description="Monthly, quarterly, yearly, or custom")
    start_date: date
    end_date: date
    
    # Key metrics
    total_income: float
    total_expenses: float
    net_savings: float
    savings_rate: float = Field(description="% of income saved")
    
    # Averages
    average_daily_spending: float
    average_transaction_amount: float
    
    # Counts
    total_transactions: int
    expense_transactions: int
    income_transactions: int
    
    # Top categories
    top_expense_categories: list[SpendingHeatmap] = Field(max_items=5)
    top_income_sources: list[dict] = Field(max_items=5)
    
    # Financial health
    financial_score: FinancialScore
    
    # Budgets
    budgets_met: int
    budgets_exceeded: int
    budget_utilization_percentage: float


class AnalyticsQueryParams(BaseModel):
    """Parameters for analytics queries."""
    
    start_date: date | None = Field(None)
    end_date: date | None = Field(None)
    category_id: int | None = Field(None)
    comparison_period: str | None = Field(None, description="month|quarter|year")
