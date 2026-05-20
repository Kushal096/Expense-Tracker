"""Expense service layer.

Provides business logic for expense CRUD operations with user isolation.
All operations enforce user ownership checks to ensure data privacy.

Uses BaseCRUDService for generic CRUD operations and shared category
validation utilities to reduce code duplication.

Example:
    Create an expense for a user:
        expense = create_expense(db, expense_data, user_id=1)
    
    Fetch all expenses for a user:
        expenses = get_expenses_by_user(db, user_id=1)
"""

from datetime import date, datetime

from sqlalchemy.orm import Session
from app.models.expense_models import Expense
from app.schemas.expense_schema import ExpenseBase, ExpenseResponse
from app.services.base_crud_service import BaseCRUDService
from app.core.category_validation import get_valid_category

# Initialize CRUD service for expenses
_crud_service = BaseCRUDService(Expense, ExpenseResponse)


def _extract_month_year(date_value) -> tuple[int, int]:
    if isinstance(date_value, datetime):
        return date_value.month, date_value.year
    if isinstance(date_value, date):
        return date_value.month, date_value.year
    if isinstance(date_value, str):
        parsed = datetime.fromisoformat(date_value[:10]).date()
        return parsed.month, parsed.year

    raise ValueError("Invalid expense date value")


def _refresh_budget_spending(db: Session, user_id: int, month: int, year: int, category_id: int):
    from app.services import budget_service

    budget_service.update_budget_spent_amount(db, user_id, month, year, category_id)
    budget_service.update_budget_spent_amount(db, user_id, month, year, None)


def create_expense(db: Session, expense_data: ExpenseBase, user_id: int) -> ExpenseResponse:
    """Create a new expense record for a user.
    
    Args:
        db: SQLAlchemy database session.
        expense_data: Expense data payload from request (amount, category_id, date, description).
        user_id: ID of the user creating the expense. Used for ownership and isolation.
    
    Returns:
        ExpenseResponse: Created expense object, including auto-generated ID and timestamps.
    
    Raises:
        HTTPException (400) if category is invalid or doesn't exist.
        SQLAlchemy exceptions on database errors (e.g., foreign key violations).
    
    Note:
        - Category is validated before creation.
        - Expense is immediately committed to the database.
        - Timestamps (created_at, updated_at) are set by the database.
    """
    # BUG #4: Missing validation for negative or zero amounts
    # Validate category exists and is of type "expense"
    get_valid_category(db, expense_data.category_id, "expense")
    created_expense = _crud_service.create(db, expense_data, user_id)

    month, year = _extract_month_year(created_expense.date)
    _refresh_budget_spending(db, user_id, month, year, created_expense.category_id)

    return created_expense


def get_expenses_by_user(db: Session, user_id: int) -> list[ExpenseResponse]:
    """Fetch all expenses belonging to a user.
    
    Args:
        db: SQLAlchemy database session.
        user_id: ID of the user whose expenses to retrieve.
    
    Returns:
        list[ExpenseResponse]: List of expense objects. Empty list if user has no expenses.
    
    Note:
        - Query is filtered to ensure user isolation.
        - Results are returned in insertion order.
    """
    return _crud_service.get_all_by_user(db, user_id)


def get_expense_by_id(db: Session, expense_id: int, user_id: int) -> ExpenseResponse | None:
    """Fetch a single expense by ID if it belongs to the user.
    
    Args:
        db: SQLAlchemy database session.
        expense_id: ID of the expense to retrieve.
        user_id: ID of the user who must own the expense.
    
    Returns:
        ExpenseResponse | None: Expense object if found and owned by user, else None.
    
    Note:
        - Returns None if expense does not exist OR does not belong to the user.
        - Maintains user isolation and prevents unauthorized access.
    """
    return _crud_service.get_by_id(db, expense_id, user_id)


def update_expense(
    db: Session, expense_id: int, expense_data: ExpenseBase, user_id: int
) -> ExpenseResponse | None:
    """Update an existing expense record owned by the user.
    
    Args:
        db: SQLAlchemy database session.
        expense_id: ID of the expense to update.
        expense_data: New expense data (amount, category_id, date, description).
        user_id: ID of the user who must own the expense.
    
    Returns:
        ExpenseResponse | None: Updated expense object if found and owned, else None.
    
    Raises:
        HTTPException (400) if category is invalid or doesn't exist.
        SQLAlchemy exceptions on database errors (e.g., foreign key violations).
    
    Note:
        - Category is validated before update.
        - The updated_at timestamp is automatically updated by the database.
        - Returns None if expense doesn't exist or doesn't belong to user.
    """
    # Validate category exists and is of type "expense"
    get_valid_category(db, expense_data.category_id, "expense")

    existing_expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == user_id,
    ).first()
    if not existing_expense:
        return None

    old_month, old_year = _extract_month_year(existing_expense.date)
    old_category_id = existing_expense.category_id

    updated_expense = _crud_service.update(db, expense_id, expense_data, user_id)
    if not updated_expense:
        return None

    new_month, new_year = _extract_month_year(updated_expense.date)
    new_category_id = updated_expense.category_id

    _refresh_budget_spending(db, user_id, old_month, old_year, old_category_id)

    period_or_category_changed = (
        old_month != new_month
        or old_year != new_year
        or old_category_id != new_category_id
    )
    if period_or_category_changed:
        _refresh_budget_spending(db, user_id, new_month, new_year, new_category_id)

    return updated_expense


def delete_expense(db: Session, expense_id: int, user_id: int) -> bool:
    """Delete an expense record owned by the user.
    
    Args:
        db: SQLAlchemy database session.
        expense_id: ID of the expense to delete.
        user_id: ID of the user who must own the expense.
    
    Returns:
        bool: True if expense was deleted, False if not found or not owned.
    
    Note:
        - Deletion is immediately committed to the database.
        - Once deleted, the expense cannot be recovered.
    """
    existing_expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == user_id,
    ).first()
    if not existing_expense:
        return False

    month, year = _extract_month_year(existing_expense.date)
    category_id = existing_expense.category_id

    deleted = _crud_service.delete(db, expense_id, user_id)
    if not deleted:
        return False

    _refresh_budget_spending(db, user_id, month, year, category_id)
    return True