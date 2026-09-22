import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.notifications.models import Notification


async def list_notifications(
    session: AsyncSession, user_id: uuid.UUID, unread_only: bool = False
) -> list[Notification]:
    query = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    result = await session.execute(query.order_by(Notification.created_at.desc()))
    return list(result.scalars().all())


async def mark_notification_read(session: AsyncSession, notification_id: uuid.UUID) -> Notification | None:
    notification = await session.get(Notification, notification_id)
    if notification is None:
        return None
    notification.read_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(notification)
    return notification
