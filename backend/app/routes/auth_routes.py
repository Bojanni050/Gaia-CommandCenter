from datetime import timedelta
from fastapi import APIRouter, HTTPException, status, Response, Request
from pydantic import BaseModel
from app.config import settings
from app.auth import verify_password, create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str

@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, response: Response):
    # Verify username and password
    if req.username != settings.ADMIN_USERNAME or not verify_password(req.password, settings.ADMIN_PASSWORD):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Onjuiste gebruikersnaam of wachtwoord"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": req.username},
        expires_delta=access_token_expires
    )
    
    # Also set HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False  # Allow local or tailscale HTTP
    )
    
    return LoginResponse(access_token=access_token, username=req.username)

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Succesvol uitgelogd"}

@router.get("/status")
async def auth_status(request: Request):
    if not settings.ENABLE_AUTH:
        return {"authenticated": True, "username": settings.ADMIN_USERNAME, "auth_enabled": False}

    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if token:
        user = decode_token(token)
        if user == settings.ADMIN_USERNAME:
            return {"authenticated": True, "username": user, "auth_enabled": True}

    return {"authenticated": False, "username": None, "auth_enabled": True}
