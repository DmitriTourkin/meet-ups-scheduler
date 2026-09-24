from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.features.auth import crud
from app.features.auth.dependencies import (
    COOKIE_SAMESITE,
    COOKIE_SECURE,
    SESSION_COOKIE_NAME,
    get_current_user,
)
from app.features.auth.schemas import LoginRequest
from app.features.users.models import User
from app.features.users.schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60


@router.post("/login", response_model=UserOut)
async def login(
    data: LoginRequest, response: Response, session: AsyncSession = Depends(get_session)
):
    user = await session.get(User, data.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    token = await crud.create_session(session, user.id)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        max_age=SESSION_MAX_AGE_SECONDS,
    )
    return user


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    session_id: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    session: AsyncSession = Depends(get_session),
):
    if session_id is not None:
        await crud.delete_session(session, session_id)
    response.delete_cookie(SESSION_COOKIE_NAME)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
