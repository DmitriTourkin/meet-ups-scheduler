from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.features.auth.dependencies import get_current_user
from app.features.auth.schemas import ClaimRequest, CompleteSetupRequest, LoginRequest, TokenResponse
from app.features.auth.security import create_access_token, hash_password, verify_password
from app.features.users.models import User
from app.features.users.schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/claim", response_model=TokenResponse)
async def claim(data: ClaimRequest, session: AsyncSession = Depends(get_session)):
    user = await session.get(User, data.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.nickname is not None:
        raise HTTPException(
            status_code=400, detail="Этот аккаунт уже настроен, войдите по нику и паролю"
        )
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/complete-setup", response_model=TokenResponse)
async def complete_setup(
    data: CompleteSetupRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    existing = await session.execute(select(User).where(User.nickname == data.nickname))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Этот никнейм уже занят")
    current_user.nickname = data.nickname
    current_user.password_hash = hash_password(data.password)
    await session.commit()
    await session.refresh(current_user)
    token = create_access_token(str(current_user.id))
    return TokenResponse(access_token=token, user=UserOut.model_validate(current_user))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.nickname == data.nickname))
    user = result.scalar_one_or_none()
    if user is None or user.password_hash is None or not verify_password(
        data.password, user.password_hash
    ):
        raise HTTPException(status_code=401, detail="Неверный никнейм или пароль")
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
