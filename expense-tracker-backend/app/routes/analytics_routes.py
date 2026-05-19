"""Advanced analytics API endpoints.

Endpoints for financial insights and dashboard data.

Routes:
    GET /analytics/cashflow - Monthly income vs expenses
    GET /analytics/spending-heatmap - Spending by category
    GET /analytics/financial-score - Financial health score
    GET /analytics/category-analysis/{id} - Deep category analysis
    GET /analytics/dashboard - Complete dashboard overview
    GET /analytics/savings-trends - Savings over time
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.db.database import get_db
from app.dependencies.auth_dependencies import get_current_user, extract_user_id
from app.schemas.analytics_schema import (
    CashflowData,
    SpendingHeatmap,
    FinancialScore,
    CategoryAnalysis,
    DashboardOverview,
    SavingsTrend
)
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "/cashflow",
    response_model=list[CashflowData],
    summary="Get monthly cashflow",
    description="Get monthly income vs expense data"
)
def get_cashflow(
    months: int = Query(3, ge=1, le=36, description="Number of months to include"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get monthly income vs expense cashflow.
    
    Default: Last 3 months
    
    Returns monthly aggregation of:
    - Total income
    - Total expenses
    - Net cashflow (income - expenses)
    - Transaction count
    """
    user_id = extract_user_id(current_user)
    end_date = date.today()
    start_date = end_date - timedelta(days=months * 30)
    
    return AnalyticsService.get_cashflow_analysis(db, user_id, start_date, end_date)


@router.get(
    "/spending-heatmap",
    response_model=list[SpendingHeatmap],
    summary="Get spending by category",
    description="Get spending breakdown by category for current month"
)
def get_spending_heatmap(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get spending heatmap by category.
    
    Shows:
    - Category name and spending
    - Total spent per category
    - Percentage of total spending
    - Average transaction amount
    - Trend (requires historical data)
    
    Default: Current calendar month
    """
    user_id = extract_user_id(current_user)
    return AnalyticsService.get_spending_heatmap(db, user_id)


@router.get(
    "/financial-score",
    response_model=FinancialScore,
    summary="Get financial health score",
    description="Calculate overall financial health score (0-100)"
)
def get_financial_score(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get financial health score.
    
    Evaluates (weighted):
    - Savings rate (40%): Higher income savings ratio
    - Expense stability (30%): Lower spending volatility
    - Budget adherence (20%): Meeting set budgets
    - Income stability (10%): Consistent income
    
    Returns:
    - Overall score (0-100)
    - Component scores
    - Insights (text feedback)
    - Recommendations (actionable items)
    
    Analysis period: Last 3 months
    """
    user_id = extract_user_id(current_user)
    return AnalyticsService.get_financial_score(db, user_id)


@router.get(
    "/category-analysis/{category_id}",
    response_model=CategoryAnalysis,
    summary="Deep category analysis",
    description="Detailed spending analysis for a specific category"
)
def get_category_analysis(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Deep analysis of spending in a category.
    
    Shows:
    - Total spent and transaction count
    - Average, min, max transaction amounts
    - Standard deviation (volatility)
    - Monthly breakdown
    - Trend analysis
    
    Default: Last 3 months
    """
    user_id = extract_user_id(current_user)
    return AnalyticsService.get_category_analysis(db, user_id, category_id)


@router.get(
    "/dashboard",
    response_model=DashboardOverview,
    summary="Complete dashboard overview",
    description="Get comprehensive financial dashboard for user"
)
def get_dashboard(
    period: str = Query("monthly", pattern="^(monthly|quarterly|yearly)$", description="Analysis period"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get complete dashboard overview.
    
    Combines:
    - Key metrics (income, expenses, savings)
    - Financial score
    - Category breakdown
    - Budget status
    - Trends
    
    Useful for dashboard rendering on frontend.
    
    Parameters:
    - period: monthly (this month), quarterly (this quarter), yearly (this year)
    """
    user_id = extract_user_id(current_user)
    return AnalyticsService.get_dashboard_overview(db, user_id, period)


@router.get(
    "/savings-trends",
    response_model=list[SavingsTrend],
    summary="Get savings trends",
    description="Get savings and savings rate over time"
)
def get_savings_trends(
    months: int = Query(12, ge=1, le=60, description="Number of months to include"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get savings trends over time.
    
    Shows monthly:
    - Savings amount (income - expenses)
    - Savings rate (savings as % of income)
    - Cumulative savings (running total)
    
    Useful for visualizing savings patterns.
    Default: Last 12 months
    """
    user_id = extract_user_id(current_user)
    return AnalyticsService.get_savings_trends(db, user_id, months)


# Additional detailed endpoints for specific analytics

@router.get(
    "/monthly-summary",
    summary="Get monthly summary statistics",
    description="Get key statistics for a specific month"
)
def get_monthly_summary(
    month: int = Query(None, ge=1, le=12, description="Month (1-12), defaults to current"),
    year: int = Query(None, description="Year, defaults to current"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get summary statistics for a specific month.
    
    Returns:
    - Total income and expenses
    - Budget status
    - Category breakdown
    - Key metrics
    """
    from datetime import date
    if not month or not year:
        today = date.today()
        month = month or today.month
        year = year or today.year
    
    user_id = extract_user_id(current_user)
    
    # Create date range for the month
    if month == 12:
        start_date = date(year, 12, 1)
        end_date = date(year + 1, 1, 1)
    else:
        start_date = date(year, month, 1)
        end_date = date(year, month + 1, 1)
    end_date = min(end_date - timedelta(days=1), date.today())
    
    cashflow = AnalyticsService.get_cashflow_analysis(db, user_id, start_date, end_date)
    spending = AnalyticsService.get_spending_heatmap(db, user_id, start_date, end_date)
    
    return {
        "month": month,
        "year": year,
        "cashflow": cashflow,
        "spending_breakdown": spending
    }
