import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.features.auth.dependencies import get_current_user
from app.features.project_availability import crud, schemas
from app.features.users.models import User

router = APIRouter(prefix="/projects/{project_id}/availability", tags=["project-availability"])


@router.post("", response_model=schemas.ProjectAvailabilityOut, status_code=201)
async def create_entry(
    project_id: uuid.UUID,
    data: schemas.ProjectAvailabilityCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await crud.create_project_availability(session, project_id, current_user.id, data)


@router.get("", response_model=list[schemas.ProjectAvailabilityOut])
async def list_entries(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await crud.list_project_availability(session, project_id)


@router.delete("/{entry_id}", status_code=204)
async def delete_entry(
    project_id: uuid.UUID,
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    deleted = await crud.delete_project_availability(session, entry_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Entry not found")
