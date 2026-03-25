# Expense Tracker Backend

FastAPI backend for authentication in the Expense Tracker project.

This service currently provides:
- User signup
- User login (JWT token generation)

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
    │   ├── base.py
    │   └── database.py
    ├── models/
    │   └── user.py
    ├── routes/
    │   └── auth.py
    ├── schemas/
    │   └── user_schema.py
    └── services/
        └── auth_service.py
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

1. Create and activate virtual environment:
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

4. Open docs:
   - Swagger UI: `http://127.0.0.1:8000/docs`
   - ReDoc: `http://127.0.0.1:8000/redoc`

## API Reference (Frontend-Focused)

Base URL (local):

```text
http://127.0.0.1:8000
```

### 1) Signup
`POST /auth/signup`

Request body:

```json
{
  "email": "alice@example.com",
  "username": "alice",
  "password": "StrongPassword@123"
}
```

Success response (`200`):

```json
{
  "id": 1,
  "email": "alice@example.com",
  "username": "alice",
  "created_at": "2026-03-25T09:30:00.000000+00:00"
}
```

Validation / business errors:
- `400`: email already registered
- `422`: invalid payload (e.g., bad email format, missing fields)

### 2) Login
`POST /auth/login`

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

Authentication errors:
- `401`: invalid credentials
- `422`: invalid payload

## Frontend Integration Notes
- Store `access_token` securely (in-memory preferred; avoid localStorage for high-security contexts).
- Send token in authenticated calls using:
  ```http
  Authorization: Bearer <access_token>
  ```
- `token_type` is always `bearer`.
- `created_at` is UTC ISO timestamp.
- Route prefix for auth APIs is `/auth`.

## Current Limitations / Next Backend Steps
- No refresh token flow yet.
- No protected sample endpoint yet (JWT validation middleware/dependency can be added next).
- No Alembic migration setup yet (table creation currently via `Base.metadata.create_all`).

## Quick cURL Tests

Signup:

```bash
curl -X POST http://127.0.0.1:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","username":"alice","password":"StrongPassword@123"}'
```

Login:

```bash
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"StrongPassword@123"}'
```

## Development Notes
- Keep `SECRET_KEY` out of git.
- Use different `.env` values for local, staging, and production.
- For production, set stricter CORS and HTTPS only.
