"""Budget service layer.

Provides business logic for budget management.
Handles budget CRUD, spending tracking, and overspending detection.
"""

from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from fastapi import HTTPException, status

from app.models.budget_models import Budget, BudgetAlert
from app.models.category_models import Category
from app.models.expense_models import Expense
from app.schemas.budget_schema import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetSummary
from app.services.base_crud_service import BaseCRUDService


# Initialize CRUD service
_crud_service = BaseCRUDService(Budget, BudgetResponse)


def create_budget(db: Session, budget_data: BudgetCreate, user_id: int) -> BudgetResponse:
    """Create a new budget for user.
    
    Enforces unique constraint: one budget per (user, category, month, year).
    
    Args:
        db: Database session
        budget_data: Budget creation payload
        user_id: User creating the budget
    
    Returns:
        Created budget response
    
    Raises:
        HTTPException(409): If budget already exists for this period
        HTTPException(400): If category not found
    """
    # Check if budget already exists for this month/year/category
    existing = db.query(Budget).filter(
        and_(
            Budget.user_id == user_id,
            Budget.category_id == budget_data.category_id,
            Budget.month == budget_data.month,
            Budget.year == budget_data.year
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Budget for {budget_data.month}/{budget_data.year} already exists for this category"
        )
    
    # Validate category if provided
    if budget_data.category_id:
        category = db.query(Category).filter(
            Category.id == budget_data.category_id,
            Category.id.in_(
                db.query(Category.id).filter(Category.type.in_(["expense", "income"]))
            )
        ).first()
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found"
            )
    
    # Create budget
    return _crud_service.create(db, budget_data, user_id)


def get_budgets_by_user(
    db: Session,
    user_id: int,
    month: int | None = None,
    year: int | None = None
) -> list[BudgetResponse]:
    """Get budgets for a user, optionally filtered by month/year.
    
    Args:
        db: Database session
        user_id: User to fetch budgets for
        month: Optional month filter (1-12)
        year: Optional year filter
    
    Returns:
        List of budget responses
    """
    query = db.query(Budget).filter(Budget.user_id == user_id)
    
    if month:
        query = query.filter(Budget.month == month)
    if year:
        query = query.filter(Budget.year == year)
    
    budgets = query.all()
    
    # Convert to response objects with computed fields
    return [
        BudgetResponse(
            id=b.id,
            user_id=b.user_id,
            category_id=b.category_id,
            limit_amount=b.limit_amount,
            spent_amount=b.spent_amount,
            month=b.month,
            year=b.year,
            created_at=b.created_at,
            updated_at=b.updated_at,
            remaining_amount=b.remaining_amount,
            usage_percentage=b.usage_percentage,
            warning_level=b.warning_level,
            is_over_budget=b.is_over_budget
        )
        for b in budgets
    ]


def get_budget_by_id(db: Session, budget_id: int, user_id: int) -> BudgetResponse | None:
    """Get specific budget if owned by user.
    
    Args:
        db: Database session
        budget_id: Budget to fetch
        user_id: Must own the budget
    
    Returns:
        Budget response or None
    """
    budget = db.query(Budget).filter(
        and_(Budget.id == budget_id, Budget.user_id == user_id)
    ).first()
    
    if not budget:
        return None
    
    return BudgetResponse(
        id=budget.id,
        user_id=budget.user_id,
        category_id=budget.category_id,
        limit_amount=budget.limit_amount,
        spent_amount=budget.spent_amount,
        month=budget.month,
        year=budget.year,
        created_at=budget.created_at,
        updated_at=budget.updated_at,
        remaining_amount=budget.remaining_amount,
        usage_percentage=budget.usage_percentage,
        warning_level=budget.warning_level,
        is_over_budget=budget.is_over_budget
    )


def update_budget(
    db: Session,
    budget_id: int,
    budget_data: BudgetUpdate,
    user_id: int
) -> BudgetResponse | None:
    """Update budget if owned by user.
    
    Args:
        db: Database session
        budget_id: Budget to update
        budget_data: Update payload
        user_id: Must own the budget
    
    Returns:
        Updated budget response or None
    """
    budget = db.query(Budget).filter(
        and_(Budget.id == budget_id, Budget.user_id == user_id)
    ).first()
    
    if not budget:
        return None
    
    # Update fields if provided
    update_data = budget_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(budget, field, value)
    
    db.commit()
    db.refresh(budget)
    
    return BudgetResponse(
        id=budget.id,
        user_id=budget.user_id,
        category_id=budget.category_id,
        limit_amount=budget.limit_amount,
        spent_amount=budget.spent_amount,
        month=budget.month,
        year=budget.year,
        created_at=budget.created_at,
        updated_at=budget.updated_at,
        remaining_amount=budget.remaining_amount,
        usage_percentage=budget.usage_percentage,
        warning_level=budget.warning_level,
        is_over_budget=budget.is_over_budget
    )


def delete_budget(db: Session, budget_id: int, user_id: int) -> bool:
    """Delete budget if owned by user.
    
    Args:
        db: Database session
        budget_id: Budget to delete
        user_id: Must own the budget
    
    Returns:
        True if deleted, False if not found
    """
    budget = db.query(Budget).filter(
        and_(Budget.id == budget_id, Budget.user_id == user_id)
    ).first()
    
    if not budget:
        return False
    
    db.delete(budget)
    db.commit()
    return True


def update_budget_spent_amount(
    db: Session,
    user_id: int,
    month: int,
    year: int,
    category_id: int | None = None
) -> BudgetResponse | None:
    """Recalculate spent_amount for budget based on actual expenses.
    
    Called after creating/updating/deleting expenses.
    Updates both category budget and overall budget.
    
    Args:
        db: Database session
        user_id: Budget owner
        month: Budget month
        year: Budget year
        category_id: Category to update (None = overall budget)
    
    Returns:
        Updated budget response
    """
    # Calculate actual spent from expenses
    end_date = date(year, month, 1)
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)
    
    spent_query = db.query(func.sum(Expense.amount)).filter(
        and_(
            Expense.user_id == user_id,
            Expense.date >= end_date,
            Expense.date < next_month
        )
    )
    
    if category_id:
        spent_query = spent_query.filter(Expense.category_id == category_id)
    
    spent_amount = spent_query.scalar() or 0
    
    # Update budget
    budget = db.query(Budget).filter(
        and_(
            Budget.user_id == user_id,
            Budget.month == month,
            Budget.year == year,
            Budget.category_id == category_id
        )
    ).first()
    
    if budget:
        budget.spent_amount = float(spent_amount)
        db.commit()
        db.refresh(budget)
    
    # Check for overspending alert
    if budget and budget.is_over_budget:
        create_overspending_alert(db, budget.id)
    
    if budget:
        return BudgetResponse(
            id=budget.id,
            user_id=budget.user_id,
            category_id=budget.category_id,
            limit_amount=budget.limit_amount,
            spent_amount=budget.spent_amount,
            month=budget.month,
            year=budget.year,
            created_at=budget.created_at,
            updated_at=budget.updated_at,
            remaining_amount=budget.remaining_amount,
            usage_percentage=budget.usage_percentage,
            warning_level=budget.warning_level,
            is_over_budget=budget.is_over_budget
        )
    
    return None


def get_monthly_budget_summary(
    db: Session,
    user_id: int,
    month: int,
    year: int
) -> BudgetSummary:
    """Get comprehensive budget summary for a month.
    
    Aggregates all budgets and alerts for the month.
    
    Args:
        db: Database session
        user_id: User to summarize
        month: Month (1-12)
        year: Year
    
    Returns:
        Budget summary with all categories and alerts
    """
    budgets = db.query(Budget).filter(
        and_(
            Budget.user_id == user_id,
            Budget.month == month,
            Budget.year == year
        )
    ).all()
    
    budget_responses = []
    total_limit = 0
    total_spent = 0
    overall_budget_id = None
    overall_usage = 0
    
    for budget in budgets:
        response = BudgetResponse(
            id=budget.id,
            user_id=budget.user_id,
            category_id=budget.category_id,
            limit_amount=budget.limit_amount,
            spent_amount=budget.spent_amount,
            month=budget.month,
            year=budget.year,
            created_at=budget.created_at,
            updated_at=budget.updated_at,
            remaining_amount=budget.remaining_amount,
            usage_percentage=budget.usage_percentage,
            warning_level=budget.warning_level,
            is_over_budget=budget.is_over_budget
        )
        
        budget_responses.append(response)
        total_limit += budget.limit_amount
        total_spent += budget.spent_amount
        
        if budget.category_id is None:
            overall_budget_id = budget.id
            overall_usage = budget.usage_percentage
    
    # Get alerts
    alert_ids = [b.id for b in budgets]
    alerts_list = []
    
    if alert_ids:
        db_alerts = db.query(BudgetAlert).filter(BudgetAlert.budget_id.in_(alert_ids)).all()
        for alert in db_alerts:
            budget = next((b for b in budgets if b.id == alert.budget_id), None)
            if budget:
                category_name = budget.category.name if budget.category else "Overall"
                alerts_list.append({
                    'budget_id': alert.budget_id,
                    'category_name': category_name,
                    'alert_type': alert.alert_type,
                    'message': f"{category_name}: Overspending detected",
                    'spent_amount': budget.spent_amount,
                    'limit_amount': budget.limit_amount,
                    'usage_percentage': budget.usage_percentage,
                    'triggered_at': alert.triggered_at
                })
    
    return BudgetSummary(
        month=month,
        year=year,
        total_limit=total_limit,
        total_spent=total_spent,
        total_remaining=total_limit - total_spent,
        overall_budget_id=overall_budget_id,
        overall_usage_percentage=overall_usage,
        category_budgets=budget_responses,
        alerts=alerts_list
    )


def create_overspending_alert(db: Session, budget_id: int):
    """Create overspending alert for budget.
    
    Checks if alert already exists to prevent duplicates.
    
    Args:
        db: Database session
        budget_id: Budget that's overspent
    """
    # Check if alert already exists
    existing = db.query(BudgetAlert).filter(
        and_(
            BudgetAlert.budget_id == budget_id,
            BudgetAlert.alert_type == "overspending",
            BudgetAlert.is_resolved == 0
        )
    ).first()
    
    if not existing:
        alert = BudgetAlert(
            budget_id=budget_id,
            alert_type="overspending",
            is_resolved=0
        )
        db.add(alert)
        db.commit()
