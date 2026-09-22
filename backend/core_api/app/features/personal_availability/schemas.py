from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.features.personal_availability.models import PersonalAvailabilityStatus
from app.validation import assert_quantized_15min


class PersonalBusySlotCreate(BaseModel):
    start_at: datetime
    end_at: datetime
    status: PersonalAvailabilityStatus = PersonalAvailabilityStatus.BUSY

    @field_validator("start_at", "end_at")
    @classmethod
    def _quantized(cls, v: datetime) -> datetime:
        return assert_quantized_15min(v)

    @model_validator(mode="after")
    def _range_valid(self) -> PersonalBusySlotCreate:
        if self.start_at >= self.end_at:
            raise ValueError("start_at must be before end_at")
        return self


class PersonalBusySlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    start_at: datetime
    end_at: datetime
    status: PersonalAvailabilityStatus
