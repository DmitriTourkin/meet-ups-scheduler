import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.features.notifications import crud, schemas

router = APIRouter(tags=["notifications"])


@router.get("/users/{user_id}/notifications", response_model=list[schemas.NotificationOut])
async def list_notifications(
    user_id: uuid.UUID, unread_only: bool = False, session: AsyncSession = Depends(get_session)
):
    return await crud.list_notifications(session, user_id, unread_only)


@router.post("/notifications/{notification_id}/read", response_model=schemas.NotificationOut)
async def mark_read(notification_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    notification = await crud.mark_notification_read(session, notification_id)
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification
