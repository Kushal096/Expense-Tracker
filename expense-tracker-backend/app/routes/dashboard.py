"""Dashboard routes.

All dashboard endpoints are protected and require:
`Authorization: Bearer <access_token>`.

Provides analytics and financial insights including:
- Summary of totals and monthly savings
- Monthly trends (income vs expense)
- Expense distribution by category
- Recent transaction history
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.dependencies.auth_dependencies import get_current_user, extract_user_id
from app.schemas.dashboard import (
    SummaryResponse,
    TrendsResponse,
    CategoriesResponse,
    RecentTransactionsResponse,
)
from app.schemas.analytics_schema import FinancialScore
from app.services.dashboard_service import (
    get_summary,
    get_trends,
    get_categories,
    get_recent_transactions,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get(
    "/summary",
    response_model=SummaryResponse,
    summary="Get financial summary",
    description="Returns current month income/expense/balance and cumulative savings from all previous months.",
)
def read_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> SummaryResponse:
    """Fetch financial summary for the current user.
    
    Includes:
    - Current month income, expense, and balance
    - Total savings up to the previous month
    """
    user_id = extract_user_id(current_user)
    return get_summary(db, user_id)


@router.get(
    "/trends",
    response_model=TrendsResponse,
    summary="Get monthly trends",
    description="Returns monthly income and expense data for the last 12 months.",
)
def read_trends(
    months: int = Query(12, ge=1, le=60),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TrendsResponse:
    """Fetch monthly income/expense trends for the current user.
    
    Useful for charting income vs expense over time.
    
    Query Parameters:
    - months: Number of months to return (default 12, max 60)
    """
    user_id = extract_user_id(current_user)
    return get_trends(db, user_id, months_limit=months)


@router.get(
    "/categories",
    response_model=CategoriesResponse,
    summary="Get expense by category",
    description="Returns total expense grouped by category, sorted by highest amount first.",
)
def read_categories(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> CategoriesResponse:
    """Fetch expense distribution by category for the current user.
    
    Useful for pie chart visualization of spending by category.
    """
    user_id = extract_user_id(current_user)
    return get_categories(db, user_id)


@router.get(
    "/recent-transactions",
    response_model=RecentTransactionsResponse,
    summary="Get recent transactions",
    description="Returns the latest income and expense records combined, newest first.",
)
def read_recent_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> RecentTransactionsResponse:
    """Fetch recent transactions (income + expenses) for the current user with pagination.
    
    Query Parameters:
    - skip: Number of transactions to skip (default 0)
    - limit: Number of transactions to return (default 10, max 100)
    """
    user_id = extract_user_id(current_user)
    return get_recent_transactions(db, user_id, skip=skip, limit=limit)

@router.get(
    "/insights",
    response_model=FinancialScore,
    summary="Get financial insights",
    description="Returns AI-generated insights and recommendations based on financial score."
)
def read_insights(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> FinancialScore:
    """Fetch financial insights for the current user.
    
    Includes:
    - Overall financial health score (0-100)
    - Component scores (savings rate, expense stability, budget adherence, income stability)
    - Key insights about financial health
    - Actionable recommendations for improvement
    """
    user_id = extract_user_id(current_user)
    return AnalyticsService.get_financial_score(db, user_id)