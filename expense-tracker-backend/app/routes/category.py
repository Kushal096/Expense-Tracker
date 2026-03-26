from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.category_schema import CategoryBase
from app.services.category_service import get_all_categories, create_category, update_category, delete_category
from app.db.database import get_db

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/", summary="Get all categories", description="Returns a list of all expense categories.")
def read_categories(db: Session = Depends(get_db)):
    """Fetch all categories."""
    return get_all_categories(db)

@router.post("/", summary="Create a new category", description="Creates a new expense category with a unique name.")
def create_new_category(category: CategoryBase, db: Session = Depends(get_db)):
    """Create a new category."""
    return create_category(db, category.name)

@router.put("/{category_id}", summary="Update a category", description="Updates the name of an existing category by ID.")
def update_existing_category(category_id: int, category: CategoryBase, db: Session = Depends(get_db)):
    """Update an existing category."""
    updated_category = update_category(db, category_id, category.name)
    if not updated_category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return updated_category

@router.delete("/{category_id}", summary="Delete a category", description="Deletes an existing category by ID.")
def delete_existing_category(category_id: int, db: Session = Depends(get_db)):
    """Delete an existing category."""
    deleted_category = delete_category(db, category_id)
    if not deleted_category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return {"detail": "Category deleted successfully"}

