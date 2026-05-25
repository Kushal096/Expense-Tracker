"""Base CRUD service providing generic operations for database entities.

This module provides reusable CRUD operation patterns for entities like
Expense and Income, reducing code duplication across service modules.

Classes:
    BaseCRUDService: Generic CRUD service for entities with user isolation.
"""

from typing import TypeVar, Generic, Type, Optional, List
from sqlalchemy.orm import Session
from pydantic import BaseModel

# Type variables for generic CRUD operations
T = TypeVar("T")  # Database model type
CreateSchema = TypeVar("CreateSchema", bound=BaseModel)  # Create request schema
ResponseSchema = TypeVar("ResponseSchema", bound=BaseModel)  # Response schema


class BaseCRUDService(Generic[T, CreateSchema, ResponseSchema]):
    """Generic CRUD service for user-owned entities.
    
    This class encapsulates common database operations for entities
    that enforce user ownership and isolation (e.g., Expense, Income).
    
    Type parameters:
        T: SQLAlchemy model class (e.g., Expense, Income)
        CreateSchema: Pydantic schema for create operations
        ResponseSchema: Pydantic schema for response serialization
    
    Example:
        class ExpenseCRUD(BaseCRUDService[Expense, ExpenseBase, ExpenseResponse]):
            pass
        
        service = ExpenseCRUD(Expense, ExpenseResponse)
        expense = service.create(db, expense_data, user_id=1)
    """

    def __init__(self, model: Type[T], response_schema: Type[ResponseSchema]):
        """Initialize the CRUD service with a model and response schema.
        
        Args:
            model: SQLAlchemy model class (e.g., Expense, Income)
            response_schema: Pydantic response schema for serialization
        """
        self.model = model
        self.response_schema = response_schema

    def create(
        self, db: Session, obj_data: CreateSchema, user_id: int
    ) -> ResponseSchema:
        """Create a new entity for a user.
        
        Args:
            db: SQLAlchemy database session
            obj_data: Create payload with entity fields
            user_id: ID of the user creating the entity
        
        Returns:
            ResponseSchema: Created entity serialized to response schema
        
        Raises:
            SQLAlchemy exceptions on database errors (e.g., foreign key violations)
        
        Note:
            - Entity is immediately committed to database
            - Timestamps (created_at, updated_at) are set by database
            - User ownership is enforced via user_id foreign key
        """
        # Convert Pydantic schema to dict, excluding user_id
        obj_dict = obj_data.model_dump()
        obj_dict["user_id"] = user_id
        
        # Create and commit entity
        db_obj = self.model(**obj_dict)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        return self.response_schema.model_validate(db_obj)

    def get_all_by_user(
        self,
        db: Session,
        user_id: int,
        page: int = 1,
        limit: int = 10,
    ) -> List[ResponseSchema]:
        """Fetch paginated entities belonging to a user."""

        offset = (page - 1) * limit

        entities = (
            db.query(self.model)
            .filter(self.model.user_id == user_id)
            .offset(offset)
            .limit(limit)
            .all()
        )

        return [
            self.response_schema.model_validate(entity)
            for entity in entities
        ]

    def get_by_id(
        self, db: Session, entity_id: int, user_id: int
    ) -> Optional[ResponseSchema]:
        """Fetch a single entity by ID if it belongs to the user.
        
        Args:
            db: SQLAlchemy database session
            entity_id: ID of the entity to retrieve
            user_id: ID of the user who must own the entity
        
        Returns:
            ResponseSchema | None: Entity if found and owned by user, else None
        
        Note:
            - Returns None if entity doesn't exist OR doesn't belong to user
            - Maintains user isolation and prevents unauthorized access
        """
        entity = (
            db.query(self.model)
            .filter(self.model.id == entity_id, self.model.user_id == user_id)
            .first()
        )
        return self.response_schema.model_validate(entity) if entity else None

    def update(
        self, db: Session, entity_id: int, obj_data: CreateSchema, user_id: int
    ) -> Optional[ResponseSchema]:
        """Update an existing entity owned by the user.
        
        Args:
            db: SQLAlchemy database session
            entity_id: ID of the entity to update
            obj_data: New entity data
            user_id: ID of the user who must own the entity
        
        Returns:
            ResponseSchema | None: Updated entity if found and owned, else None
        
        Note:
            - Only specified fields are updated
            - updated_at timestamp is automatically updated by database
            - Returns None if entity doesn't exist OR doesn't belong to user
        
        Raises:
            SQLAlchemy exceptions on database errors (e.g., foreign key violations)
        """
        entity = (
            db.query(self.model)
            .filter(self.model.id == entity_id, self.model.user_id == user_id)
            .first()
        )
        if not entity:
            return None
        
        # Update only the fields provided in obj_data
        update_dict = obj_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(entity, key, value)
        
        db.commit()
        db.refresh(entity)
        return self.response_schema.model_validate(entity)

    def delete(self, db: Session, entity_id: int, user_id: int) -> bool:
        """Delete an entity owned by the user.
        
        Args:
            db: SQLAlchemy database session
            entity_id: ID of the entity to delete
            user_id: ID of the user who must own the entity
        
        Returns:
            bool: True if entity was deleted, False if not found or not owned
        
        Note:
            - Deletion is immediately committed to database
            - Returns False if entity doesn't exist OR doesn't belong to user
            - Once deleted, entity cannot be recovered
        """
        entity = (
            db.query(self.model)
            .filter(self.model.id == entity_id, self.model.user_id == user_id)
            .first()
        )

        if not entity:
            return False
        
        db.delete(entity)
        db.commit()

        return True