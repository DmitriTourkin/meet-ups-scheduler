import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.features.auth.router import router as auth_router
from app.features.friends.router import router as friends_router
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

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(friends_router)
app.include_router(projects_router)
app.include_router(personal_availability_router)
app.include_router(project_availability_router)
app.include_router(notifications_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
