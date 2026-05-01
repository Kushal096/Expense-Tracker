"""Dashboard schemas for API responses.

Provides Pydantic models for dashboard endpoints including:
- Summary statistics (totals, balances, and monthly data)
- Trends (monthly income/expense breakdowns)
- Category distribution
- Recent transactions
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class SummaryResponse(BaseModel):
    """Financial summary."""

    monthly_income: float = Field(..., description="Current month income")
    monthly_expense: float = Field(..., description="Current month expense")
    monthly_balance: float = Field(..., description="Current month (income - expense)")
    total_savings: float = Field(
        ..., description="Cumulative balance before current month (previous months only)"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "monthly_income": 5000.00,
                "monthly_expense": 1200.00,
                "monthly_balance": 3800.00,
                "total_savings": 15200.00,
            }
        }
    }


class MonthlyTrend(BaseModel):
    """Monthly income and expense data."""

    month: str = Field(..., description="YYYY-MM format")
    total_income: float = Field(..., description="Total income for the month")
    total_expense: float = Field(..., description="Total expense for the month")
    balance: Optional[float] = Field(None, description="Income - expense for the month")

    model_config = {
        "json_schema_extra": {
            "example": {
                "month": "2024-06",
                "total_income": 5000.00,
                "total_expense": 1200.00,
                "balance": 3800.00,
            }
        }
    }


class TrendsResponse(BaseModel):
    """Container for monthly trend data."""

    trends: list[MonthlyTrend] = Field(..., description="List of monthly trends")

    model_config = {
        "json_schema_extra": {
            "example": {
                "trends": [
                    {
                        "month": "2024-05",
                        "total_income": 4500.00,
                        "total_expense": 1100.00,
                        "balance": 3400.00,
                    },
                    {
                        "month": "2024-06",
                        "total_income": 5000.00,
                        "total_expense": 1200.00,
                        "balance": 3800.00,
                    },
                ]
            }
        }
    }


class CategoryExpense(BaseModel):
    """Category with total expense amount."""

    category_name: str = Field(..., description="Name of the category")
    total_expense: float = Field(..., description="Total amount spent in this category")

    model_config = {
        "json_schema_extra": {
            "example": {
                "category_name": "Food",
                "total_expense": 450.00,
            }
        }
    }


class CategoriesResponse(BaseModel):
    """Container for category expense data."""

    categories: list[CategoryExpense] = Field(..., description="List of categories with totals")

    model_config = {
        "json_schema_extra": {
            "example": {
                "categories": [
                    {"category_name": "Food", "total_expense": 450.00},
                    {"category_name": "Transportation", "total_expense": 250.00},
                    {"category_name": "Entertainment", "total_expense": 150.00},
                ]
            }
        }
    }


class Transaction(BaseModel):
    """A single transaction (income or expense)."""

    id: int = Field(..., description="Unique transaction ID")
    title: str = Field(..., description="Title/description of transaction")
    amount: float = Field(..., description="Transaction amount")
    category: str = Field(..., description="Category name")
    type: str = Field(..., description="Type: 'income' or 'expense'")
    date: datetime = Field(..., description="Transaction date")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 1,
                "title": "Salary",
                "amount": 3000.00,
                "category": "Salary",
                "type": "income",
                "date": "2024-06-15T09:00:00",
            }
        }
    }


class RecentTransactionsResponse(BaseModel):
    """Container for recent transactions."""

    transactions: list[Transaction] = Field(..., description="List of recent transactions")
    total: int = Field(..., description="Total number of available transactions")
    skip: int = Field(..., description="Number of transactions skipped for the current page")
    limit: int = Field(..., description="Maximum number of transactions returned per page")
    has_previous: bool = Field(..., description="Whether a previous page exists")
    has_next: bool = Field(..., description="Whether a next page exists")
    current_page: int = Field(..., description="Current page number, starting from 1")
    total_pages: int = Field(..., description="Total number of pages")

    model_config = {
        "json_schema_extra": {
            "example": {
                "transactions": [
                    {
                        "id": 1,
                        "title": "Salary",
                        "amount": 3000.00,
                        "category": "Salary",
                        "type": "income",
                        "date": "2024-06-15T09:00:00",
                    },
                    {
                        "id": 2,
                        "title": "Groceries",
                        "amount": 125.50,
                        "category": "Food",
                        "type": "expense",
                        "date": "2024-06-14T18:30:00",
                    },
                ],
                "total": 24,
                "skip": 0,
                "limit": 10,
                "has_previous": False,
                "has_next": True,
                "current_page": 1,
                "total_pages": 3,
            }
        }
    }
