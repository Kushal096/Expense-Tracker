"""Category request/response schemas used by frontend-facing category APIs."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class CategoryBase(BaseModel):
    """Payload used by create/update category endpoints."""

    name: str = Field(..., min_length=1, description="Category name", examples=["Food"])
    type: Literal["income", "expense"] = Field(..., description="Category type", examples=["income", "expense"])

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, value):
        if isinstance(value, str):
            value = value.strip()
        if not value:
            raise ValueError("Category name is required")
        return value


class CategoryResponse(BaseModel):
    """Category object returned to frontend clients."""

    id: int
    name: str
    type: str

    model_config = {
        "from_attributes": True,
    }