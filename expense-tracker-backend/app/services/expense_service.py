from sqlalchemy.orm import Session
from app.models.expense_models import Expense
from app.schemas.expense_schema import ExpenseBase, ExpenseResponse


def create_expense(db: Session, expense_data: ExpenseBase, user_id: int) -> ExpenseResponse:
    """Create a new expense record in the database."""
    expense = Expense(
        amount=expense_data.amount,
        date=expense_data.date,
        description=expense_data.description,
        user_id=user_id,
        category_id=expense_data.category_id,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return ExpenseResponse.model_validate(expense)

def get_expenses_by_user(db: Session, user_id: int) -> list[ExpenseResponse]:
    """Fetch all expenses for a given user."""
    expenses = db.query(Expense).filter(Expense.user_id == user_id).all()
    return [ExpenseResponse.model_validate(exp) for exp in expenses]

def get_expense_by_id(db: Session, expense_id: int, user_id: int) -> ExpenseResponse | None:
    """Fetch a single expense by ID, ensuring it belongs to the user."""
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == user_id).first()
    if expense:
        return ExpenseResponse.model_validate(expense)
    return None

def update_expense(db: Session, expense_id: int, expense_data: ExpenseBase, user_id: int) -> ExpenseResponse | None:
    """Update an existing expense record."""
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
    """Delete an expense record."""
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == user_id).first()
    if not expense:
        return False
    db.delete(expense)
    db.commit()
    return True