import secrets
import httpx
from urllib.parse import urlencode
from fastapi import APIRouter, Request, Response, Depends, HTTPException
from fastapi.responses import RedirectResponse
from app.core import config
from app.database import get_db
from app.models import User
from app.core.auth import create_access_token, get_current_user
from sqlalchemy.orm import Session

router = APIRouter()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

OAUTH_STATE_COOKIE = "oauth_state"

@router.get("/google/login")
async def login_google():
    # Generate a random CSRF state token and store it as an httpOnly cookie
    state = secrets.token_urlsafe(32)

    params = {
        "client_id": config.GOOGLE_CLIENT_ID,
        "redirect_uri": config.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
    }
    google_login_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    # Set cookie on the SAME RedirectResponse object that gets returned
    response = RedirectResponse(url=google_login_url)
    response.set_cookie(
        key=OAUTH_STATE_COOKIE,
        value=state,
        httponly=True,
        max_age=300,  # 5 minute expiry
        samesite="lax",
        secure=False,  # Set to True in production (HTTPS)
        path="/",     # Ensure cookie is sent on all paths, including /auth/google/callback
    )
    return response


@router.get("/google/callback")
async def auth_google_callback(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    # --- CSRF State Validation ---
    state_in_cookie = request.cookies.get(OAUTH_STATE_COOKIE)
    state_from_google = request.query_params.get("state")
    code = request.query_params.get("code")
    error = request.query_params.get("error")

    print(f"CALLBACK: cookie={state_in_cookie!r}, state={state_from_google!r}")

    if error:
        raise HTTPException(status_code=400, detail=f"Google OAuth error: {error}")

    if not state_in_cookie or not state_from_google:
        raise HTTPException(status_code=400, detail="Missing state parameter or cookie. Please try logging in again.")

    if not secrets.compare_digest(state_in_cookie, state_from_google):
        raise HTTPException(status_code=400, detail="CSRF state mismatch. Please try logging in again.")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code from Google.")

    # --- Exchange code for tokens ---
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": config.GOOGLE_CLIENT_ID,
                "client_secret": config.GOOGLE_CLIENT_SECRET,
                "code": code,
                "redirect_uri": config.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to get tokens from Google: {token_resp.text}")

    tokens = token_resp.json()
    access_token = tokens.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token in Google response.")

    # --- Fetch user info ---
    async with httpx.AsyncClient() as client:
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch user info from Google.")

    user_info = userinfo_resp.json()

    # --- Upsert user in DB ---
    user = db.query(User).filter(User.id == user_info["sub"]).first()
    if not user:
        user = User(
            id=user_info["sub"],
            email=user_info.get("email"),
            name=user_info.get("name"),
            picture=user_info.get("picture"),
        )
        db.add(user)
    else:
        user.name = user_info.get("name", user.name)
        user.picture = user_info.get("picture", user.picture)
    db.commit()

    # --- Issue app JWT ---
    jwt_data = {
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
    }
    jwt_token = create_access_token(jwt_data)

    # --- Redirect to frontend with auth cookie, clear the temp state cookie ---
    frontend_url = config.FRONTEND_URL.rstrip("/") + "/"
    redirect_response = RedirectResponse(url=frontend_url)
    redirect_response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        max_age=7 * 24 * 3600,
        expires=7 * 24 * 3600,
        samesite="lax",
        secure=False,  # Set to True in production (HTTPS)
    )
    # Delete the temporary CSRF state cookie
    redirect_response.delete_cookie(OAUTH_STATE_COOKIE)
    return redirect_response


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}
