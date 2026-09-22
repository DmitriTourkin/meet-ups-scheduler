import uuid

from pydantic import BaseModel


class LoginRequest(BaseModel):
    user_id: uuid.UUID
