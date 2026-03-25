"""Database configuration and session management.

`get_db` is used as a FastAPI dependency in route handlers.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Provide a SQLAlchemy session per request and close it safely."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()