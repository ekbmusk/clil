from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class AttemptIn(BaseModel):
    task_external_id: str
    answer: dict[str, Any]


class AttemptOut(BaseModel):
    is_correct: bool
    correct_value: Any = None
    feedback: str = ""
    language_tip: Optional[str] = None


class LessonFinalizeOut(BaseModel):
    lesson_external_id: str
    correct_count: int
    total_count: int
    accuracy: float
    completed_at: Optional[datetime] = None
