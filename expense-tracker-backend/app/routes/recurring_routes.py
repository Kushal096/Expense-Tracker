"""Recurring transaction API endpoints.

Endpoints for managing recurring transactions and automatic generation.

Routes:
    POST /recurring-transactions - Create recurring template
    GET /recurring-transactions - List recurring transactions
    GET /recurring-transactions/{id} - Get recurring details
    PATCH /recurring-transactions/{id} - Update recurring
    DELETE /recurring-transactions/{id} - Delete recurring
    POST /recurring-transactions/run - Generate pending transactions
    POST /recurring-transactions/run-manual - Manually generate specific recurring
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth_dependencies import get_current_user, extract_user_id
from app.schemas.recurring_schema import (
    RecurringTransactionCreate,
    RecurringTransactionUpdate,
    RecurringTransactionResponse,
    RecurringGenerationRequest,
    RecurringGenerationResponse
)
from app.services import recurring_service
from app.utils.pagination import PaginatedList

router = APIRouter(prefix="/recurring-transactions", tags=["recurring"])


@router.post(
    "/",
    response_model=RecurringTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create recurring transaction template",
    description="Create a new recurring transaction that will auto-generate"
)
def create_recurring(
    recurring_data: RecurringTransactionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create new recurring transaction.
    
    Supports:
    - Frequencies: daily, weekly, monthly, yearly
    - Types: expense, income
    - Optional end dates for time-limited subscriptions
    
    Example:
        Monthly gym membership ($50):
        {
            "type": "expense",
            "amount": 50,
            "title": "Gym Membership",
            "category_id": 5,
            "frequency": "monthly",
            "start_date": "2026-05-11"
        }
    """
    user_id = extract_user_id(current_user)
    return recurring_service.create_recurring(db, recurring_data, user_id)


@router.get(
    "/",
    response_model=PaginatedList[RecurringTransactionResponse],
    summary="List recurring transactions",
    description="Get all recurring transactions for authenticated user"
)
def list_recurring(
    active_only: bool = Query(False, description="Only active recurring"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List recurring transactions.
    
    Includes computed fields:
    - next_generation_date
    - is_ended
    """
    user_id = extract_user_id(current_user)
    recurrings = recurring_service.get_recurring_by_user(db, user_id, active_only)
    
    # Simple pagination
    paginated = recurrings[(page - 1) * limit:page * limit]
    
    return PaginatedList(
        items=paginated,
        total=len(recurrings),
        page=page,
        limit=limit,
        pages=(len(recurrings) + limit - 1) // limit,
        has_next=page * limit < len(recurrings),
        has_previous=page > 1
    )


@router.get(
    "/{recurring_id}",
    response_model=RecurringTransactionResponse,
    summary="Get recurring transaction",
    description="Get details of a specific recurring transaction"
)
def get_recurring(
    recurring_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get specific recurring transaction details."""
    user_id = extract_user_id(current_user)
    recurring = recurring_service.get_recurring_by_id(db, recurring_id, user_id)
    
    if not recurring:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found"
        )
    
    return recurring


@router.patch(
    "/{recurring_id}",
    response_model=RecurringTransactionResponse,
    summary="Update recurring transaction",
    description="Update recurring transaction settings"
)
def update_recurring(
    recurring_id: int,
    recurring_data: RecurringTransactionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update recurring transaction.
    
    Can update:
    - amount
    - title
    - frequency
    - end_date
    - is_active (pause/unpause)
    """
    user_id = extract_user_id(current_user)
    updated = recurring_service.update_recurring(db, recurring_id, recurring_data, user_id)
    
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found"
        )
    
    return updated


@router.delete(
    "/{recurring_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete recurring transaction",
    description="Delete a recurring transaction template"
)
def delete_recurring(
    recurring_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete recurring transaction.
    
    Note: Does NOT delete already-generated transactions.
    Only deletes the recurring template.
    """
    user_id = extract_user_id(current_user)
    deleted = recurring_service.delete_recurring(db, recurring_id, user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found"
        )
    
    return None


@router.post(
    "/run",
    response_model=RecurringGenerationResponse,
    summary="Generate pending recurring transactions",
    description="Automatically generate transactions from active recurring templates"
)
def run_recurring_generation(
    request: RecurringGenerationRequest | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate pending recurring transactions.
    
    Typically called by:
    1. APScheduler job (automated)
    2. Manual API call (admin/testing)
    
    Features:
    - Prevents duplicate generation with last_generated_at tracking
    - Respects frequency (daily/weekly/monthly/yearly)
    - Skips ended subscriptions
    - Creates audit logs for all operations
    - Can force re-generation if needed
    
    Example response:
    {
        "generated_count": 3,
        "failed_count": 0,
        "skipped_count": 2,
        "errors": [],
        "logs": [...]
    }
    """
    user_id = extract_user_id(current_user)
    
    # Only allow users to generate their own recurring
    # (In production, might restrict to admin only)
    recurring_ids = request.recurring_transaction_ids if request else None
    force = request.force if request else False
    
    return recurring_service.generate_recurring_transactions(db, recurring_ids, force)


# Optional: Manual generation endpoint for testing
@router.post(
    "/run-manual/{recurring_id}",
    response_model=RecurringGenerationResponse,
    summary="Manually generate specific recurring transaction"
)
def run_manual_recurring(
    recurring_id: int,
    force: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Manually generate a specific recurring transaction.
    
    Useful for testing or manual regeneration.
    
    Args:
        recurring_id: Recurring transaction to generate
        force: Force generation even if already generated today
    """
    user_id = extract_user_id(current_user)
    
    # Verify ownership
    recurring = recurring_service.get_recurring_by_id(db, recurring_id, user_id)
    if not recurring:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found"
        )
    
    return recurring_service.generate_recurring_transactions(
        db,
        recurring_ids=[recurring_id],
        force=force
    )
