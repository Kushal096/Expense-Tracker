from sqlalchemy.orm import Session
from app.models.income_models import Income
from app.schemas.income_schema import IncomeCreate, IncomeResponse

def create_income(db: Session, income_data: IncomeCreate, user_id: int) -> IncomeResponse:
    """Create a new income record for a user.
    
    Args:
        db: SQLAlchemy database session.
        income_data: Income data payload from request (amount, source, date, category_id).
        user_id: ID of the user creating the income. Used for ownership and isolation.
    Returns:
        IncomeResponse: Created income object, including auto-generated ID and timestamps.
    Raises:
        SQLAlchemy exceptions on database errors (e.g., foreign key violations).
    Note:
        - The income is immediately committed to the database.
        - Timestamps (created_at, updated_at) are set by the database.
        - Category must exist; violating foreign key constraint will raise an error.
    """
    income = Income(
        amount=income_data.amount,
        source=income_data.source,
        date=income_data.date,
        user_id=user_id,
        category_id=income_data.category_id
    )
    db.add(income)
    db.commit()
    db.refresh(income)
    return IncomeResponse.model_validate(income)


def get_incomes_by_user(db: Session, user_id: int) -> list[IncomeResponse]:
    """Fetch all incomes belonging to a user.
    
    Args:
        db: SQLAlchemy database session.
        user_id: ID of the user whose incomes to retrieve.
    
    Returns:
        list[IncomeResponse]: List of income objects. Empty list if user has no incomes.
    
    Note:
        - This function returns all income records for the specified user_id.
        - The returned list is empty if the user has no income records.
        - User isolation is enforced by filtering on user_id.
    """
    return [IncomeResponse.model_validate(income) for income in db.query(Income).filter(Income.user_id == user_id).all()]


def get_income_by_id(db: Session, income_id: int, user_id: int) -> IncomeResponse | None:
    """Fetch a single income record by ID for a user.
    
    Args:
        db: SQLAlchemy database session.
        income_id: ID of the income record to retrieve.
        user_id: ID of the user who owns the income record. Used for ownership verification.
    Returns:
        IncomeResponse: The income record if found and belongs to the user.
        None: If no income record with the specified ID exists for the user.
    Note:
        - This function ensures that the income record belongs to the specified user_id.
        - If the income record does not exist or does not belong to the user, None is returned.
    """
    income = db.query(Income).filter(Income.id == income_id, Income.user_id == user_id).first()
    return IncomeResponse.model_validate(income) if income else None

def update_income(db: Session, income_id: int, income_data: IncomeCreate, user_id: int) -> IncomeResponse | None:
    """Update an existing income record for a user.
    
    Args:
        db: SQLAlchemy database session.
        income_id: ID of the income record to update.
        income_data: Updated income data payload from request (amount, source, date, category_id).
        user_id: ID of the user who owns the income record. Used for ownership verification.
    Returns:
        IncomeResponse: The updated income record if update is successful.
        None: If no income record with the specified ID exists for the user.
    Note:
        - This function first verifies that the income record exists and belongs to the user.
        - If the record is found, it updates the fields and commits the changes to the database.
        - If the record does not exist or does not belong to the user, None is returned.
    """
    income = db.query(Income).filter(Income.id == income_id, Income.user_id == user_id).first()
    if not income:
        return None
    income.amount = income_data.amount
    income.source = income_data.source
    income.date = income_data.date
    income.category_id = income_data.category_id
    db.commit()
    db.refresh(income)
    return IncomeResponse.model_validate(income)


def delete_income(db: Session, income_id: int, user_id: int) -> bool:
    """Delete an income record for a user.
    
    Args:
        db: SQLAlchemy database session.
        income_id: ID of the income record to delete.
        user_id: ID of the user who owns the income record. Used for ownership verification.
    Returns:
        bool: True if the income record was found and deleted, False if no such record exists for the user.
    Note:
        - This function verifies that the income record exists and belongs to the user before deletion.
        - If the record is found, it is deleted from the database and True is returned.
        - If the record does not exist or does not belong to the user, False is returned.
    """
    income = db.query(Income).filter(Income.id == income_id, Income.user_id == user_id).first()
    if not income:
        return False
    db.delete(income)
    db.commit()
    return True