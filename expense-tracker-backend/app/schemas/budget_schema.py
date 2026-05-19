"""Budget schemas for request/response validation.

Pydantic schemas for budget CRUD operations.
Provides type safety and automatic request validation.
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class BudgetBase(BaseModel):
    """Base budget payload for create/update operations."""
    
    limit_amount: float = Field(..., gt=0, description="Budget limit amount", examples=[500.00])
    category_id: int | None = Field(None, description="Category ID (NULL for overall budget)", examples=[1])
    month: int = Field(..., ge=1, le=12, description="Month (1-12)", examples=[5])
    year: int = Field(..., ge=2020, le=2100, description="Calendar year", examples=[2026])
    
    @field_validator("month")
    @classmethod
    def validate_month(cls, v):
        if not 1 <= v <= 12:
            raise ValueError("Month must be between 1 and 12")
        return v


class BudgetCreate(BudgetBase):
    """Payload for POST /budgets endpoint."""
    pass


class BudgetUpdate(BaseModel):
    """Payload for PATCH /budgets/{id} endpoint."""
    
    limit_amount: float | None = Field(None, gt=0, description="New budget limit")
    category_id: int | None = Field(None, description="Category ID")


class BudgetResponse(BudgetBase):
    """Budget object returned to frontend clients."""
    
    id: int = Field(..., description="Unique budget ID")
    user_id: int = Field(..., description="Owner user ID")
    spent_amount: float = Field(default=0.0, description="Amount spent so far this month")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    # Computed fields for frontend convenience
    remaining_amount: float = Field(..., description="Remaining budget (limit - spent)")
    usage_percentage: float = Field(..., description="Usage percentage (0-100+)")
    warning_level: str = Field(..., description="Alert level: safe|caution|warning|danger")
    is_over_budget: bool = Field(..., description="True if spending exceeds limit")
    
    model_config = {
        "from_attributes": True,
    }


class BudgetSummary(BaseModel):
    """Summary of user's budgets for a given month."""
    
    month: int
    year: int
    total_limit: float = Field(description="Sum of all budgets (overall + categories)")
    total_spent: float = Field(description="Total spent across all categories")
    total_remaining: float = Field(description="Total remaining budget")
    overall_budget_id: int | None = Field(description="ID of overall budget if exists")
    overall_usage_percentage: float = Field(description="Overall usage %")
    category_budgets: list["BudgetResponse"] = Field(description="Per-category budgets")
    alerts: list["BudgetAlert"] = Field(default_factory=list, description="Active overspending alerts")


class BudgetAlert(BaseModel):
    """Alert notification for budget warnings/overspending."""
    
    budget_id: int
    category_name: str | None = Field(None, description="Category name (NULL for overall budget)")
    alert_type: str = Field(description="overspending|warning|threshold")
    message: str = Field(description="Human-readable alert message")
    spent_amount: float
    limit_amount: float
    usage_percentage: float
    triggered_at: datetime
