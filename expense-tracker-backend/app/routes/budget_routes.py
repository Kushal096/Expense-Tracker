"""Budget API endpoints.

Endpoints for budget management, tracking, and overspending alerts.

Routes:
    POST /budgets - Create budget
    GET /budgets - List budgets for current user
    GET /budgets/summary - Monthly budget summary
    GET /budgets/{id} - Get budget details
    PATCH /budgets/{id} - Update budget
    DELETE /budgets/{id} - Delete budget
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import date

from app.db.database import get_db
from app.dependencies.auth_dependencies import get_current_user, extract_user_id
from app.schemas.budget_schema import (
    BudgetCreate,
    BudgetUpdate,
    BudgetResponse,
    BudgetSummary
)
from app.services import budget_service
from app.utils.pagination import PaginatedList

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.post(
    "/",
    response_model=BudgetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new budget",
    description="Create a budget for the current month/year"
)
def create_budget(
    budget_data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new budget.
    
    One budget per (user, category, month, year) combination.
    Category ID can be NULL for overall budget.
    """
    user_id = extract_user_id(current_user)
    return budget_service.create_budget(db, budget_data, user_id)


@router.get(
    "/",
    response_model=PaginatedList[BudgetResponse],
    summary="List user budgets",
    description="Get all budgets for the authenticated user"
)
def list_budgets(
    month: int | None = Query(None, ge=1, le=12, description="Filter by month"),
    year: int | None = Query(None, description="Filter by year"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List budgets for authenticated user.
    
    Supports filtering by month/year.
    """
    user_id = extract_user_id(current_user)
    budgets = budget_service.get_budgets_by_user(db, user_id, month, year)

    start = (page - 1) * limit
    end = start + limit
    paginated_budgets = budgets[start:end]
    
    return PaginatedList(
        items=paginated_budgets,
        total=len(budgets),
        page=page,
        limit=limit,
        pages=(len(budgets) + limit - 1) // limit,
        has_next=page * limit < len(budgets),
        has_previous=page > 1
    )


@router.get(
    "/summary",
    response_model=BudgetSummary,
    summary="Get monthly budget summary",
    description="Get comprehensive budget summary for a specific month"
)
def get_budget_summary(
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive budget summary.
    
    Includes:
    - All category budgets
    - Total budgets
    - Overspending alerts
    - Usage percentages
    """
    if not month or not year:
        from datetime import date
        today = date.today()
        month = month or today.month
        year = year or today.year
    
    user_id = extract_user_id(current_user)
    return budget_service.get_monthly_budget_summary(db, user_id, month, year)


@router.get(
    "/{budget_id}",
    response_model=BudgetResponse,
    summary="Get budget details",
    description="Get details of a specific budget"
)
def get_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get specific budget details."""
    user_id = extract_user_id(current_user)
    budget = budget_service.get_budget_by_id(db, budget_id, user_id)
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    return budget


@router.patch(
    "/{budget_id}",
    response_model=BudgetResponse,
    summary="Update budget",
    description="Update budget limit amount"
)
def update_budget(
    budget_id: int,
    budget_data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update budget.
    
    Can update:
    - limit_amount
    - category_id
    """
    user_id = extract_user_id(current_user)
    updated = budget_service.update_budget(db, budget_id, budget_data, user_id)
    
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    return updated


@router.delete(
    "/{budget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete budget",
    description="Delete a budget"
)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete budget."""
    user_id = extract_user_id(current_user)
    deleted = budget_service.delete_budget(db, budget_id, user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    return None
