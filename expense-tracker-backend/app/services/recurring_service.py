"""Recurring transaction service layer.

Provides business logic for recurring transaction management
and automatic transaction generation.
"""

from datetime import datetime, date, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from fastapi import HTTPException, status

from app.models.recurring_transaction_models import RecurringTransaction, RecurringLog
from app.models.category_models import Category
from app.models.expense_models import Expense
from app.models.income_models import Income
from app.schemas.recurring_schema import (
    RecurringTransactionCreate,
    RecurringTransactionUpdate,
    RecurringTransactionResponse,
    RecurringLogResponse,
    RecurringGenerationResponse
)
from app.services.base_crud_service import BaseCRUDService


_crud_service = BaseCRUDService(RecurringTransaction, RecurringTransactionResponse)


def create_recurring(
    db: Session,
    recurring_data: RecurringTransactionCreate,
    user_id: int
) -> RecurringTransactionResponse:
    """Create a new recurring transaction template.
    
    Args:
        db: Database session
        recurring_data: Recurring transaction data
        user_id: User creating the recurring
    
    Returns:
        Created recurring transaction response
    
    Raises:
        HTTPException(400): If category not found/invalid
    """
    # Validate category if provided
    if recurring_data.category_id:
        category = db.query(Category).filter(
            Category.id == recurring_data.category_id
        ).first()
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found"
            )
    
    # Create recurring
    recurring = _crud_service.create(db, recurring_data, user_id)
    
    # Compute next generation date
    recurring_obj = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == recurring.id
    ).first()
    
    return _enrich_recurring_response(db, recurring_obj)


def get_recurring_by_user(
    db: Session,
    user_id: int,
    active_only: bool = False
) -> list[RecurringTransactionResponse]:
    """Get all recurring transactions for a user.
    
    Args:
        db: Database session
        user_id: User to fetch for
        active_only: Filter to active only
    
    Returns:
        List of recurring transaction responses
    """
    query = db.query(RecurringTransaction).filter(RecurringTransaction.user_id == user_id)
    
    if active_only:
        query = query.filter(RecurringTransaction.is_active == True)
    
    recurrings = query.all()
    
    return [_enrich_recurring_response(db, r) for r in recurrings]


def get_recurring_by_id(
    db: Session,
    recurring_id: int,
    user_id: int
) -> RecurringTransactionResponse | None:
    """Get specific recurring transaction.
    
    Args:
        db: Database session
        recurring_id: Recurring to fetch
        user_id: Must own the recurring
    
    Returns:
        Recurring response or None
    """
    recurring = db.query(RecurringTransaction).filter(
        and_(RecurringTransaction.id == recurring_id, RecurringTransaction.user_id == user_id)
    ).first()
    
    if not recurring:
        return None
    
    return _enrich_recurring_response(db, recurring)


def update_recurring(
    db: Session,
    recurring_id: int,
    recurring_data: RecurringTransactionUpdate,
    user_id: int
) -> RecurringTransactionResponse | None:
    """Update recurring transaction.
    
    Args:
        db: Database session
        recurring_id: Recurring to update
        recurring_data: Update payload
        user_id: Must own the recurring
    
    Returns:
        Updated recurring response or None
    """
    recurring = db.query(RecurringTransaction).filter(
        and_(RecurringTransaction.id == recurring_id, RecurringTransaction.user_id == user_id)
    ).first()
    
    if not recurring:
        return None
    
    # Update fields if provided
    update_data = recurring_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(recurring, field, value)
    
    db.commit()
    db.refresh(recurring)
    
    return _enrich_recurring_response(db, recurring)


def delete_recurring(db: Session, recurring_id: int, user_id: int) -> bool:
    """Delete recurring transaction.
    
    Args:
        db: Database session
        recurring_id: Recurring to delete
        user_id: Must own the recurring
    
    Returns:
        True if deleted, False if not found
    """
    recurring = db.query(RecurringTransaction).filter(
        and_(RecurringTransaction.id == recurring_id, RecurringTransaction.user_id == user_id)
    ).first()
    
    if not recurring:
        return False
    
    db.delete(recurring)
    db.commit()
    return True


def get_pending_recurring(db: Session) -> list[RecurringTransaction]:
    """Get all recurring transactions that should be generated today.
    
    Returns:
        List of pending recurring transactions
    
    Performance:
        - Checks last_generated_at to avoid duplicates
        - Respects end_date expiration
        - Only returns active recurrings
    """
    recurrings = db.query(RecurringTransaction).filter(
        RecurringTransaction.is_active == True
    ).all()
    
    pending = [r for r in recurrings if r.should_generate_today()]
    return pending


def generate_recurring_transactions(
    db: Session,
    recurring_ids: list[int] | None = None,
    force: bool = False
) -> RecurringGenerationResponse:
    """Generate transactions from recurring templates.
    
    Can target specific recurrings or all pending ones.
    Updates last_generated_at to prevent duplicates.
    Creates audit logs for all operations.
    
    Args:
        db: Database session
        recurring_ids: Specific recurring IDs to generate (None = all pending)
        force: Force generation even if already generated today
    
    Returns:
        Generation response with counts and logs
    
    Algorithm:
        1. Get pending recurring transactions
        2. For each recurring:
            - Calculate transaction date (start_date + offset based on frequency)
            - Create Expense or Income record
            - Update last_generated_at
            - Log success/failure
        3. Return summary with counts
    """
    now = datetime.now(timezone.utc)
    generated_count = 0
    failed_count = 0
    skipped_count = 0
    errors = []
    logs = []
    
    # Get recurrings to process
    if recurring_ids:
        recurrings = db.query(RecurringTransaction).filter(
            RecurringTransaction.id.in_(recurring_ids)
        ).all()
    else:
        recurrings = get_pending_recurring(db)
    
    for recurring in recurrings:
        try:
            # Check if should generate (unless forced)
            if not force and recurring.last_generated_at:
                last_date = recurring.last_generated_at.date()
                today = date.today()
                
                if recurring.frequency == "daily" and last_date >= today:
                    skipped_count += 1
                    continue
                elif recurring.frequency == "weekly" and (today - last_date).days < 7:
                    skipped_count += 1
                    continue
                elif recurring.frequency == "monthly" and last_date.month == today.month and last_date.year == today.year:
                    skipped_count += 1
                    continue
                elif recurring.frequency == "yearly" and last_date.year == today.year:
                    skipped_count += 1
                    continue
            
            # Calculate transaction date
            if recurring.last_generated_at:
                transaction_date = recurring.last_generated_at.date() + timedelta(days=_get_frequency_days(recurring.frequency))
            else:
                transaction_date = date.today()
            
            # Create transaction record based on type
            if recurring.type == "expense":
                transaction = Expense(
                    user_id=recurring.user_id,
                    amount=recurring.amount,
                    date=datetime.combine(transaction_date, datetime.min.time()),
                    description=recurring.title,
                    category_id=recurring.category_id
                )
                db.add(transaction)
                db.flush()
                transaction_id = transaction.id
                transaction_type = "expense"
            else:  # income
                transaction = Income(
                    user_id=recurring.user_id,
                    amount=recurring.amount,
                    date=datetime.combine(transaction_date, datetime.min.time()),
                    source=recurring.title,
                    category_id=recurring.category_id
                )
                db.add(transaction)
                db.flush()
                transaction_id = transaction.id
                transaction_type = "income"
            
            # Update last_generated_at
            recurring.last_generated_at = now
            
            # Log success
            log = RecurringLog(
                recurring_transaction_id=recurring.id,
                generated_transaction_id=transaction_id,
                transaction_type=transaction_type,
                status="success"
            )
            db.add(log)
            generated_count += 1
            logs.append(log)
            
        except Exception as e:
            failed_count += 1
            error_msg = str(e)
            errors.append(f"Recurring {recurring.id}: {error_msg}")
            
            # Log failure
            log = RecurringLog(
                recurring_transaction_id=recurring.id,
                status="failed",
                error_message=error_msg
            )
            db.add(log)
            logs.append(log)
    
    db.commit()
    
    # Convert logs to response objects
    log_responses = [
        RecurringLogResponse(
            id=log.id,
            recurring_transaction_id=log.recurring_transaction_id,
            generated_transaction_id=log.generated_transaction_id,
            transaction_type=log.transaction_type,
            generated_at=log.generated_at,
            status=log.status,
            error_message=log.error_message
        )
        for log in logs
    ]
    
    return RecurringGenerationResponse(
        generated_count=generated_count,
        failed_count=failed_count,
        skipped_count=skipped_count,
        errors=errors,
        logs=log_responses
    )


def _enrich_recurring_response(db: Session, recurring: RecurringTransaction) -> RecurringTransactionResponse:
    """Add computed fields to recurring response.
    
    Computes:
    - next_generation_date
    - is_ended
    """
    next_gen_date = None
    if recurring.is_active and recurring.start_date <= date.today():
        if recurring.last_generated_at:
            next_gen_date = recurring.last_generated_at.date() + timedelta(days=_get_frequency_days(recurring.frequency))
        else:
            next_gen_date = date.today()
    
    is_ended = bool(
    recurring.end_date and date.today() > recurring.end_date
    )
    
    return RecurringTransactionResponse(
        id=recurring.id,
        user_id=recurring.user_id,
        type=recurring.type,
        amount=recurring.amount,
        title=recurring.title,
        description=recurring.description,
        category_id=recurring.category_id,
        frequency=recurring.frequency,
        start_date=recurring.start_date,
        end_date=recurring.end_date,
        last_generated_at=recurring.last_generated_at,
        is_active=recurring.is_active,
        created_at=recurring.created_at,
        updated_at=recurring.updated_at,
        next_generation_date=next_gen_date,
        is_ended=is_ended
    )


def _get_frequency_days(frequency: str) -> int:
    """Get number of days for frequency type.
    
    Used for calculating next generation date.
    """
    if frequency == "daily":
        return 1
    elif frequency == "weekly":
        return 7
    elif frequency == "monthly":
        return 30  # Approximate
    elif frequency == "yearly":
        return 365
    return 1
