from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    telegram_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    role: Literal["student", "teacher"]
    streak_count: int = 0
    last_active_at: Optional[datetime] = None
    created_at: datetime


class UserRegisterOut(BaseModel):
    user: UserOut
    role: Literal["student", "teacher"]
