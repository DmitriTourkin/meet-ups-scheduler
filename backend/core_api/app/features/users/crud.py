import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.users import schemas
from app.features.users.models import User


async def create_user(session: AsyncSession, data: schemas.UserCreate) -> User:
    user = User(
        email=data.email,
        name=data.name,
        timezone=data.timezone,
        working_hours_start=data.working_hours_start,
        working_hours_end=data.working_hours_end,
        created_at=datetime.now(timezone.utc),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def list_users(session: AsyncSession) -> list[User]:
    result = await session.execute(select(User))
    return list(result.scalars().all())


async def get_user(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await session.get(User, user_id)


async def update_user(session: AsyncSession, user_id: uuid.UUID, data: schemas.UserUpdate) -> User | None:
    user = await session.get(User, user_id)
    if user is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await session.commit()
    await session.refresh(user)
    return user
