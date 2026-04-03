"""Category service layer.

Contains category CRUD operations and default seed data initialization.
Categories are shared across all users but are typically seeded with predefined values.

Default categories are initialized on first application startup if the category table is empty.
Categories are typically referenced by expenses and cannot be deleted if expenses depend on them.

Example:
    Seed default categories:
        seed_default_categories(db)  # Only seeds if table is empty
    
    Create a new category:
        category = create_category(db, "Shopping")
    
    Fetch all categories for UI:
        categories = get_all_categories(db)
"""

from sqlalchemy.orm import Session
from app.models.category_models import Category
from app.schemas.category_schema import CategoryResponse


DEFAULT_CATEGORIES = ["Food", "Transport", "Entertainment", "Utilities", "Health", "Other"]


def get_all_categories(db: Session) -> list[CategoryResponse]:
    """Fetch all available categories.
    
    Args:
        db: SQLAlchemy database session.
    
    Returns:
        list[CategoryResponse]: List of all categories in database.
                               Empty list if no categories exist.
    
    Note:
        - This operation is O(n) where n is the number of categories.
        - Results are unordered (insertion order).
        - This endpoint is typically called on app load for dropdown/select UIs.
        - All users see the same categories.
    
    Use cases:
        - Populate category dropdown in expense creation form.
        - Display category list to users.
        - Validate category_id when creating expenses.
    """
    return db.query(Category).all()


def create_category(db: Session, name: str) -> CategoryResponse:
    """Create a new category with the specified name.
    
    Args:
        db: SQLAlchemy database session.
        name: Category name (e.g., "Food", "Transport"). Should be unique.
    
    Returns:
        CategoryResponse: Created category object with auto-generated ID.
    
    Raises:
        SQLAlchemy IntegrityError if category name already exists.
    
    Note:
        - Category names are unique across the database.
        - The category is immediately committed and available to all users.
        - Typical use cases: Admin adds custom categories, or seeding defaults.
        - Created categories are shared by all users in the system.
    
    Caution:
        - Enforcing unique names at database level prevents duplicates.
        - If creation fails with IntegrityError, catch it in the route layer.
    """
    category = Category(name=name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)


def update_category(db: Session, category_id: int, name: str) -> CategoryResponse | None:
    """Update an existing category's name.
    
    Args:
        db: SQLAlchemy database session.
        category_id: ID of the category to update.
        name: New category name. Should be unique.
    
    Returns:
        CategoryResponse | None: Updated category object if found, None otherwise.
    
    Raises:
        SQLAlchemy IntegrityError if new name already exists.
    
    Note:
        - Update affects all expenses linked to this category across all users.
        - Returns None if category_id does not exist.
        - The change is immediately committed and visible to all users.
        - Useful for renaming predefined or user-created categories.
    
    Caution:
        - Changing a category name affects all expenses using that category.
        - If update fails with IntegrityError (duplicate name), catch it in route layer.
    """
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        return None
    category.name = name
    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)


def delete_category(db: Session, category_id: int) -> Category | None:
    """Delete a category by ID.
    
    Args:
        db: SQLAlchemy database session.
        category_id: ID of the category to delete.
    
    Returns:
        Category | None: Deleted category object if found, None otherwise.
    
    Raises:
        SQLAlchemy IntegrityError if expenses reference this category (foreign key constraint).
    
    Note:
        - Deletion affects all users and all expenses linked to this category.
        - Returns None if category_id does not exist.
        - The deletion is immediately committed.
        - WARNING: If expenses depend on this category, deletion will fail.
    
    Caution:
        - Do NOT delete categories that are still referenced by expenses.
        - The database enforces referential integrity and will raise an error.
        - Recommend: Implement soft delete or reassign expenses before deletion.
        - Once deleted, the category ID is lost and cannot be recovered.
    """
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        return None
    db.delete(category)
    db.commit()
    return category


def seed_default_categories(db: Session) -> None:
    """Initialize default categories if the table is empty.
    
    Args:
        db: SQLAlchemy database session.
    
    Note:
        - This function is called on application startup by main.py.
        - It only creates categories if the table is completely empty.
        - Idempotent: Safe to call multiple times; subsequent calls do nothing.
        - Designed to run once per database instance.
        - Default categories: Food, Transport, Entertainment, Utilities, Health, Other.
    
    Use cases:
        - Initialize database for new environments.
        - Ensure users always have basic categories available.
        - Prevent application startup errors due to missing categories.
    
    Warning:
        - Does NOT restore categories if they are accidentally deleted.
        - Does NOT re-run if categories already exist (cannot customize after init).
        - For custom seeding, modify DEFAULT_CATEGORIES list or extend logic.
    """
    existing_categories = db.query(Category).count()
    if existing_categories == 0:
        for name in DEFAULT_CATEGORIES:
            create_category(db, name)
    db.commit()