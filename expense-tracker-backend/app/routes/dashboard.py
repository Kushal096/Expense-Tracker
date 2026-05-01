"""Dashboard routes.

All dashboard endpoints are protected and require:
`Authorization: Bearer <access_token>`.

Provides analytics and financial insights including:
- Summary of totals and monthly savings
- Monthly trends (income vs expense)
- Expense distribution by category
- Recent transaction history
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.dependencies.auth_dependencies import get_current_user, extract_user_id
from app.schemas.dashboard import (
    SummaryResponse,
    TrendsResponse,
    CategoriesResponse,
    RecentTransactionsResponse,
)
from app.services.dashboard_service import (
    get_summary,
    get_trends,
    get_categories,
    get_recent_transactions,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get(
    "/summary",
    response_model=SummaryResponse,
    summary="Get financial summary",
    description="Returns total income, expense, balance and monthly savings with month-over-month change percentages.",
)
def read_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> SummaryResponse:
    """Fetch financial summary for the current user.
    
    Includes:
    - All-time totals (income, expense, balance)
    - Current month savings
    - Month-over-month percentage changes
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
    months: int = 12,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TrendsResponse:
    """Fetch monthly income/expense trends for the current user.
    
    Useful for charting income vs expense over time.
    
    Query Parameters:
    - months: Number of months to return (default 12, max 60)
    """
    user_id = extract_user_id(current_user)
    months = min(months, 60)
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
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> RecentTransactionsResponse:
    """Fetch recent transactions (income + expenses) for the current user with pagination.
    
    Query Parameters:
    - skip: Number of transactions to skip (default 0)
    - limit: Number of transactions to return (default 10, max 100)
    """
    user_id = extract_user_id(current_user)
    skip = max(0, skip)
    limit = min(limit, 100)
    return get_recent_transactions(db, user_id, skip=skip, limit=limit)
