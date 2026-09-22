import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.personal_availability import schemas
from app.features.personal_availability.models import PersonalBusySlot


async def create_personal_busy_slot(
    session: AsyncSession, user_id: uuid.UUID, data: schemas.PersonalBusySlotCreate
) -> PersonalBusySlot:
    slot = PersonalBusySlot(
        user_id=user_id,
        start_at=data.start_at,
        end_at=data.end_at,
        status=data.status,
        created_at=datetime.now(timezone.utc),
    )
    session.add(slot)
    await session.commit()
    await session.refresh(slot)
    return slot


async def list_personal_busy_slots(
    session: AsyncSession,
    user_id: uuid.UUID,
    range_start: date | None = None,
    range_end: date | None = None,
) -> list[PersonalBusySlot]:
    query = select(PersonalBusySlot).where(PersonalBusySlot.user_id == user_id)
    if range_start is not None:
        query = query.where(PersonalBusySlot.end_at >= range_start)
    if range_end is not None:
        query = query.where(PersonalBusySlot.start_at <= range_end)
    result = await session.execute(query)
    return list(result.scalars().all())


async def delete_personal_busy_slot(session: AsyncSession, slot_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    slot = await session.get(PersonalBusySlot, slot_id)
    if slot is None or slot.user_id != user_id:
        return False
    await session.delete(slot)
    await session.commit()
    return True
