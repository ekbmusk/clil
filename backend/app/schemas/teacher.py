from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class TeacherStatsPerLesson(BaseModel):
    external_id: str
    title: str
    avg_accuracy: float


class TeacherStats(BaseModel):
    total_students: int
    total_lessons: int
    total_attempts: int
    avg_accuracy: float
    per_lesson: list[TeacherStatsPerLesson] = []


class StudentRow(BaseModel):
    id: int
    telegram_id: int
    name: str
    streak: int = 0
    completed_lessons: int = 0
    avg_accuracy: float = 0.0


class AttemptUser(BaseModel):
    id: int
    telegram_id: int
    name: str


class AttemptTask(BaseModel):
    external_id: str
    type: str
    difficulty: int


class AttemptLesson(BaseModel):
    external_id: str
    title: str


class AttemptListItem(BaseModel):
    id: int
    is_correct: bool
    payload: dict[str, Any]
    created_at: datetime
    user: AttemptUser
    task: AttemptTask
    lesson: AttemptLesson


class BroadcastIn(BaseModel):
    message: str
    group_ids: Optional[list[int]] = None


class BroadcastOut(BaseModel):
    queued: int


class LessonUpsertIn(BaseModel):
    external_id: str
    topic: Optional[str] = None
    title: str
    intro: Optional[str] = None
    physics_target: Optional[str] = None
    language_target: Optional[str] = None
    position: Optional[int] = None


class TaskUpsertIn(BaseModel):
    external_id: str
    lesson_external_id: str
    type: str
    difficulty: int = 1
    position: Optional[int] = None
    payload: dict[str, Any] = {}
