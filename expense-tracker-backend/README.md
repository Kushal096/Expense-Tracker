# Expense Tracker Backend

FastAPI backend for authentication and category management in the Expense Tracker project.

## Features
- User signup
- User login with JWT bearer token
- Protected category CRUD endpoints
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
    │   └── category_models.py
    ├── routes/
    │   ├── auth_routes.py
    │   └── category_routes.py
    ├── schemas/
    │   ├── user_schema.py
    │   └── category_schema.py
    └── services/
        ├── auth_service.py
        └── category_service.py
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

## API Reference (Frontend-Focused)

### Auth APIs

#### `POST /auth/signup`
Creates a new user.

Request body:

```json
{
  "email": "alice@example.com",
  "username": "alice",
  "password": "StrongPassword@123"
}
```

Success response (`201`):

```json
{
  "id": 1,
  "email": "alice@example.com",
  "username": "alice",
  "created_at": "2026-03-25T09:30:00.000000+00:00"
}
```

Errors:
- `400`: email already registered
- `422`: validation error

#### `POST /auth/login`
Authenticates user and returns JWT.

Request body:

```json
{
  "email": "alice@example.com",
  "password": "StrongPassword@123"
}
```

Success response (`200`):

```json
{
  "access_token": "<jwt_token>",
  "token_type": "bearer"
}
```

Errors:
- `401`: invalid credentials
- `422`: validation error

### Category APIs

> `POST`, `PUT`, and `DELETE` category routes are protected and require a bearer token.

#### `GET /categories/`
Returns all categories.

Success response (`200`):

```json
[
  { "id": 1, "name": "Food" },
  { "id": 2, "name": "Transport" }
]
```

#### `POST /categories/`
Creates a category (authenticated).

Headers:

```http
Authorization: Bearer <access_token>
```

Request body:

```json
{
  "name": "Travel"
}
```

#### `PUT /categories/{category_id}`
Updates category name by ID (authenticated).

Request body:

```json
{
  "name": "Bills"
}
```

Errors:
- `404`: category not found

#### `DELETE /categories/{category_id}`
Deletes category by ID (authenticated).

Errors:
- `404`: category not found

## Frontend Integration Notes
- Use token from `/auth/login` for protected routes.
- Send `Authorization: Bearer <token>` in request headers.
- `token_type` is always `bearer`.
- `created_at` is an ISO UTC timestamp.
- Prefer frontend constants for API paths:
  - `/auth/signup`
  - `/auth/login`
  - `/categories/`
- Prefer handling these error statuses globally in frontend API client:
  - `401` unauthorized
  - `404` resource not found
  - `422` validation error

## Example Frontend Usage

```ts
const loginResponse = await fetch("http://127.0.0.1:8000/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

const { access_token } = await loginResponse.json();

await fetch("http://127.0.0.1:8000/categories/", {
  headers: { Authorization: `Bearer ${access_token}` },
});
```

## Development Notes
- Keep `SECRET_KEY` private and out of Git.
- Use separate `.env` values for local, staging, and production.
- For production, configure strict CORS and HTTPS.
