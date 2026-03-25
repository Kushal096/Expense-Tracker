# Expense Tracker

Monorepo for an Expense Tracker application with:
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL (authentication implemented)
- **Frontend**: Workspace scaffold present (implementation pending)

---

## Repository Structure

```text
Expense-Tracker/
├── expense-tracker-backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env
│   └── app/
│       ├── core/
│       ├── db/
│       ├── models/
│       ├── routes/
│       ├── schemas/
│       └── services/
└── expense-tracker-frontend/
    └── .keep
```

---

## Current Status

### ✅ Backend (Working)
- User signup endpoint
- User login endpoint (JWT access token)
- Auto table creation using `Base.metadata.create_all(...)`
- Interactive API docs via Swagger/ReDoc

### 🚧 Frontend (Not implemented yet)
- Frontend folder exists as a placeholder
- No UI code committed yet

---

## Backend Setup

From repository root:

```bash
cd expense-tracker-backend
python3 -m venv expenseVenv
source expenseVenv/bin/activate
pip install -r requirements.txt
```

Create `expense-tracker-backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://<username>:<password>@localhost:5432/<database_name>
SECRET_KEY=replace_with_secure_random_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=3600
```

Run the backend:

```bash
uvicorn main:app --reload
```

Backend URLs:
- API base: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

---

## API Endpoints (Implemented)

### 1) Signup
**POST** `/auth/signup`

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
  "created_at": "2026-03-25T09:30:00+00:00"
}
```

Errors:
- `400` Email already registered
- `422` Validation error

Validation notes:
- `email` must be valid
- `username` minimum length is `2`
- `password` minimum length is `6`

### 2) Login
**POST** `/auth/login`

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
- `401` Invalid credentials
- `422` Validation error

---

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

---

## Frontend Integration Notes

After login, send the token in authenticated requests:

```http
Authorization: Bearer <access_token>
```

Recommended next step for frontend:
1. Build auth pages (Signup/Login)
2. Connect to `/auth/signup` and `/auth/login`
3. Store token safely and use it in subsequent API calls

---

## Notes

- Keep secrets out of version control (`.env` should stay local)
- Use different environment values for dev/staging/prod
- Add migrations (Alembic) when schema evolves
