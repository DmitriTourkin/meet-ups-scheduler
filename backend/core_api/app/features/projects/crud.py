import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.projects import schemas
from app.features.projects.models import MemberRole, Project, ProjectMember, ProjectStatus


async def create_project(session: AsyncSession, data: schemas.ProjectCreate, owner_id: uuid.UUID) -> Project:
    now = datetime.now(timezone.utc)
    project = Project(
        title=data.title,
        duration_minutes=data.duration_minutes,
        search_range_start=data.search_range_start,
        search_range_end=data.search_range_end,
        owner_id=owner_id,
        created_at=now,
    )
    session.add(project)
    await session.flush()

    member_ids = {owner_id, *data.member_ids}
    for user_id in member_ids:
        role = MemberRole.EDITOR if user_id == owner_id else MemberRole.PARTICIPANT
        session.add(ProjectMember(project_id=project.id, user_id=user_id, role=role, created_at=now))

    await session.commit()
    await session.refresh(project)
    return project


async def list_projects_for_user(session: AsyncSession, user_id: uuid.UUID) -> list[Project]:
    result = await session.execute(
        select(Project).join(ProjectMember).where(ProjectMember.user_id == user_id)
    )
    return list(result.scalars().all())


async def get_project(session: AsyncSession, project_id: uuid.UUID) -> Project | None:
    return await session.get(Project, project_id)


async def update_project(
    session: AsyncSession, project_id: uuid.UUID, data: schemas.ProjectUpdate
) -> Project | None:
    project = await session.get(Project, project_id)
    if project is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await session.commit()
    await session.refresh(project)
    return project


async def confirm_project_slot(
    session: AsyncSession, project_id: uuid.UUID, start_at: datetime, end_at: datetime
) -> Project | None:
    project = await session.get(Project, project_id)
    if project is None:
        return None
    project.status = ProjectStatus.CONFIRMED
    project.chosen_start_at = start_at
    project.chosen_end_at = end_at
    await session.commit()
    await session.refresh(project)
    return project


async def cancel_project(session: AsyncSession, project_id: uuid.UUID, actor_id: uuid.UUID) -> Project | None:
    project = await session.get(Project, project_id)
    if project is None:
        return None
    if project.owner_id != actor_id:
        raise PermissionError("only the project owner can cancel the meeting")
    project.status = ProjectStatus.CANCELLED
    await session.commit()
    await session.refresh(project)
    return project


async def add_project_member(
    session: AsyncSession, project_id: uuid.UUID, data: schemas.ProjectMemberCreate
) -> ProjectMember:
    member = ProjectMember(
        project_id=project_id, user_id=data.user_id, role=data.role, created_at=datetime.now(timezone.utc)
    )
    session.add(member)
    await session.commit()
    await session.refresh(member)
    return member


async def list_project_members(session: AsyncSession, project_id: uuid.UUID) -> list[ProjectMember]:
    result = await session.execute(select(ProjectMember).where(ProjectMember.project_id == project_id))
    return list(result.scalars().all())


async def remove_project_member(session: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    member = await session.get(ProjectMember, (project_id, user_id))
    if member is None:
        return False
    await session.delete(member)
    await session.commit()
    return True


async def is_editor(session: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    member = await session.get(ProjectMember, (project_id, user_id))
    return member is not None and member.role == MemberRole.EDITOR
