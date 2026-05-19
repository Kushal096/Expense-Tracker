from sqlalchemy import Column, Integer, String, UniqueConstraint, Enum
from sqlalchemy.orm import relationship
from app.db.database import Base

class Category(Base):
    """Database category entity."""

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(
        Enum("income", "expense", name="category_type"), 
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("name", "type", name="unique_category_name_type"),
    )

    expenses = relationship("Expense", back_populates="category")
    incomes = relationship("Income", back_populates="category")
    budgets = relationship("Budget", back_populates="category")
    recurring_transactions = relationship("RecurringTransaction", back_populates="category")