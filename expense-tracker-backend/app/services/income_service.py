"""Income service layer.

Provides business logic for income CRUD operations with user isolation.
All operations enforce user ownership checks to ensure data privacy.

Uses BaseCRUDService for generic CRUD operations and shared category
validation utilities to reduce code duplication.

Example:
    Create an income for a user:
        income = create_income(db, income_data, user_id=1)
    
    Fetch all incomes for a user:
        incomes = get_incomes_by_user(db, user_id=1)
"""

from sqlalchemy.orm import Session
from app.models.income_models import Income
from app.schemas.income_schema import IncomeCreate, IncomeResponse
from app.services.base_crud_service import BaseCRUDService
from app.core.category_validation import get_valid_category

# Initialize CRUD service for incomes
_crud_service = BaseCRUDService(Income, IncomeResponse)


def create_income(db: Session, income_data: IncomeCreate, user_id: int) -> IncomeResponse:
    """Create a new income record for a user.
    
    Args:
        db: SQLAlchemy database session.
        income_data: Income data payload from request (amount, source, date, category_id).
        user_id: ID of the user creating the income. Used for ownership and isolation.
    
    Returns:
        IncomeResponse: Created income object, including auto-generated ID and timestamps.
    
    Raises:
        HTTPException (400) if category is invalid or doesn't exist.
        SQLAlchemy exceptions on database errors (e.g., foreign key violations).
    
    Note:
        - Category is validated before creation.
        - Income is immediately committed to the database.
        - Timestamps (created_at, updated_at) are set by the database.
    """
    # Validate category exists and is of type "income"
    get_valid_category(db, income_data.category_id, "income")
    return _crud_service.create(db, income_data, user_id)


def get_incomes_by_user(db: Session, user_id: int) -> list[IncomeResponse]:
    """Fetch all incomes belonging to a user.
    
    Args:
        db: SQLAlchemy database session.
        user_id: ID of the user whose incomes to retrieve.
    
    Returns:
        list[IncomeResponse]: List of income objects. Empty list if user has no incomes.
    
    Note:
        - Query is filtered to ensure user isolation.
        - Results are returned in insertion order.
    """
    return _crud_service.get_all_by_user(db, user_id)


def get_income_by_id(db: Session, income_id: int, user_id: int) -> IncomeResponse | None:
    """Fetch a single income record by ID for a user.
    
    Args:
        db: SQLAlchemy database session.
        income_id: ID of the income record to retrieve.
        user_id: ID of the user who owns the income record. Used for ownership verification.
    
    Returns:
        IncomeResponse | None: The income record if found and belongs to the user, else None.
    
    Note:
        - Returns None if income doesn't exist OR doesn't belong to the user.
        - Maintains user isolation and prevents unauthorized access.
    """
    return _crud_service.get_by_id(db, income_id, user_id)


def update_income(db: Session, income_id: int, income_data: IncomeCreate, user_id: int) -> IncomeResponse | None:
    """Update an existing income record for a user.
    
    Args:
        db: SQLAlchemy database session.
        income_id: ID of the income record to update.
        income_data: Updated income data payload from request (amount, source, date, category_id).
        user_id: ID of the user who owns the income record. Used for ownership verification.
    
    Returns:
        IncomeResponse | None: The updated income record if successful, else None.
    
    Raises:
        HTTPException (400) if category is invalid or doesn't exist.
        SQLAlchemy exceptions on database errors (e.g., foreign key violations).
    
    Note:
        - Category is validated before update.
        - Returns None if income record doesn't exist or doesn't belong to user.
    """
    # Validate category exists and is of type "income"
    get_valid_category(db, income_data.category_id, "income")
    return _crud_service.update(db, income_id, income_data, user_id)


def delete_income(db: Session, income_id: int, user_id: int) -> bool:
    """Delete an income record for a user.
    
    Args:
        db: SQLAlchemy database session.
        income_id: ID of the income record to delete.
        user_id: ID of the user who owns the income record. Used for ownership verification.
    
    Returns:
        bool: True if the income record was deleted, False if not found or not owned.
    
    Note:
        - Deletion is immediately committed to the database.
        - Once deleted, the income cannot be recovered.
    """
    return _crud_service.delete(db, income_id, user_id)