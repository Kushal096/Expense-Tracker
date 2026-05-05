# Expense Tracker

Expense Tracker is a full-stack application for managing personal finances. Track your income and expenses with a clean, easy-to-use interface backed by a powerful API.

---

## 📁 Project Structure

```text
Expense-Tracker/
├── expense-tracker-backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── app/
│   │   ├── core/
│   │   ├── db/
│   │   ├── dependencies/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   └── services/
│   └── alembic/
│       └── versions/
│
└── expense-tracker-frontend/
    ├── login.html
    ├── signup.html
    ├── dashboard.html
    ├── income.html
    ├── expenses.html
    ├── scripts/
    │   ├── api.js
    │   ├── auth.js
    │   ├── dashboard.js
    │   ├── income.js
    │   └── expenses.js
    └── styles/
        ├── login.css
        ├── signup.css
        ├── dashboard.css
        ├── income.css
        └── expenses.css
```

---

## ✨ Features

### Backend
- User authentication (signup/login with JWT)
- Category management
- Income tracking
- Expense tracking
- Dashboard with summary statistics
- Database migrations using Alembic

### Frontend
- Login and signup pages
- Dashboard with financial overview
- Income management interface
- Expense management interface
- Responsive UI with styling

---

## 🚀 Backend Setup

### Prerequisites
- Python 3.8+
- PostgreSQL
- pip

### Installation Steps

1. **Navigate to backend directory:**
   ```bash
   cd expense-tracker-backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   python3 -m venv expenseVenv
   source expenseVenv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   
   Create `.env` file in `expense-tracker-backend/`:
   ```env
   DATABASE_URL=postgresql+psycopg2://<username>:<password>@localhost:5432/<dbname>
   SECRET_KEY=your_secure_secret_key_here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=3600
   ```

5. **Run migrations (if needed):**
   ```bash
   alembic upgrade head
   ```

6. **Start the development server:**
   ```bash
   uvicorn main:app --reload
   ```

### Backend URLs
- API: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

---

## 🎨 Frontend Setup

The frontend consists of static HTML, CSS, and JavaScript files.

### Option 1: Direct Browser
Open any `.html` file directly in your web browser.

### Option 2: Local Server
Serve the frontend folder using a local server:

```bash
cd expense-tracker-frontend
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080` in your browser.

---

## 📡 API Endpoints

### Authentication
- `POST /auth/signup` - Register a new user
- `POST /auth/login` - Login and get JWT token

### Categories
- `GET /categories/` - List all categories
- `POST /categories/` - Create a category
- `PATCH /categories/{id}` - Update a category
- `DELETE /categories/{id}` - Delete a category

### Income
- `GET /incomes/` - List all incomes (authenticated)
- `POST /incomes/` - Create income (authenticated)
- `GET /incomes/{id}` - Get specific income (authenticated)
- `PATCH /incomes/{id}` - Update income (authenticated)
- `DELETE /incomes/{id}` - Delete income (authenticated)

### Expenses
- `GET /expenses/` - List all expenses (authenticated)
- `POST /expenses/` - Create expense (authenticated)
- `GET /expenses/{id}` - Get specific expense (authenticated)
- `PATCH /expenses/{id}` - Update expense (authenticated)
- `DELETE /expenses/{id}` - Delete expense (authenticated)

### Dashboard
- `GET /dashboard/summary` - Get financial summary (authenticated)

---

## 🔐 Authentication

Protected API endpoints require the JWT token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

Get your token by calling `POST /auth/login` with valid credentials.

---

## 💾 Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts and credentials
- `categories` - Expense/income categories
- `incomes` - Income records
- `expenses` - Expense records

---

## 🛠 Development

### Tech Stack
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL, Pydantic
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Database Migration:** Alembic

### Making Changes
1. See [contribution.md](contribution.md) for the complete workflow
2. Always work on a feature branch
3. Test locally before pushing
4. Submit a pull request for review

---

## 📝 Environment Variables

Create a `.env` file in `expense-tracker-backend/`:

```env
# Database
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/expense_db

# JWT Security
SECRET_KEY=your_secret_key_change_this_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=3600
```

**Keep `.env` local and never commit it to version control.**

---

## ✅ Testing

### Backend
Start the server and test endpoints using:
- Swagger UI at `http://127.0.0.1:8000/docs`
- ReDoc at `http://127.0.0.1:8000/redoc`
- cURL or Postman

### Frontend
Open pages in browser and verify:
- Forms work correctly
- API calls complete successfully
- Data displays properly

---

## 📚 Learn More

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)

---

## 📖 Contributing

Please read [contribution.md](contribution.md) for details on our code contribution process, branch strategy, and development workflow.

---

## 📄 License

This project is provided as-is for educational purposes.
