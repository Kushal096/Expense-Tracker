"""Budget management models.

Tracks user budget limits and spending progress per category and month.
Enables overspending detection and budget analytics.

Tables:
    - budgets: User budget allocation per category per month
    - budget_alerts: Triggered overspending/warning alerts (optional)

Relationships:
    - User has many Budgets
    - Budget links to one Category (or NULL for overall budget)
    - Expense entries affect budget spent_amount calculation
"""

from sqlalchemy import Column, DateTime, Float, String, Integer, ForeignKey, func, CheckConstraint, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.db.database import Base


class Budget(Base):
    """Monthly budget allocation for a user, optionally per category.
    
    Fields:
        id: Primary key
        user_id: Budget owner
        category_id: NULL for overall budget, specific category otherwise
        limit_amount: Budget limit in currency units
        spent_amount: Running total of expenses (updated by trigger or service)
        month: Month number (1-12)
        year: Calendar year
        created_at: Record creation timestamp
        updated_at: Last modification timestamp
    
    Constraints:
        - Unique per (user_id, category_id, month, year)
        - Month must be 1-12
        - Amounts must be positive
        - Only one "overall budget" per (user, month, year) when category_id is NULL
    
    Indexes:
        - user_id + month + year (for dashboard queries)
        - user_id + created_at (for recent budgets)
    """
    
    __tablename__ = "budgets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    
    limit_amount = Column(Float, nullable=False)
    spent_amount = Column(Float, default=0.0, nullable=False)
    
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("limit_amount > 0", name="check_budget_limit_positive"),
        CheckConstraint("spent_amount >= 0", name="check_budget_spent_positive"),
        CheckConstraint("month >= 1 AND month <= 12", name="check_budget_month_range"),
        UniqueConstraint("user_id", "category_id", "month", "year", name="unique_budget_per_user_category_month"),
        Index("idx_budgets_user_month_year", "user_id", "month", "year"),
        Index("idx_budgets_user_created", "user_id", "created_at"),
    )
    
    # Relationships
    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")
    
    @property
    def is_over_budget(self) -> bool:
        """Check if spending exceeds budget limit."""
        return self.spent_amount > self.limit_amount
    
    @property
    def remaining_amount(self) -> float:
        """Calculate remaining budget amount (can be negative if over budget)."""
        return self.limit_amount - self.spent_amount
    
    @property
    def usage_percentage(self) -> float:
        """Calculate budget usage as percentage (0-100+)."""
        if self.limit_amount <= 0:
            return 0.0
        return (self.spent_amount / self.limit_amount) * 100
    
    @property
    def warning_level(self) -> str:
        """Determine warning level based on spending percentage.
        
        Returns:
            "safe": 0-50%
            "caution": 50-80%
            "warning": 80-100%
            "danger": 100%+
        """
        usage = self.usage_percentage
        if usage >= 100:
            return "danger"
        elif usage >= 80:
            return "warning"
        elif usage >= 50:
            return "caution"
        else:
            return "safe"


class BudgetAlert(Base):
    """Optional: Track budget alerts (overspending, warnings).
    
    Useful for:
    - Audit trail of alerts
    - Email notification triggers
    - User notification history
    - Analytics on overspending patterns
    
    Fields:
        id: Primary key
        budget_id: Reference to budget that triggered alert
        alert_type: "overspending" | "warning" | "threshold"
        triggered_at: When alert was generated
        user_notified_at: When user was notified (email/push)
        is_resolved: Whether user has acknowledged alert
    """
    
    __tablename__ = "budget_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    budget_id = Column(Integer, ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False)  # "overspending", "warning", "threshold_reached"
    triggered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user_notified_at = Column(DateTime(timezone=True), nullable=True)
    is_resolved = Column(Integer, default=0, nullable=False)  # 0=unresolved, 1=resolved
    
    __table_args__ = (
        Index("idx_budget_alerts_budget", "budget_id"),
        Index("idx_budget_alerts_resolved", "budget_id", "is_resolved"),
    )
    
    budget = relationship("Budget")
