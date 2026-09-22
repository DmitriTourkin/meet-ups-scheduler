import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import Session
from app.features.users.models import User

SESSION_TTL = timedelta(days=30)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def create_session(session: AsyncSession, user_id: uuid.UUID) -> str:
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    session.add(
        Session(
            token_hash=_hash_token(token),
            user_id=user_id,
            created_at=now,
            expires_at=now + SESSION_TTL,
        )
    )
    await session.commit()
    return token


async def get_user_by_token(session: AsyncSession, token: str) -> User | None:
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(User)
        .join(Session, Session.user_id == User.id)
        .where(Session.token_hash == _hash_token(token), Session.expires_at > now)
    )
    return result.scalar_one_or_none()


async def delete_session(session: AsyncSession, token: str) -> None:
    existing = await session.get(Session, _hash_token(token))
    if existing is not None:
        await session.delete(existing)
        await session.commit()
