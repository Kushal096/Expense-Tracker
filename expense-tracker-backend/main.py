"""Application entrypoint.

Exposes FastAPI app and registers all routers.
Frontend developers can use `/docs` to inspect request/response contracts.
"""

from fastapi import FastAPI
from app.db.database import Base, engine
from app.routes.auth import router as auth_router

app = FastAPI(
	title="Expense Tracker Backend",
	version="1.0.0",
	description="Authentication backend APIs for the Expense Tracker app.",
)


Base.metadata.create_all(bind=engine)

app.include_router(auth_router)