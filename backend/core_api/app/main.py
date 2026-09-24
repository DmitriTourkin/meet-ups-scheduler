import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.access_gate import require_access_code
from app.features.access.router import router as access_router
from app.features.auth.router import router as auth_router
from app.features.notifications.router import router as notifications_router
from app.features.personal_availability.router import router as personal_availability_router
from app.features.project_availability.router import router as project_availability_router
from app.features.projects.router import router as projects_router
from app.features.users.router import router as users_router

app = FastAPI(title="Meet Scheduler Core API")

FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

gate = [Depends(require_access_code)]

app.include_router(access_router, dependencies=gate)
app.include_router(auth_router, dependencies=gate)
app.include_router(users_router, dependencies=gate)
app.include_router(projects_router, dependencies=gate)
app.include_router(personal_availability_router, dependencies=gate)
app.include_router(project_availability_router, dependencies=gate)
app.include_router(notifications_router, dependencies=gate)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
