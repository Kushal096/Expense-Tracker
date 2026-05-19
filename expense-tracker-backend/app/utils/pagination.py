"""Pagination utilities for handling offset/limit queries."""

from pydantic import BaseModel
from typing import TypeVar, Generic

T = TypeVar("T")


class PaginationMetadata(BaseModel):
    """Pagination metadata for response."""
    
    total: int
    page: int
    limit: int
    pages: int
    has_next: bool
    has_previous: bool


class PaginatedList(BaseModel, Generic[T]):
    """Generic paginated response."""
    
    items: list[T]
    total: int
    page: int
    limit: int
    pages: int
    has_next: bool
    has_previous: bool
