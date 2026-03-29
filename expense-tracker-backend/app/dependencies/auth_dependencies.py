"""Authentication dependencies shared by protected routes.

Frontend should send JWT in header:
`Authorization: Bearer <access_token>`.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.services.auth_service import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    """Resolve and validate JWT payload from bearer token.

    Returns decoded token payload when valid.
    Raises 401 when token is invalid or expired.
    """
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    return payload