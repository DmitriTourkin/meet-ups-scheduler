from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.features.project_availability.models import ProjectAvailabilityStatus
from app.validation import assert_quantized_15min


class ProjectAvailabilityCreate(BaseModel):
    start_at: datetime
    end_at: datetime
    status: ProjectAvailabilityStatus

    @field_validator("start_at", "end_at")
    @classmethod
    def _quantized(cls, v: datetime) -> datetime:
        return assert_quantized_15min(v)

    @model_validator(mode="after")
    def _range_valid(self) -> ProjectAvailabilityCreate:
        if self.start_at >= self.end_at:
            raise ValueError("start_at must be before end_at")
        return self


class ProjectAvailabilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    start_at: datetime
    end_at: datetime
    status: ProjectAvailabilityStatus
