import enum
import uuid
from datetime import datetime

from sqlalchemy import ForeignKeyConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, pg_enum


class ProjectAvailabilityStatus(str, enum.Enum):
    BUSY = "busy"
    TENTATIVE = "tentative"
    FREE = "free"
    AVAILABLE = "available"


class ProjectAvailability(Base):
    __tablename__ = "project_availability"
    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "user_id"],
            ["project_members.project_id", "project_members.user_id"],
            ondelete="CASCADE",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    start_at: Mapped[datetime] = mapped_column(nullable=False)
    end_at: Mapped[datetime] = mapped_column(nullable=False)
    status: Mapped[ProjectAvailabilityStatus] = mapped_column(
        pg_enum(ProjectAvailabilityStatus, "project_availability_status"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(nullable=False)
