from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr = Field(..., description="User email", examples=["alice@example.com"])
    username: str = Field(..., min_length=2, description="Public username", examples=["alice"])
    password: str = Field(..., min_length=6, description="Plain password sent from client")


class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="Registered email", examples=["alice@example.com"])
    password: str = Field(..., description="Plain password for authentication")


class UserResponse(BaseModel):
    """User payload returned to client (safe fields only)."""

    id: int
    email: EmailStr
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Bearer token response returned after successful login."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(..., description="Token type, usually 'bearer'")
