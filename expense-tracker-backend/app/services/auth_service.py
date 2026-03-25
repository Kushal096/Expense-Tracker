"""Authentication service functions.

Business logic for password hashing, user creation, lookup, and JWT generation.
"""

from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user_schema import UserCreate
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
import os

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")

# Password hashing
def hash_password(password: str) -> str:
    """Hash plaintext password using configured Passlib context."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against hashed password."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        return False

# Create user
def create_user(db: Session, user: UserCreate) -> User:
    """Create and persist a new user record."""
    hashed = hash_password(user.password)
    db_user = User(email=user.email, username=user.username, password_hash=hashed)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Get user by email
def get_user_by_email(db: Session, email: str) -> User | None:
    """Return user by email, or None when not found."""
    return db.query(User).filter(User.email == email).first()

# JWT token creation
def create_access_token(data: dict) -> str:
    """Create JWT access token.

    Expected payload includes `user_id`. Expiry is set from env config.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt