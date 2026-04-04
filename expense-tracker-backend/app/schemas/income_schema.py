from pydantic import BaseModel, Field
from datetime import datetime

class IncomeCreate(BaseModel):
    """Payload used by create/update income endpoints."""

    amount: float = Field(..., gt=0, description="Income amount", examples=[500.00])
    source: str = Field(..., description="Source of the income", examples=["Salary"])
    date: datetime = Field(..., description="Date and time of the income", examples=["2024-06-01T12:00:00Z"])
    category_id: int = Field(..., description="ID of the income category", examples=[1])
    description: str = Field("", description="Optional income description", examples=["June salary"])


class IncomeResponse(BaseModel):
    """Income object returned to frontend clients."""

    id: int = Field(..., description="Unique identifier of the income")
    amount: float = Field(..., description="Income amount")
    source: str = Field(..., description="Source of the income")
    date: datetime = Field(..., description="Date and time of the income")
    category_id: int = Field(..., description="ID of the income category")
    description: str = Field("", description="Optional income description")

    model_config = {
        "from_attributes": True,
    }