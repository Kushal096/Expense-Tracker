# services/category_service.py
from sqlalchemy.orm import Session
from app.models.category_models import Category


Default_CATEGORIES = ["Food", "Transport", "Entertainment", "Utilities", "Health", "Other"]

def get_all_categories(db: Session):
    return db.query(Category).all()

def create_category(db: Session, name: str):
    category = Category(name=name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

def update_category(db: Session, category_id: int, name: str):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        return None
    category.name = name
    db.commit()
    db.refresh(category)
    return category

def delete_category(db: Session, category_id: int):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        return None
    db.delete(category)
    db.commit()
    return category

def seed_default_categories(db: Session):
    existing_categories = db.query(Category).count()
    if existing_categories == 0:
        for name in Default_CATEGORIES:
            create_category(db, name)
    db.commit()