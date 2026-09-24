from __future__ import annotations

import uuid

from pydantic import BaseModel, field_validator

from app.features.users.schemas import UserOut


class ClaimRequest(BaseModel):
    user_id: uuid.UUID


class LoginRequest(BaseModel):
    nickname: str
    password: str


class CompleteSetupRequest(BaseModel):
    password: str
    nickname: str

    @field_validator("nickname")
    @classmethod
    def nickname_format(cls, value: str) -> str:
        if not value.startswith("@") or len(value) < 2:
            raise ValueError("Никнейм должен начинаться с @ и содержать хотя бы один символ после")
        return value

    @field_validator("password")
    @classmethod
    def password_length(cls, value: str) -> str:
        if len(value) < 4:
            raise ValueError("Пароль слишком короткий")
        return value


class TokenResponse(BaseModel):
    access_token: str
    user: UserOut
