from pydantic import BaseModel, Field
from datetime import datetime


class ExpenseBase(BaseModel):
    """Payload used by create/update expense endpoints."""

    amount: float = Field(..., gt=0, description="Expense amount", examples=[19.99])
    category_id: int = Field(..., description="ID of the expense category", examples=[1])
    description: str = Field("", description="Optional expense description", examples=["Lunch at cafe"])
    date: datetime = Field(..., description="Date and time of the expense", examples=["2024-06-01T12:00:00Z"])


ExpenseCreate = ExpenseBase


class ExpenseResponse(BaseModel):
    """Expense object returned to frontend clients."""

    id: int = Field(..., description="Unique identifier of the expense")
    amount: float = Field(..., description="Expense amount")
    category_id: int = Field(..., description="ID of the expense category")
    description: str = Field("", description="Optional expense description")
    date: datetime = Field(..., description="Date and time of the expense")

    model_config = {
        "from_attributes": True,
    }