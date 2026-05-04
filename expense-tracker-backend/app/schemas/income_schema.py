from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.core.validation import parse_date_input


class IncomeCreate(BaseModel):
    """Payload used by create/update income endpoints."""

    amount: float = Field(..., gt=0, examples=[500.00])
    source: str = Field(..., min_length=1, examples=["Salary"])
    date: datetime = Field(..., examples=["2024-06-01T12:00:00Z"])
    category_id: int = Field(..., gt=0, examples=[1])

    @field_validator("date", mode="before")
    @classmethod
    def validate_date(cls, value):
        return parse_date_input(value)

    @field_validator("source", mode="before")
    @classmethod
    def validate_source(cls, value):
        if isinstance(value, str):
            value = value.strip()
        if not value:
            raise ValueError("Income source is required")
        return value


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