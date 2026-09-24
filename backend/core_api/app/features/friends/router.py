from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.features.auth.dependencies import get_current_user
from app.features.friends.models import Friendship
from app.features.users.models import User
from app.features.users.schemas import UserOut

router = APIRouter(prefix="/friends", tags=["friends"])


@router.get("", response_model=list[UserOut])
async def list_friends(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(User)
        .join(Friendship, Friendship.friend_id == User.id)
        .where(Friendship.user_id == current_user.id)
    )
    return list(result.scalars().all())
