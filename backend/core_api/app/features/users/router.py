import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.features.auth.dependencies import get_current_user
from app.features.users import crud, schemas
from app.features.users.models import User

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=schemas.UserOut, status_code=201)
async def create_user(data: schemas.UserCreate, session: AsyncSession = Depends(get_session)):
    return await crud.create_user(session, data)


@router.get("", response_model=list[schemas.UserOut])
async def list_users(session: AsyncSession = Depends(get_session)):
    return await crud.list_users(session)


@router.patch("/me", response_model=schemas.UserOut)
async def update_me(
    data: schemas.UserUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user = await crud.update_user(session, current_user.id, data)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}", response_model=schemas.UserOut)
async def get_user(user_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    user = await crud.get_user(session, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
