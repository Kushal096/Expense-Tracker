"""Category service layer.

Contains category CRUD operations and default seed data helpers.
"""

from sqlalchemy.orm import Session
from app.models.category_models import Category
from app.schemas.category_schema import CategoryResponse


DEFAULT_CATEGORIES = ["Food", "Transport", "Entertainment", "Utilities", "Health", "Other"]

def get_all_categories(db: Session) -> list[CategoryResponse]:
    """Return all categories."""
    return db.query(Category).all()

def create_category(db: Session, name: str) -> CategoryResponse:
    """Create and return a category by name."""
    category = Category(name=name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)

def update_category(db: Session, category_id: int, name: str) -> CategoryResponse | None:
    """Update category name and return updated category."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        return None
    category.name = name
    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)

def delete_category(db: Session, category_id: int) -> Category | None:
    """Delete and return category when found."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        return None
    db.delete(category)
    db.commit()
    return category

def seed_default_categories(db: Session) -> None:
    """Seed default categories only when category table is empty."""
    existing_categories = db.query(Category).count()
    if existing_categories == 0:
        for name in DEFAULT_CATEGORIES:
            create_category(db, name)
    db.commit()