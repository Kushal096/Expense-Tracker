# Expense Tracker Backend

FastAPI backend for authentication, category management, and user expense tracking.

## Features
- User signup and login with JWT bearer authentication
- Public category listing and protected category management
- Protected expense CRUD for authenticated users only
- Default category seeding on startup

## Tech Stack
- FastAPI
- SQLAlchemy
- PostgreSQL
- Pydantic
- Passlib (password hashing)
- python-jose (JWT)

## Project Structure

```text
expense-tracker-backend/
├── main.py
├── requirements.txt
├── .env
└── app/
    ├── core/
    │   └── security.py
    ├── db/
    │   └── database.py
    ├── dependencies/
    │   └── auth_dependencies.py
    ├── models/
    │   ├── user_models.py
    │   ├── category_models.py
    │   └── expense_models.py
    ├── routes/
    │   ├── auth_routes.py
    │   ├── category_routes.py
    │   └── expense_route.py
    ├── schemas/
    │   ├── user_schema.py
    │   ├── category_schema.py
    │   └── expense_schema.py
    └── services/
        ├── auth_service.py
        ├── category_service.py
        └── expense_service.py
```

## Environment Variables
Create a `.env` file in the backend root:

```env
DATABASE_URL=postgresql+psycopg2://expense_user:expense_password@localhost:5432/expense_db
SECRET_KEY=replace_with_secure_random_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=3600
```

## Setup

1. Create and activate a virtual environment:

   ```bash
   python3 -m venv expenseVenv
   source expenseVenv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Run the API:

   ```bash
   uvicorn main:app --reload
   ```

4. Open API docs:
   - Swagger UI: `http://127.0.0.1:8000/docs`
   - ReDoc: `http://127.0.0.1:8000/redoc`

## API Base URL

```text
http://127.0.0.1:8000
```

## Authentication

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

Get token from `POST /auth/login`.

## API Reference

### Auth

- `POST /auth/signup` - register a user (`201`)
- `POST /auth/login` - get JWT token (`200`)

Common auth errors:
- `400` email already registered
- `401` invalid credentials
- `422` validation error

### Categories

- `GET /categories/` - list all categories (public)
- `POST /categories/` - create category (protected)
- `PATCH /categories/{category_id}` - update category (protected)
- `DELETE /categories/{category_id}` - delete category (protected)

Common category errors:
- `401` unauthorized (protected routes)
- `404` category not found

### Expenses

All expense routes are protected and scoped to the authenticated user.

- `GET /expenses/` - list current user expenses
- `POST /expenses/` - create expense
- `GET /expenses/{expense_id}` - get one expense
- `PATCH /expenses/{expense_id}` - update expense
- `DELETE /expenses/{expense_id}` - delete expense

Example expense request body:

```json
{
  "amount": 250.0,
  "category_id": 1,
  "description": "Groceries",
  "date": "2026-03-25T09:30:00Z"
}
```

Common expense errors:
- `401` unauthorized
- `404` expense not found
- `422` validation error

## Frontend Integration Notes
- Store and reuse `access_token` from `/auth/login`.
- Send `Authorization: Bearer <token>` for protected routes.
- `token_type` returned from login is always `bearer`.
- Timestamps are ISO datetime values.

## Development Notes
- Keep `SECRET_KEY` private and out of Git.
- Use separate `.env` values for local/staging/production.
- Restrict CORS origins before production deployment.
