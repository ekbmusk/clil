from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class LessonProgressOut(BaseModel):
    correct_count: int = 0
    total_count: int = 0
    accuracy: float = 0.0
    completed_at: Optional[datetime] = None


class LessonSummary(BaseModel):
    external_id: str
    title: str
    topic: Optional[str] = None
    intro: Optional[str] = None
    physics_target: Optional[str] = None
    language_target: Optional[str] = None
    position: int = 0
    task_count: int = 0
    my_progress: LessonProgressOut


class TaskOut(BaseModel):
    external_id: str
    position: int = 0
    type: str
    difficulty: int = 1
    # `payload` here is the *sanitized* payload — answer keys are stripped.
    payload: dict[str, Any]


class LessonDetail(BaseModel):
    external_id: str
    title: str
    topic: Optional[str] = None
    intro: Optional[str] = None
    physics_target: Optional[str] = None
    language_target: Optional[str] = None
    position: int = 0
    tasks: list[TaskOut]
