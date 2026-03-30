"""Category request/response schemas used by frontend-facing category APIs."""

from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    """Payload used by create/update category endpoints."""

    name: str = Field(..., min_length=1, description="Category name", examples=["Food"])


class CategoryResponse(BaseModel):
    """Category object returned to frontend clients."""

    id: int
    name: str

    model_config = {
        "from_attributes": True,
    }