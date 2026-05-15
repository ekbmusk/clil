from __future__ import annotations

from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Lesson, LessonProgress, LessonTask, User

# Fields we strip from task payload before serving to the student — no peeking.
_ANSWER_FIELDS = {
    "correct_index",
    "correct_answers",
    "correct_pairs",
    "correct_mapping",
    "correct_order",
    "feedback_right",
    "feedback_wrong",
}


def _sanitize_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        return {}
    return {k: v for k, v in payload.items() if k not in _ANSWER_FIELDS}


def list_lessons(db: Session, user: User) -> list[dict]:
    """Catalogue rows: lesson info + the caller's progress (if any)."""
    task_counts = dict(
        db.query(LessonTask.lesson_id, func.count(LessonTask.id))
        .group_by(LessonTask.lesson_id)
        .all()
    )
    progress_by_lesson = {
        p.lesson_id: p
        for p in db.query(LessonProgress)
        .filter(LessonProgress.user_id == user.id)
        .all()
    }

    out: list[dict] = []
    for lesson in (
        db.query(Lesson).order_by(Lesson.position, Lesson.id).all()
    ):
        progress = progress_by_lesson.get(lesson.id)
        out.append(
            {
                "external_id": lesson.external_id,
                "title": lesson.title,
                "topic": lesson.topic,
                "intro": lesson.intro,
                "physics_target": lesson.physics_target,
                "language_target": lesson.language_target,
                "position": lesson.position,
                "task_count": task_counts.get(lesson.id, 0),
                "my_progress": {
                    "correct_count": progress.correct_count if progress else 0,
                    "total_count": progress.total_count if progress else 0,
                    "accuracy": progress.accuracy if progress else 0.0,
                    "completed_at": progress.completed_at if progress else None,
                },
            }
        )
    return out


def get_lesson(db: Session, external_id: str) -> Optional[dict]:
    lesson = (
        db.query(Lesson).filter(Lesson.external_id == external_id).first()
    )
    if not lesson:
        return None

    tasks_out = []
    for t in lesson.tasks:  # already ordered by position
        tasks_out.append(
            {
                "external_id": t.external_id,
                "position": t.position,
                "type": t.type,
                "difficulty": t.difficulty,
                "payload": _sanitize_payload(t.payload or {}),
            }
        )

    return {
        "external_id": lesson.external_id,
        "title": lesson.title,
        "topic": lesson.topic,
        "intro": lesson.intro,
        "physics_target": lesson.physics_target,
        "language_target": lesson.language_target,
        "position": lesson.position,
        "tasks": tasks_out,
    }
