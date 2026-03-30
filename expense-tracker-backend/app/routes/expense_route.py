"""Expense routes.

All expense endpoints are protected and require:
`Authorization: Bearer <access_token>`.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.expense_schema import ExpenseBase, ExpenseResponse
from app.services.expense_service import (
    create_expense,
    get_expenses_by_user,
    get_expense_by_id,
    update_expense,
    delete_expense,
)
from app.db.database import get_db
from app.dependencies.auth_dependencies import get_current_user

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _extract_user_id(current_user: dict) -> int:
    """Extract user id from decoded JWT payload or raise 401."""
    user_id = current_user.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    return int(user_id)

@router.get(
    "/",
    response_model=list[ExpenseResponse],
    summary="Get all expenses for current user",
    description="Returns a list of all expenses for the authenticated user.",
)
def read_expenses(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Fetch all expenses for the current user."""
    return get_expenses_by_user(db, _extract_user_id(current_user))


@router.post(
    "/",
    response_model=ExpenseResponse,
    summary="Create a new expense",
    description="Creates a new expense record for the authenticated user.",
)
def create_new_expense(
    expense: ExpenseBase,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new expense and return the created entity."""
    return create_expense(db, expense, _extract_user_id(current_user))

@router.patch(
    "/{expense_id}",
    response_model=ExpenseResponse,
    summary="Update an expense",
    description="Updates an existing expense record by ID for the authenticated user.",
)
def update_existing_expense(
    expense_id: int,
    expense: ExpenseBase,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update an existing expense and return the updated entity."""
    updated_expense = update_expense(
        db,
        expense_id,
        expense,
        _extract_user_id(current_user),
    )
    if not updated_expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found"
        )
    return updated_expense


@router.delete(
    "/{expense_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete an expense",
    description="Deletes an existing expense record by ID for the authenticated user.",
)
def delete_existing_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete an existing expense and return confirmation message."""
    success = delete_expense(db, expense_id, _extract_user_id(current_user))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found"
        )
    return {"detail": "Expense deleted successfully"}


@router.get(
    "/{expense_id}",
    response_model=ExpenseResponse,
    summary="Get expense by ID",
    description="Returns a single expense record by ID for the authenticated user.",
)
def read_expense_by_id(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Fetch a single expense by ID for the current user."""
    expense = get_expense_by_id(db, expense_id, _extract_user_id(current_user))
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found"
        )
    return expense


