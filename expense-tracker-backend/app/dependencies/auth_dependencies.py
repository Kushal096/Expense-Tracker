from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth_service import verify_token

# ✅ SIMPLE BEARER (NO OAUTH UI)
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Validate JWT from Authorization: Bearer <token>"""
    token = credentials.credentials

    payload = verify_token(token)

    if not payload or payload.get("user_id") is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    return payload


def extract_user_id(current_user: dict) -> int:
    """Extract user_id from JWT payload"""
    user_id = current_user.get("user_id")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    return int(user_id)