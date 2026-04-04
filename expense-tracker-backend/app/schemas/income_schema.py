from pydantic import BaseModel, Field
from datetime import datetime

class IncomeCreate(BaseModel):
    """Payload used by create/update income endpoints."""

    amount: float = Field(..., gt=0, examples=[500.00])
    source: str = Field(..., examples=["Salary"])
    date: datetime = Field(..., examples=["2024-06-01T12:00:00Z"])
    category_id: int = Field(..., examples=[1])


class IncomeResponse(BaseModel):
    """Income object returned to frontend clients."""

    id: int = Field(...)
    amount: float = Field(...)
    source: str = Field(...)
    date: datetime = Field(...)
    category_id: int = Field(...)

    model_config = {
        "from_attributes": True,
    }