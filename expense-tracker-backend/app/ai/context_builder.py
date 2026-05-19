"""Utilities for turning analytics data into AI-readable financial context."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.budget_models import Budget
from app.models.category_models import Category
from app.models.expense_models import Expense
from app.models.income_models import Income
from app.models.recurring_transaction_models import RecurringTransaction
from app.schemas.ai_schema import (
    AIContextBudgetSnapshot,
    AIContextProjectSnapshot,
    AIContextRecentExpense,
    AIContextRecentIncome,
    AIContextRecurringSnapshot,
    AIContextTopCategory,
    FinancialAIContext,
)
from app.services.analytics_service import AnalyticsService


class FinancialContextBuilder:
    """Build compact, deterministic context for AI prompts."""

    _RECENT_ITEMS_LIMIT = 8
    _PROJECT_MODULES = [
        "dashboard",
        "analytics",
        "expenses",
        "income",
        "budgets",
        "recurring",
        "categories",
        "auth",
        "chatbox",
    ]

    _PERIOD_LOOKBACK_MONTHS = {
        "monthly": 3,
        "quarterly": 6,
        "yearly": 12,
    }

    @staticmethod
    def _months_to_days(months: int) -> int:
        return max(months, 1) * 30

    @classmethod
    def _build_project_snapshot(
        cls,
        db: Session,
        user_id: int,
    ) -> AIContextProjectSnapshot:
        total_expense_transactions = db.query(func.count(Expense.id)).filter(
            Expense.user_id == user_id
        ).scalar() or 0

        total_income_transactions = db.query(func.count(Income.id)).filter(
            Income.user_id == user_id
        ).scalar() or 0

        distinct_expense_categories_used = db.query(func.count(func.distinct(Expense.category_id))).filter(
            Expense.user_id == user_id
        ).scalar() or 0

        distinct_income_categories_used = db.query(func.count(func.distinct(Income.category_id))).filter(
            Income.user_id == user_id
        ).scalar() or 0

        recent_expense_rows = (
            db.query(Expense, Category.name)
            .outerjoin(Category, Expense.category_id == Category.id)
            .filter(Expense.user_id == user_id)
            .order_by(Expense.date.desc())
            .limit(cls._RECENT_ITEMS_LIMIT)
            .all()
        )
        recent_expenses = [
            AIContextRecentExpense(
                id=expense.id,
                amount=expense.amount,
                date=expense.date,
                description=expense.description,
                category_name=category_name,
            )
            for expense, category_name in recent_expense_rows
        ]

        recent_income_rows = (
            db.query(Income, Category.name)
            .outerjoin(Category, Income.category_id == Category.id)
            .filter(Income.user_id == user_id)
            .order_by(Income.date.desc())
            .limit(cls._RECENT_ITEMS_LIMIT)
            .all()
        )
        recent_incomes = [
            AIContextRecentIncome(
                id=income.id,
                amount=income.amount,
                date=income.date,
                source=income.source,
                category_name=category_name,
            )
            for income, category_name in recent_income_rows
        ]

        budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
        total_limit = sum(budget.limit_amount for budget in budgets)
        total_spent = sum(budget.spent_amount for budget in budgets)
        over_budget = sum(1 for budget in budgets if budget.spent_amount > budget.limit_amount)
        on_track = max(len(budgets) - over_budget, 0)
        overall_utilization_percentage = (total_spent / total_limit * 100) if total_limit > 0 else 0

        recurring_items = db.query(RecurringTransaction).filter(
            RecurringTransaction.user_id == user_id
        ).all()
        today = date.today()
        in_30_days = today + timedelta(days=30)
        ending_within_30_days = sum(
            1
            for item in recurring_items
            if item.is_active and item.end_date is not None and today <= item.end_date <= in_30_days
        )

        budget_snapshot = AIContextBudgetSnapshot(
            total_budgets=len(budgets),
            over_budget=over_budget,
            on_track=on_track,
            total_limit=total_limit,
            total_spent=total_spent,
            overall_utilization_percentage=overall_utilization_percentage,
        )
        recurring_snapshot = AIContextRecurringSnapshot(
            total_recurring=len(recurring_items),
            active_recurring=sum(1 for item in recurring_items if item.is_active),
            income_recurring=sum(1 for item in recurring_items if item.type == "income"),
            expense_recurring=sum(1 for item in recurring_items if item.type == "expense"),
            ending_within_30_days=ending_within_30_days,
        )

        return AIContextProjectSnapshot(
            total_expense_transactions=total_expense_transactions,
            total_income_transactions=total_income_transactions,
            distinct_expense_categories_used=distinct_expense_categories_used,
            distinct_income_categories_used=distinct_income_categories_used,
            recent_expenses=recent_expenses,
            recent_incomes=recent_incomes,
            budget_snapshot=budget_snapshot,
            recurring_snapshot=recurring_snapshot,
        )

    @classmethod
    def build_context(
        cls,
        db: Session,
        user_id: int,
        period: str = "monthly",
    ) -> FinancialAIContext:
        """Collect analytics and convert them into an AI-ready snapshot."""

        now = datetime.utcnow()
        dashboard = AnalyticsService.get_dashboard_overview(db, user_id, period)
        score = dashboard.financial_score

        lookback_months = cls._PERIOD_LOOKBACK_MONTHS.get(period, 3)
        end_date = date.today()
        start_date = end_date - timedelta(days=cls._months_to_days(lookback_months))

        cashflow = AnalyticsService.get_cashflow_analysis(db, user_id, start_date, end_date)
        savings_trends = AnalyticsService.get_savings_trends(db, user_id, lookback_months)
        project_snapshot = cls._build_project_snapshot(db, user_id)

        top_categories = [
            AIContextTopCategory(
                category_id=item.category_id,
                category_name=item.category_name,
                total_spent=item.total_spent,
                transaction_count=item.transaction_count,
                percentage_of_total=item.percentage_of_total,
                average_transaction=item.average_transaction,
                trend=item.trend,
            )
            for item in dashboard.top_expense_categories
        ]

        return FinancialAIContext(
            user_id=user_id,
            period=period,
            generated_at=now,
            score=score.score,
            savings_rate_score=score.savings_rate_score,
            budget_adherence_score=score.budget_adherence_score,
            expense_stability_score=score.expense_stability_score,
            income_stability_score=score.income_stability_score,
            total_income=dashboard.total_income,
            total_expenses=dashboard.total_expenses,
            monthly_savings=dashboard.net_savings,
            savings_rate=dashboard.savings_rate,
            average_daily_spending=dashboard.average_daily_spending,
            average_transaction_amount=dashboard.average_transaction_amount,
            budgets_met=dashboard.budgets_met,
            budgets_exceeded=dashboard.budgets_exceeded,
            budget_utilization_percentage=dashboard.budget_utilization_percentage,
            top_categories=top_categories,
            cashflow=cashflow,
            savings_trends=savings_trends,
            project_modules=list(cls._PROJECT_MODULES),
            project_snapshot=project_snapshot,
            baseline_insights=list(score.insights),
            baseline_recommendations=list(score.recommendations),
        )
