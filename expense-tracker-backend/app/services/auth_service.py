"""Authentication service layer.

Business logic for user registration, login, password hashing, and JWT token management.
This module handles all authentication-related operations securely.

Security practices:
    - Passwords are hashed using bcrypt-sha256 via Passlib.
    - Plaintext passwords are never stored or logged.
    - JWT tokens are signed with a secret key and include expiration.
    - Token verification ensures integrity and checks expiration.

Environment requirements:
    - SECRET_KEY: A secure random string for signing JWTs.
    - ALGORITHM: JWT algorithm (typically HS256).
    - ACCESS_TOKEN_EXPIRE_MINUTES: Token lifetime in minutes.

Example:
    Create a new user:
        user = create_user(db, UserCreate(email="alice@example.com", username="alice", password="secret123"))
    
    Authenticate and create token:
        user = get_user_by_email(db, "alice@example.com")
        if user and verify_password("secret123", user.password_hash):
            token = create_access_token({"user_id": user.id})
"""

from sqlalchemy.orm import Session
from app.models.user_models import User
from app.schemas.user_schema import UserCreate, UserResponse
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
import os

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 3600))

pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")


# Password hashing
def hash_password(password: str) -> str:
    """Hash plaintext password using bcrypt-sha256.
    
    Args:
        password: Plain text password from user input.
    
    Returns:
        str: Hashed password safe for storage in database.
    
    Note:
        - Hashing is computationally expensive by design (slow-hash).
        - Same password will produce different hashes on each call.
        - Hashes are ~60 characters long.
        - This function never logs the plaintext password.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against hashed password.
    
    Args:
        plain_password: Plain text password from user input.
        hashed_password: Stored hash from database.
    
    Returns:
        bool: True if password matches hash, False otherwise.
    
    Note:
        - Uses timing-secure comparison to prevent timing attacks.
        - Returns False on any error (e.g., corrupted hash).
        - Never logs passwords during verification.
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        # Hash is invalid or corrupted
        return False


# User creation
def create_user(db: Session, user: UserCreate) -> UserResponse:
    """Create and persist a new user record in the database.
    
    Args:
        db: SQLAlchemy database session.
        user: User registration payload (email, username, password).
    
    Returns:
        UserResponse: Created user object (without password_hash).
    
    Raises:
        SQLAlchemy IntegrityError if email is already registered.
    
    Note:
        - Password is automatically hashed before storage.
        - Email uniqueness is enforced by database constraint.
        - The returned UserResponse never includes the password_hash.
        - DB commit happens immediately; no rollback possible after return.
    """
    hashed = hash_password(user.password)
    db_user = User(email=user.email, username=user.username, password_hash=hashed)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return UserResponse.model_validate(db_user)


# Get user
def get_user_by_email(db: Session, email: str) -> User | None:
    """Retrieve user record by email address.
    
    Args:
        db: SQLAlchemy database session.
        email: User email to search for.
    
    Returns:
        User | None: User object if found, None if not found.
    
    Note:
        - Email lookup is case-sensitive by default (depends on database).
        - This function returns the full User object including password_hash.
        - Should only be called internally; never expose to frontend.
        - Query uses database index for fast lookup.
    """
    return db.query(User).filter(User.email == email).first()


# JWT token creation
def create_access_token(data: dict) -> str:
    """Create a JWT access token with expiration.
    
    Args:
        data: Payload dictionary (typically {"user_id": <int>}).
    
    Returns:
        str: Encoded JWT token string safe for HTTP transmission.
    
    Note:
        - Token expiry is set from ACCESS_TOKEN_EXPIRE_MINUTES env variable.
        - Signature uses SHA256 with SECRET_KEY.
        - Token includes "exp" (expiration time) claim.
        - Frontend should store this token and include it in Authorization header.
        
    Token format:
        Authorization: Bearer <access_token>
    
    Example:
        token = create_access_token({"user_id": 42})
        # Token can be verified with: verify_token(token)
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict | None:
    """Verify JWT token and return decoded payload.
    
    Args:
        token: JWT token string from Authorization header.
    
    Returns:
        dict | None: Decoded payload (e.g., {"user_id": 42, "exp": ...}) if valid.
                    None if token is invalid, expired, or tampered.
    
    Note:
        - Signature validation ensures token was not tampered.
        - Expiration check ensures token is still valid.
        - Any JWTError (invalid format, wrong signature, expired) returns None.
        - This function is called by auth_dependencies.get_current_user().
        - Payload must include "user_id" to be considered valid by the API.
    
    Example:
        payload = verify_token(token)
        if payload:
            user_id = payload.get("user_id")
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        # Token is invalid, expired, or tampered
        return None