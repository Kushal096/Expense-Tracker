"""Category routes.

Frontend-relevant notes:
- `GET /categories/` is public.
- `POST`, `PUT`, and `DELETE` require `Authorization: Bearer <token>`.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.category_schema import (
    CategoryBase,
    CategoryResponse,
)

from app.services.category_service import (
    get_all_categories,
    create_category,
    update_category,
    delete_category,
)

from app.core.category_validation import (
    suggest_category_by_description
)

from app.db.database import get_db

from app.dependencies.auth_dependencies import (
    get_current_user,
)

router = APIRouter(
    prefix="/categories",
    tags=["categories"]
)


@router.get(
    "/",
    response_model=list[CategoryResponse],
    summary="Get all categories",
    description="Returns a list of all expense categories.",
)
def read_categories(db: Session = Depends(get_db)):
    """Fetch all categories for dropdown/select UIs in frontend forms."""

    return get_all_categories(db)


@router.get(
    "/suggest",
    summary="Suggest category from description",
    description="Returns a suggested category based on expense description.",
)
def suggest_category(
    description: str,
    db: Session = Depends(get_db)
):
    """
    Suggest category using description keywords.
    """

    category = suggest_category_by_description(
        db=db,
        description=description,
        category_type="expense"
    )

    if not category:
        return {
            "suggested_category": None
        }

    return {
        "suggested_category": {
            "id": category.id,
            "name": category.name,
            "type": category.type
        }
    }


@router.post(
    "/",
    response_model=CategoryResponse,
    dependencies=[Depends(get_current_user)],
    summary="Create a new category",
    description="Creates a new expense category with a unique name.",
)
def create_new_category(
    category: CategoryBase,
    db: Session = Depends(get_db)
):
    """Create a category and return the created entity."""

    return create_category(
        db,
        category.name,
        category.type
    )


@router.patch(
    "/{category_id}",
    response_model=CategoryResponse,
    dependencies=[Depends(get_current_user)],
    summary="Update a category",
    description="Updates the name and type of an existing category by ID.",
)
def update_existing_category(
    category_id: int,
    category: CategoryBase,
    db: Session = Depends(get_db)
):
    """Update an existing category and return the updated entity."""

    updated_category = update_category(
        db,
        category_id,
        category.name,
        category.type
    )

    if not updated_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    return updated_category


@router.delete(
    "/{category_id}",
    dependencies=[Depends(get_current_user)],
    summary="Delete a category",
    description="Deletes an existing category by ID.",
)
def delete_existing_category(
    category_id: int,
    db: Session = Depends(get_db)
):
    """Delete an existing category and return confirmation message."""

    deleted_category = delete_category(
        db,
        category_id
    )

    if not deleted_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    return {
        "detail": "Category deleted successfully"
    }