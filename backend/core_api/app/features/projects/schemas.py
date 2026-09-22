from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.features.projects.models import MemberRole, ProjectStatus


class ProjectCreate(BaseModel):
    title: str
    duration_minutes: int
    search_range_start: date
    search_range_end: date
    member_ids: list[uuid.UUID] = []

    @field_validator("duration_minutes")
    @classmethod
    def _duration_quantized(cls, v: int) -> int:
        if v <= 0 or v % 15 != 0:
            raise ValueError("duration_minutes must be a positive multiple of 15")
        return v

    @model_validator(mode="after")
    def _range_valid(self) -> ProjectCreate:
        if self.search_range_start >= self.search_range_end:
            raise ValueError("search_range_start must be before search_range_end")
        return self


class ProjectUpdate(BaseModel):
    title: str | None = None
    duration_minutes: int | None = None
    search_range_start: date | None = None
    search_range_end: date | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    duration_minutes: int
    search_range_start: date
    search_range_end: date
    status: ProjectStatus
    chosen_start_at: datetime | None
    chosen_end_at: datetime | None
    owner_id: uuid.UUID


class ConfirmSlot(BaseModel):
    start_at: datetime
    end_at: datetime

    @model_validator(mode="after")
    def _range_valid(self) -> ConfirmSlot:
        if self.start_at >= self.end_at:
            raise ValueError("start_at must be before end_at")
        return self


class ProjectMemberCreate(BaseModel):
    user_id: uuid.UUID
    role: MemberRole = MemberRole.PARTICIPANT


class ProjectMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: uuid.UUID
    user_id: uuid.UUID
    role: MemberRole
