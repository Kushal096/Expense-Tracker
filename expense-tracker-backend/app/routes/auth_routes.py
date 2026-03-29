"""Auth routes.

Contains frontend-facing authentication endpoints:
- POST /auth/signup
- POST /auth/login
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.schemas.user_schema import UserCreate, UserLogin, UserResponse, Token
from app.services.auth_service import create_user, get_user_by_email, verify_password, create_access_token
from app.db.database import get_db


limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["auth"])

@router.post(
    "/signup",
    response_model=UserResponse,
    summary="Register a new user",
    description="Creates a user account if the email is not already registered.",
)
@limiter.limit("5/minute")
def signup(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user.

    Returns the created user object (without password hash).
    """
    if get_user_by_email(db, user.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    return create_user(db, user)

@router.post(
    "/login",
    response_model=Token,
    summary="Login and get JWT",
    description="Validates user credentials and returns a bearer access token.",
)
@limiter.limit("5/minute")
def login(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token for Authorization header."""
    db_user = get_user_by_email(db, user.email)
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"user_id": db_user.id})
    return {"access_token": token, "token_type": "bearer"}