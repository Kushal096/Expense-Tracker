from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.db.database import engine
from app.routes.auth_routes import router as auth_router
from app.routes.category_routes import router as category_router
from app.routes.expense_routes import router as expense_router
from app.routes.income_routes import router as income_router
from app.routes.dashboard import router as dashboard_router
from app.routes.recurring_routes import router as recurring_router
from app.routes.analytics_routes import router as analytics_router
from app.routes.export_routes import router as export_router
from app.routes.budget_routes import router as budget_router
from app.routes.ai_routes import router as ai_router
from app.services.category_service import seed_default_categories

app = FastAPI(
    title="Expense Tracker Backend",
    version="1.0.0",
    description="Backend API for Expense Tracker built with FastAPI + SQLAlchemy."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5501",
        "http://localhost:5501"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(category_router)
app.include_router(expense_router)
app.include_router(income_router)
app.include_router(dashboard_router)
app.include_router(recurring_router)
app.include_router(analytics_router)
app.include_router(export_router)
app.include_router(budget_router)
app.include_router(ai_router)


@app.on_event("startup")
def startup_event():
    with Session(bind=engine) as db:
        seed_default_categories(db)