from __future__ import annotations

import uuid
from datetime import time

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    email: str
    name: str
    timezone: str
    working_hours_start: time = time(9, 0)
    working_hours_end: time = time(18, 0)


class UserUpdate(BaseModel):
    name: str | None = None
    timezone: str | None = None
    working_hours_start: time | None = None
    working_hours_end: time | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    timezone: str
    working_hours_start: time
    working_hours_end: time
    nickname: str | None
