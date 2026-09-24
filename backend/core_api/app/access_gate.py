import os

from fastapi import Header, HTTPException

ACCESS_CODE = os.environ.get("ACCESS_CODE")


async def require_access_code(x_access_code: str | None = Header(default=None)) -> None:
    if ACCESS_CODE is None:
        return
    if x_access_code != ACCESS_CODE:
        raise HTTPException(status_code=401, detail="Invalid access code")
