from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    created_at: datetime
    student_count: int = 0


class GroupCreateIn(BaseModel):
    name: str
    code: str


class EnrollIn(BaseModel):
    user_id: Optional[int] = None
    code: Optional[str] = None  # student self-enroll via code
