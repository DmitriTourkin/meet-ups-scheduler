from fastapi import APIRouter

router = APIRouter(prefix="/access", tags=["access"])


@router.get("/ping")
def ping() -> dict[str, bool]:
    return {"ok": True}
