import jwt
from datetime import datetime, timedelta
from fastapi import Request
from typing import Optional
from app.core import config

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

GUEST_USER = {
    "sub": "guest",
    "email": "",
    "name": "Guest",
    "picture": None,
    "authenticated": False,
}

def get_current_user_optional(request: Request) -> Optional[dict]:
    token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        # Check if the token starts with 'Bearer ' which some clients might send
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
            
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def get_current_user(request: Request) -> dict:
    """Returns the authenticated user payload, or an anonymous Guest user when not logged in."""
    user = get_current_user_optional(request)
    if not user:
        return dict(GUEST_USER)
    user["authenticated"] = True
    return user
