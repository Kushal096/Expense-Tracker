"""Category validation utilities.

This module provides shared functions for validating categories,
reducing duplication across expense and income services.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.category_models import Category


def get_valid_category(db: Session, category_id: int, category_type: str) -> Category:
    """Validate and retrieve a category of a specific type.
    
    Args:
        db: SQLAlchemy database session
        category_id: ID of the category to validate
        category_type: Expected category type ("expense" or "income")
    
    Returns:
        Category: The validated category object
    
    Raises:
        HTTPException (400): If category doesn't exist or type doesn't match
    
    Example:
        category = get_valid_category(db, 1, "expense")
        category = get_valid_category(db, 2, "income")
    """
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.type == category_type)
        .first()
    )
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or unavailable {category_type} category",
        )
    return category
