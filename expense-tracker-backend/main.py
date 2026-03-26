"""Application entrypoint.

Exposes FastAPI app and registers all routers.
Frontend developers can use `/docs` to inspect request/response contracts.
"""

from fastapi import FastAPI
from app.db.database import Base, engine
from app.routes.auth import router as auth_router
from app.routes.category import router as category_router
from app.services.category_service import seed_default_categories
from sqlalchemy.orm import Session

app = FastAPI(
	title="Expense Tracker Backend",
	version="1.0.0",
	description="Backend API for the Expense Tracker application, built with FastAPI and SQLAlchemy."
)


Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(category_router)

with Session(bind=engine) as db:
	seed_default_categories(db)