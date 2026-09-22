import enum
import uuid
from datetime import date, datetime

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, pg_enum


class MemberRole(str, enum.Enum):
    EDITOR = "editor"
    PARTICIPANT = "participant"


class ProjectStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    NO_SLOT_FOUND = "no_slot_found"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(nullable=False)
    duration_minutes: Mapped[int] = mapped_column(nullable=False)
    search_range_start: Mapped[date] = mapped_column(nullable=False)
    search_range_end: Mapped[date] = mapped_column(nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(
        pg_enum(ProjectStatus, "project_status"), nullable=False, default=ProjectStatus.PENDING
    )
    chosen_start_at: Mapped[datetime | None] = mapped_column(nullable=True)
    chosen_end_at: Mapped[datetime | None] = mapped_column(nullable=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False)


class ProjectMember(Base):
    __tablename__ = "project_members"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[MemberRole] = mapped_column(
        pg_enum(MemberRole, "member_role"), nullable=False, default=MemberRole.PARTICIPANT
    )
    created_at: Mapped[datetime] = mapped_column(nullable=False)
