"""Recurring transaction schemas for request/response validation.

Pydantic schemas for recurring transaction CRUD operations.
"""

from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator


class RecurringTransactionBase(BaseModel):
    """Base recurring transaction payload."""
    
    type: str = Field(..., pattern="^(income|expense)$", description="Transaction type", examples=["expense"])
    amount: float = Field(..., gt=0, description="Recurring amount", examples=[50.00])
    title: str = Field(..., min_length=1, max_length=255, description="Display name", examples=["Gym Membership"])
    description: str | None = Field(None, max_length=500, description="Optional description")
    category_id: int | None = Field(None, description="Category ID")
    frequency: str = Field(..., pattern="^(daily|weekly|monthly|yearly)$", description="Frequency", examples=["monthly"])
    start_date: date = Field(..., description="Start date", examples=["2026-05-11"])
    end_date: date | None = Field(None, description="Optional end date")
    
    @field_validator("end_date")
    @classmethod
    def validate_date_range(cls, v, info):
        if v and "start_date" in info.data:
            if v < info.data["start_date"]:
                raise ValueError("end_date must be after start_date")
        return v


class RecurringTransactionCreate(RecurringTransactionBase):
    """Payload for POST /recurring-transactions endpoint."""
    pass


class RecurringTransactionUpdate(BaseModel):
    """Payload for PATCH /recurring-transactions/{id} endpoint."""
    
    amount: float | None = Field(None, gt=0)
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None)
    frequency: str | None = Field(None, pattern="^(daily|weekly|monthly|yearly)$")
    end_date: date | None = Field(None)
    is_active: bool | None = Field(None)


class RecurringTransactionResponse(RecurringTransactionBase):
    """Recurring transaction object returned to frontend."""
    
    id: int = Field(..., description="Unique ID")
    user_id: int = Field(..., description="Owner user ID")
    last_generated_at: datetime | None = Field(None, description="Last auto-generation time")
    is_active: bool = Field(default=True, description="Is active")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    # Computed fields
    next_generation_date: date | None = Field(None, description="Predicted next generation date")
    is_ended: bool = Field(default=False, description="True if end_date passed")
    
    model_config = {
        "from_attributes": True,
    }


class RecurringTransactionListResponse(BaseModel):
    """List of recurring transactions with pagination."""
    
    items: list[RecurringTransactionResponse] = Field(description="Recurring transactions")
    total: int = Field(description="Total count")
    active_count: int = Field(description="Count of active recurring transactions")
    pending_generation: list["RecurringTransactionResponse"] = Field(
        default_factory=list,
        description="Recurring transactions pending generation today"
    )


class RecurringLogResponse(BaseModel):
    """Log entry for auto-generated transaction."""
    
    id: int
    recurring_transaction_id: int
    generated_transaction_id: int | None
    transaction_type: str | None  # "income" or "expense"
    generated_at: datetime
    status: str  # "success", "failed", "skipped"
    error_message: str | None
    
    model_config = {
        "from_attributes": True,
    }


class RecurringGenerationRequest(BaseModel):
    """Request body for manual recurring transaction generation."""
    
    recurring_transaction_ids: list[int] | None = Field(None, description="Specific recurrings to generate (NULL=all)")
    force: bool = Field(default=False, description="Force generation even if already generated today")


class RecurringGenerationResponse(BaseModel):
    """Response from recurring transaction generation."""
    
    generated_count: int = Field(description="Number of transactions generated")
    failed_count: int = Field(description="Number of failed generations")
    skipped_count: int = Field(description="Number of skipped generations")
    errors: list[str] = Field(default_factory=list, description="Error messages")
    logs: list[RecurringLogResponse] = Field(description="Generation log entries")
