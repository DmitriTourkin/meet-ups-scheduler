import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.project_availability import schemas
from app.features.project_availability.models import ProjectAvailability


async def create_project_availability(
    session: AsyncSession,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    data: schemas.ProjectAvailabilityCreate,
) -> ProjectAvailability:
    entry = ProjectAvailability(
        project_id=project_id,
        user_id=user_id,
        start_at=data.start_at,
        end_at=data.end_at,
        status=data.status,
        created_at=datetime.now(timezone.utc),
    )
    session.add(entry)
    await session.commit()
    await session.refresh(entry)
    return entry


async def list_project_availability(session: AsyncSession, project_id: uuid.UUID) -> list[ProjectAvailability]:
    result = await session.execute(
        select(ProjectAvailability).where(ProjectAvailability.project_id == project_id)
    )
    return list(result.scalars().all())


async def delete_project_availability(session: AsyncSession, entry_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    entry = await session.get(ProjectAvailability, entry_id)
    if entry is None or entry.user_id != user_id:
        return False
    await session.delete(entry)
    await session.commit()
    return True
