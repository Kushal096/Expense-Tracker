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

from sqlalchemy.orm import Session
from app.models.expense_models import Expense
from app.schemas.expense_schema import ExpenseBase, ExpenseResponse
from app.services.base_crud_service import BaseCRUDService
from app.core.category_validation import get_valid_category

# Initialize CRUD service for expenses
_crud_service = BaseCRUDService(Expense, ExpenseResponse)


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
    # Validate category exists and is of type "expense"
    get_valid_category(db, expense_data.category_id, "expense")
    return _crud_service.create(db, expense_data, user_id)


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
    return _crud_service.update(db, expense_id, expense_data, user_id)


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
    return _crud_service.delete(db, expense_id, user_id)