import os

from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.features.auth import crud
from app.features.users.models import User

SESSION_COOKIE_NAME = "session_id"
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"


async def get_current_user(
    session_id: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: AsyncSession = Depends(get_session),
) -> User:
    if session_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await crud.get_user_by_token(db, session_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user
