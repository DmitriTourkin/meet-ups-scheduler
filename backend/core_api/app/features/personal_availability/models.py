import enum
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, pg_enum


class PersonalAvailabilityStatus(str, enum.Enum):
    BUSY = "busy"
    TENTATIVE = "tentative"


class PersonalBusySlot(Base):
    __tablename__ = "personal_busy_slots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_at: Mapped[datetime] = mapped_column(nullable=False)
    end_at: Mapped[datetime] = mapped_column(nullable=False)
    status: Mapped[PersonalAvailabilityStatus] = mapped_column(
        pg_enum(PersonalAvailabilityStatus, "personal_availability_status"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(nullable=False)
