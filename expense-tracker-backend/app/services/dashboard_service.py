"""Dashboard service layer.

Provides aggregation and analytics business logic for financial dashboards.
All operations are scoped to authenticated users and use SQLAlchemy for efficient
aggregation queries.

Example:
    Get financial summary for a user:
        summary = get_summary(db, user_id=1)
    
    Get monthly trends:
        trends = get_trends(db, user_id=1)
    
    Get expense by category:
        categories = get_categories(db, user_id=1)
    
    Get recent transactions:
        transactions = get_recent_transactions(db, user_id=1, limit=10)
"""

from datetime import datetime, timezone, timedelta
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from app.models.expense_models import Expense
from app.models.income_models import Income
from app.models.category_models import Category
from app.schemas.dashboard import (
    SummaryResponse,
    TrendsResponse,
    MonthlyTrend,
    CategoriesResponse,
    CategoryExpense,
    RecentTransactionsResponse,
    Transaction,
)


def _get_current_month_bounds() -> tuple[datetime, datetime]:
    """Get start and end datetime for current month.
    
    Returns:
        (month_start, month_end) in UTC
    """
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1)
    month_end = month_end - timedelta(seconds=1)
    return month_start, month_end


def _get_previous_month_bounds() -> tuple[datetime, datetime]:
    """Get start and end datetime for previous month.
    
    Returns:
        (month_start, month_end) in UTC
    """
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_end = month_start - timedelta(seconds=1)
    prev_month_start = prev_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return prev_month_start, prev_month_end


def _get_total_income(db: Session, user_id: int) -> float:
    """Get total income for user (all time)."""
    result = db.query(func.sum(Income.amount)).filter(Income.user_id == user_id).scalar()
    return float(result) if result else 0.0


def _get_total_expense(db: Session, user_id: int) -> float:
    """Get total expense for user (all time)."""
    result = db.query(func.sum(Expense.amount)).filter(Expense.user_id == user_id).scalar()
    return float(result) if result else 0.0


def _get_monthly_income(db: Session, user_id: int, month_start: datetime, month_end: datetime) -> float:
    """Get total income for user in a specific month."""
    result = (
        db.query(func.sum(Income.amount))
        .filter(
            Income.user_id == user_id,
            Income.date >= month_start,
            Income.date <= month_end,
        )
        .scalar()
    )
    return float(result) if result else 0.0


def _get_monthly_expense(db: Session, user_id: int, month_start: datetime, month_end: datetime) -> float:
    """Get total expense for user in a specific month."""
    result = (
        db.query(func.sum(Expense.amount))
        .filter(
            Expense.user_id == user_id,
            Expense.date >= month_start,
            Expense.date <= month_end,
        )
        .scalar()
    )
    return float(result) if result else 0.0


def get_summary(db: Session, user_id: int) -> SummaryResponse:
    """Get financial summary.
    
    Args:
        db: SQLAlchemy database session
        user_id: User ID to filter data
    
    Returns:
        SummaryResponse with totals
    """
    total_income = _get_total_income(db, user_id)
    total_expense = _get_total_expense(db, user_id)
    total_balance = total_income - total_expense
    
    current_month_start, current_month_end = _get_current_month_bounds()
    current_income = _get_monthly_income(db, user_id, current_month_start, current_month_end)
    current_expense = _get_monthly_expense(db, user_id, current_month_start, current_month_end)
    monthly_savings = current_income - current_expense
    
    return SummaryResponse(
        total_income=total_income,
        total_expense=total_expense,
        total_balance=total_balance,
        monthly_savings=monthly_savings,
    )


def get_trends(db: Session, user_id: int, months_limit: int = 12) -> TrendsResponse:
    """Get monthly income and expense trends.
    
    Args:
        db: SQLAlchemy database session
        user_id: User ID to filter data
        months_limit: Number of months to return (default 12)
    
    Returns:
        TrendsResponse with monthly breakdown
    """
    from sqlalchemy import and_
    
    income_records = (
        db.query(
            extract('year', Income.date).label('year'),
            extract('month', Income.date).label('month'),
            func.sum(Income.amount).label('total'),
        )
        .filter(Income.user_id == user_id)
        .group_by(
            extract('year', Income.date),
            extract('month', Income.date),
        )
        .order_by(
            extract('year', Income.date),
            extract('month', Income.date),
        )
        .all()
    )
    
    expense_records = (
        db.query(
            extract('year', Expense.date).label('year'),
            extract('month', Expense.date).label('month'),
            func.sum(Expense.amount).label('total'),
        )
        .filter(Expense.user_id == user_id)
        .group_by(
            extract('year', Expense.date),
            extract('month', Expense.date),
        )
        .order_by(
            extract('year', Expense.date),
            extract('month', Expense.date),
        )
        .all()
    )
    
    monthly_data = {}
    
    for year, month, total in income_records:
        month_key = f"{int(year):04d}-{int(month):02d}"
        if month_key not in monthly_data:
            monthly_data[month_key] = {"income": 0.0, "expense": 0.0}
        monthly_data[month_key]["income"] = float(total) if total else 0.0
    
    for year, month, total in expense_records:
        month_key = f"{int(year):04d}-{int(month):02d}"
        if month_key not in monthly_data:
            monthly_data[month_key] = {"income": 0.0, "expense": 0.0}
        monthly_data[month_key]["expense"] = float(total) if total else 0.0
    
    trends = []
    for month_key in sorted(monthly_data.keys()):
        data = monthly_data[month_key]
        trends.append(
            MonthlyTrend(
                month=month_key,
                total_income=data["income"],
                total_expense=data["expense"],
                balance=data["income"] - data["expense"],
            )
        )
    
    trends = trends[-months_limit:]
    
    return TrendsResponse(trends=trends)


def get_categories(db: Session, user_id: int) -> CategoriesResponse:
    """Get total expense grouped by category (highest first).
    
    Args:
        db: SQLAlchemy database session
        user_id: User ID to filter data
    
    Returns:
        CategoriesResponse with expense by category
    """
    results = (
        db.query(
            Category.name.label('category_name'),
            func.sum(Expense.amount).label('total_expense'),
        )
        .join(Expense, Expense.category_id == Category.id)
        .filter(
            Expense.user_id == user_id,
            Category.type == 'expense',
        )
        .group_by(Category.id, Category.name)
        .order_by(func.sum(Expense.amount).desc())
        .all()
    )
    
    categories = [
        CategoryExpense(
            category_name=result.category_name,
            total_expense=float(result.total_expense) if result.total_expense else 0.0,
        )
        for result in results
    ]
    
    return CategoriesResponse(categories=categories)


def get_recent_transactions(db: Session, user_id: int, skip: int = 0, limit: int = 10) -> RecentTransactionsResponse:
    """Get recent income + expense transactions combined with pagination.
    
    Args:
        db: SQLAlchemy database session
        user_id: User ID to filter data
        skip: Number of transactions to skip (default 0)
        limit: Maximum number of transactions to return (default 10)
    
    Returns:
        RecentTransactionsResponse with paginated transactions
    """
    transactions = []
    
    expenses = (
        db.query(
            Expense.id,
            Expense.description.label('title'),
            Expense.amount,
            Category.name.label('category'),
            Expense.date,
        )
        .join(Category, Expense.category_id == Category.id)
        .filter(Expense.user_id == user_id)
        .order_by(Expense.date.desc())
        .all()
    )
    
    incomes = (
        db.query(
            Income.id,
            Income.source.label('title'),
            Income.amount,
            Category.name.label('category'),
            Income.date,
        )
        .join(Category, Income.category_id == Category.id)
        .filter(Income.user_id == user_id)
        .order_by(Income.date.desc())
        .all()
    )
    
    for exp in expenses:
        transactions.append(
            Transaction(
                id=exp.id,
                title=exp.title or "Expense",
                amount=float(exp.amount),
                category=exp.category,
                type="expense",
                date=exp.date,
            )
        )
    
    for inc in incomes:
        transactions.append(
            Transaction(
                id=inc.id,
                title=inc.title or "Income",
                amount=float(inc.amount),
                category=inc.category,
                type="income",
                date=inc.date,
            )
        )
    
    transactions.sort(key=lambda t: t.date, reverse=True)
    
    total_transactions = len(transactions)
    paginated_transactions = transactions[skip : skip + limit]
    total_pages = max(1, (total_transactions + limit - 1) // limit) if total_transactions else 0
    current_page = (skip // limit) + 1 if total_transactions else 0
    has_previous = skip > 0
    has_next = skip + limit < total_transactions
    
    return RecentTransactionsResponse(
        transactions=paginated_transactions,
        total=total_transactions,
        skip=skip,
        limit=limit,
        has_previous=has_previous,
        has_next=has_next,
        current_page=current_page,
        total_pages=total_pages,
    )
