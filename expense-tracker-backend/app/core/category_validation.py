"""Category validation utilities.

This module provides shared functions for validating categories,
reducing duplication across expense and income services.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.category_models import Category


def get_valid_category(
    db: Session,
    category_id: int,
    category_type: str
) -> Category:
    """Validate and retrieve a category of a specific type."""

    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.type == category_type
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or unavailable {category_type} category",
        )

    return category


def suggest_category_by_description(
    db: Session,
    description: str,
    category_type: str = "expense"
):
    """
    Suggest category based on expense description.
    """

    description = description.lower()

    keyword_mapping = {

        "Food": [
            "pizza",
            "burger",
            "restaurant",
            "coffee",
            "food",
            "kfc",
            "momo",
            "cafe"
        ],

        "Transport": [
            "bus",
            "taxi",
            "uber",
            "fuel",
            "petrol",
            "pathao"
        ],

        "Shopping": [
            "shirt",
            "clothes",
            "amazon",
            "shoes",
            "flipkart"
        ],

        "Entertainment": [
            "movie",
            "netflix",
            "spotify",
            "game",
            "youtube"
        ],

        "Bills": [
            "wifi",
            "internet",
            "electricity",
            "water",
            "ntc"
        ]
    }

    matched_category_name = None

    for category_name, keywords in keyword_mapping.items():

        for keyword in keywords:

            if keyword in description:
                matched_category_name = category_name
                break

        if matched_category_name:
            break

    if not matched_category_name:
        return None

    category = (
        db.query(Category)
        .filter(
            Category.name.ilike(matched_category_name),
            Category.type == category_type
        )
        .first()
    )

    return category