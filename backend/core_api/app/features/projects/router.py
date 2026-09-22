import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.features.auth.dependencies import get_current_user
from app.features.projects import crud, schemas
from app.features.users.models import User

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=schemas.ProjectOut, status_code=201)
async def create_project(
    data: schemas.ProjectCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await crud.create_project(session, data, owner_id=current_user.id)


@router.get("", response_model=list[schemas.ProjectOut])
async def list_projects(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await crud.list_projects_for_user(session, current_user.id)


@router.get("/{project_id}", response_model=schemas.ProjectOut)
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    project = await crud.get_project(session, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=schemas.ProjectOut)
async def update_project(
    project_id: uuid.UUID, data: schemas.ProjectUpdate, session: AsyncSession = Depends(get_session)
):
    project = await crud.update_project(session, project_id, data)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/{project_id}/confirm", response_model=schemas.ProjectOut)
async def confirm_slot(
    project_id: uuid.UUID, data: schemas.ConfirmSlot, session: AsyncSession = Depends(get_session)
):
    project = await crud.confirm_project_slot(session, project_id, data.start_at, data.end_at)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/{project_id}/cancel", response_model=schemas.ProjectOut)
async def cancel_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        project = await crud.cancel_project(session, project_id, current_user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/{project_id}/members", response_model=schemas.ProjectMemberOut, status_code=201)
async def add_member(
    project_id: uuid.UUID,
    data: schemas.ProjectMemberCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not await crud.is_editor(session, project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only project editors can manage members")
    return await crud.add_project_member(session, project_id, data)


@router.get("/{project_id}/members", response_model=list[schemas.ProjectMemberOut])
async def list_members(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await crud.list_project_members(session, project_id)


@router.delete("/{project_id}/members/{user_id}", status_code=204)
async def remove_member(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not await crud.is_editor(session, project_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only project editors can manage members")
    removed = await crud.remove_project_member(session, project_id, user_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Membership not found")
