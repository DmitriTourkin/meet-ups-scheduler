import uuid

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.features.auth.security import decode_access_token
from app.features.users.models import User


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_session),
) -> User:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ").strip()
    subject = decode_access_token(token)
    if subject is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    try:
        user_id = uuid.UUID(subject)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user
