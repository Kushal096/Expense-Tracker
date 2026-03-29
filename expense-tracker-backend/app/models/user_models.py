from sqlalchemy import DateTime, Column, Integer, String
from datetime import datetime, timezone
from app.db.database import Base


class User(Base):
    """Database user entity.

    Frontend-safe fields: id, email, username, created_at.
    Sensitive field: password_hash (never returned in API responses).
    """

    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))