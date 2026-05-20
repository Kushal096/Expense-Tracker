"""Income routes.

All income endpoints are protected and require:
`Authorization: Bearer <access_token>`.

Endpoints:
    GET /incomes/ - List all incomes for current user
    POST /incomes/ - Create a new income
    GET /incomes/{income_id} - Get an income by ID
    PATCH /incomes/{income_id} - Update an income
    DELETE /incomes/{income_id} - Delete an income
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.income_schema import IncomeCreate, IncomeResponse
from app.services.income_service import (
    create_income,
    get_incomes_by_user,
    get_income_by_id,
    update_income,
    delete_income,
)
from app.db.database import get_db
from app.dependencies.auth_dependencies import get_current_user, extract_user_id

router = APIRouter(prefix="/incomes", tags=["incomes"])


@router.get(
    "/",
    response_model=list[IncomeResponse],
    summary="Get all incomes for current user",
    description="Returns a list of all incomes for the authenticated user.",
)
def read_incomes(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Fetch all incomes for the current user."""
    return get_incomes_by_user(db, extract_user_id(current_user))


@router.post(
    "/",
    response_model=IncomeResponse,
    summary="Create a new income",
    description="Creates a new income record for the authenticated user.",
)
def create_new_income(
    income: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new income and return the created entity."""
    return create_income(db, income, extract_user_id(current_user))


@router.patch(
    "/{income_id}",
    response_model=IncomeResponse,
    summary="Update an income",
    description="Updates an existing income record by ID for the authenticated user.",
)
def update_existing_income(
    income_id: int,
    income: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update an existing income and return the updated entity."""
    updated_income = update_income(db, income_id, income, extract_user_id(current_user))
    if not updated_income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Income not found"
        )
    return updated_income


# BUG #5: DELETE should return 204_NO_CONTENT, not 200_OK
@router.delete(
    "/{income_id}",
    status_code=status.HTTP_200_OK,  # BUG #5: Should be status.HTTP_204_NO_CONTENT
    summary="Delete an income",
    description="Deletes an existing income record by ID for the authenticated user.",
)
def delete_existing_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete an existing income and return confirmation message."""
    success = delete_income(db, income_id, extract_user_id(current_user))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Income not found"
        )
    return {"detail": "Income deleted successfully"}


@router.get(
    "/{income_id}",
    response_model=IncomeResponse,
    summary="Get an income by ID",
    description="Returns a single income record by ID for the authenticated user.",
)
def read_income_by_id(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Fetch a single income by ID for the current user."""
    income = get_income_by_id(db, income_id, extract_user_id(current_user))
    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Income not found"
        )
    return income