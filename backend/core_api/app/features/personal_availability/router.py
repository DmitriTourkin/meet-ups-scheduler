import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.features.auth.dependencies import get_current_user
from app.features.personal_availability import crud, schemas
from app.features.users.models import User

router = APIRouter(prefix="/me/busy-slots", tags=["personal-availability"])


@router.post("", response_model=schemas.PersonalBusySlotOut, status_code=201)
async def create_slot(
    data: schemas.PersonalBusySlotCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await crud.create_personal_busy_slot(session, current_user.id, data)


@router.get("", response_model=list[schemas.PersonalBusySlotOut])
async def list_slots(
    range_start: date | None = None,
    range_end: date | None = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await crud.list_personal_busy_slots(session, current_user.id, range_start, range_end)


@router.delete("/{slot_id}", status_code=204)
async def delete_slot(
    slot_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    deleted = await crud.delete_personal_busy_slot(session, slot_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Slot not found")
