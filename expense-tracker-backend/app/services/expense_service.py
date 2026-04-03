"""Expense service layer.

Provides business logic for expense CRUD operations with user isolation.
All operations enforce user ownership checks to ensure data privacy.

Example:
    Create an expense for a user:
        expense = create_expense(db, expense_data, user_id=1)
    
    Fetch all expenses for a user:
        expenses = get_expenses_by_user(db, user_id=1)
"""

from sqlalchemy.orm import Session
from app.models.expense_models import Expense
from app.schemas.expense_schema import ExpenseBase, ExpenseResponse


def create_expense(db: Session, expense_data: ExpenseBase, user_id: int) -> ExpenseResponse:
    """Create a new expense record for a user.
    
    Args:
        db: SQLAlchemy database session.
        expense_data: Expense data payload from request (amount, category_id, date, description).
        user_id: ID of the user creating the expense. Used for ownership and isolation.
    
    Returns:
        ExpenseResponse: Created expense object, including auto-generated ID and timestamps.
    
    Raises:
        SQLAlchemy exceptions on database errors (e.g., foreign key violations).
    
    Note:
        - The expense is immediately committed to the database.
        - Timestamps (created_at, updated_at) are set by the database.
        - Category must exist; violating foreign key constraint will raise an error.
    """
    expense = Expense(
        amount=expense_data.amount,
        date=expense_data.date,
        description=expense_data.description,
        user_id=user_id,
        category_id=expense_data.category_id
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return ExpenseResponse.model_validate(expense)


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
        - This operation does NOT perform any aggregations (e.g., sum, count).
    """
    expenses = db.query(Expense).filter(Expense.user_id == user_id).all()
    return [ExpenseResponse.model_validate(exp) for exp in expenses]


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
        - This maintains user isolation and prevents unauthorized access.
    """
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == user_id).first()
    if expense:
        return ExpenseResponse.model_validate(expense)
    return None


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
        SQLAlchemy exceptions on database errors (e.g., foreign key violations).
    
    Note:
        - Only the specified fields are updated; other fields remain unchanged.
        - The updated_at timestamp is automatically updated by the database.
        - Returns None if expense does not exist OR does not belong to the user.
    """
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == user_id).first()
    if not expense:
        return None
    expense.amount = expense_data.amount
    expense.date = expense_data.date
    expense.description = expense_data.description
    expense.category_id = expense_data.category_id
    db.commit()
    db.refresh(expense)
    return ExpenseResponse.model_validate(expense)


def delete_expense(db: Session, expense_id: int, user_id: int) -> bool:
    """Delete an expense record owned by the user.
    
    Args:
        db: SQLAlchemy database session.
        expense_id: ID of the expense to delete.
        user_id: ID of the user who must own the expense.
    
    Returns:
        bool: True if expense was deleted, False if not found or not owned.
    
    Note:
        - The deletion is immediately committed to the database.
        - Returns False if expense does not exist OR does not belong to the user.
        - Once deleted, the expense cannot be recovered.
    """
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == user_id).first()
    if not expense:
        return False
    db.delete(expense)
    db.commit()
    return True