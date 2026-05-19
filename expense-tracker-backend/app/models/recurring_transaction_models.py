"""Recurring transaction models.

Supports automated income and expense transactions.
Integration with APScheduler for automatic generation.

Tables:
    - recurring_transactions: Template for recurring transactions
    - recurring_logs: Audit trail for generated transactions (optional)

Key Features:
    - Multiple frequencies: daily, weekly, monthly, yearly
    - Optional end dates for time-limited subscriptions
    - Active/inactive toggle
    - Automatic transaction generation tracking
"""

from sqlalchemy import Column, DateTime, Float, String, Integer, ForeignKey, func, CheckConstraint, Date, Boolean, Index
from sqlalchemy.orm import relationship
from app.db.database import Base


class RecurringTransaction(Base):
    """Template for automatically generated recurring transactions.
    
    Example use cases:
        - Monthly salary (income)
        - Gym membership (expense)
        - Insurance payments (expense)
        - Freelance retainer (income)
        - Grocery budget (expense)
    
    Fields:
        id: Primary key
        user_id: Owner of the recurring transaction
        type: "income" or "expense"
        amount: Transaction amount
        title: Display name/description
        category_id: Category for generated transactions (expense/income specific)
        frequency: "daily" | "weekly" | "monthly" | "yearly"
        start_date: When recurrence starts
        end_date: When recurrence ends (NULL = open-ended)
        last_generated_at: Timestamp of last auto-generated transaction
        is_active: Can be disabled without deletion
        created_at: Record creation
        updated_at: Last modification
    
    Recurrence Logic:
        - Daily: Generate every 24 hours
        - Weekly: Generate every 7 days on same day of week
        - Monthly: Generate on same day of month (handle month-end edge cases)
        - Yearly: Generate on same date annually
    
    Auto-generation:
        - Use APScheduler to check and generate transactions
        - Update last_generated_at after successful generation
        - Skip if already generated today (prevent duplicates)
    """
    
    __tablename__ = "recurring_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    type = Column(String(20), nullable=False)  # "income" or "expense"
    amount = Column(Float, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    
    frequency = Column(String(20), nullable=False)  # "daily", "weekly", "monthly", "yearly"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    
    # Tracking for automatic generation
    last_generated_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    __table_args__ = (
        CheckConstraint("type IN ('income', 'expense')", name="check_recurring_type"),
        CheckConstraint("amount > 0", name="check_recurring_amount_positive"),
        CheckConstraint("frequency IN ('daily', 'weekly', 'monthly', 'yearly')", name="check_recurring_frequency"),
        CheckConstraint("end_date IS NULL OR end_date >= start_date", name="check_recurring_date_range"),
        Index("idx_recurring_user_active", "user_id", "is_active"),
        Index("idx_recurring_next_run", "is_active", "last_generated_at"),
        Index("idx_recurring_end_date", "end_date", "is_active"),
    )
    
    # Relationships
    user = relationship("User", back_populates="recurring_transactions")
    category = relationship("Category", back_populates="recurring_transactions")
    logs = relationship("RecurringLog", back_populates="recurring_transaction", cascade="all, delete-orphan")
    
    def should_generate_today(self) -> bool:
        """Check if transaction should be generated today.
        
        Logic:
        - Check if active
        - Check if today >= start_date
        - Check if end_date not reached
        - Check if not already generated today (frequency-aware)
        
        Returns:
            True if transaction should be generated
        """
        from datetime import datetime, date, timezone
        
        today = date.today()
        
        # Not active or not started yet
        if not self.is_active or today < self.start_date:
            return False
        
        # Past end date
        if self.end_date and today > self.end_date:
            return False
        
        # Check if already generated today (based on frequency)
        if self.last_generated_at:
            last_date = self.last_generated_at.date()
            
            if self.frequency == "daily":
                return last_date < today
            elif self.frequency == "weekly":
                return (today - last_date).days >= 7
            elif self.frequency == "monthly":
                # Generate on same day each month
                return (today.month != last_date.month) or (today.year != last_date.year)
            elif self.frequency == "yearly":
                return today.year > last_date.year
        
        return True
    
    def can_be_skipped(self) -> bool:
        """Check if recurrence has ended and can be deactivated."""
        from datetime import date

        if self.end_date is None:
            return False

        return date.today() > self.end_date


class RecurringLog(Base):
    """Audit trail for automatically generated recurring transactions.
    
    Purpose:
    - Track which transactions were auto-generated
    - Link generated transaction back to recurring template
    - Audit trail for support/debugging
    - Enable bulk delete functionality
    
    Fields:
        id: Primary key
        recurring_transaction_id: Reference to recurring template
        generated_transaction_id: ID of generated expense/income (composite with type)
        transaction_type: "income" or "expense" (which table)
        generated_at: When transaction was created
        status: "success" | "failed" | "skipped"
        error_message: If generation failed
    """
    
    __tablename__ = "recurring_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    recurring_transaction_id = Column(
        Integer,
        ForeignKey("recurring_transactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Store reference to generated transaction
    generated_transaction_id = Column(Integer, nullable=True)  # ID of expense or income record
    transaction_type = Column(String(20), nullable=True)  # "income" or "expense"
    
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(String(20), default="success", nullable=False)  # "success", "failed", "skipped"
    error_message = Column(String(500), nullable=True)  # If failed
    
    __table_args__ = (
        Index("idx_recurring_logs_recurring", "recurring_transaction_id"),
        Index("idx_recurring_logs_generated_at", "generated_at"),
        Index("idx_recurring_logs_status", "status"),
    )
    
    recurring_transaction = relationship("RecurringTransaction", back_populates="logs")
