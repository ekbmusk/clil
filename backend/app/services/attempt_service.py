from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.database.models import (
    Lesson,
    LessonProgress,
    LessonTask,
    Notification,
    TaskAttempt,
    User,
)
from app.services.grader import grade


def submit_attempt(
    db: Session,
    *,
    user: User,
    task_external_id: str,
    answer_payload: dict,
) -> dict:
    task = (
        db.query(LessonTask)
        .filter(LessonTask.external_id == task_external_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    result = grade(task, answer_payload or {})

    attempt = TaskAttempt(
        user_id=user.id,
        task_id=task.id,
        payload=answer_payload or {},
        is_correct=bool(result["is_correct"]),
    )
    db.add(attempt)
    db.flush()

    progress, just_completed = _update_progress(
        db, user_id=user.id, lesson_id=task.lesson_id
    )
    if just_completed:
        lesson = db.query(Lesson).filter(Lesson.id == task.lesson_id).first()
        if lesson is not None:
            _emit_lesson_finished_notifications(
                db, student=user, lesson=lesson, progress=progress
            )
    _bump_streak(db, user=user)

    db.commit()
    return result


def finalize_lesson(db: Session, *, user: User, lesson_external_id: str) -> dict:
    lesson = (
        db.query(Lesson).filter(Lesson.external_id == lesson_external_id).first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    progress, just_completed = _update_progress(
        db, user_id=user.id, lesson_id=lesson.id
    )
    if just_completed:
        _emit_lesson_finished_notifications(
            db, student=user, lesson=lesson, progress=progress
        )

    db.commit()

    return {
        "lesson_external_id": lesson.external_id,
        "correct_count": progress.correct_count,
        "total_count": progress.total_count,
        "accuracy": progress.accuracy,
        "completed_at": progress.completed_at,
        "streak_count": user.streak_count or 0,
    }


# ---- internals -------------------------------------------------------------


def _update_progress(
    db: Session, *, user_id: int, lesson_id: int
) -> tuple[LessonProgress, bool]:
    """Recompute LessonProgress for (user, lesson) from the attempts log.

    Returns (progress, just_completed) — `just_completed` is True iff this
    call is the one that flipped completed_at from None to a real timestamp.
    Callers use that to fire notifications without spamming on every retry.
    """
    tasks = db.query(LessonTask).filter(LessonTask.lesson_id == lesson_id).all()
    task_ids = [t.id for t in tasks]
    total = len(task_ids)

    correct = 0
    if task_ids:
        attempts = (
            db.query(TaskAttempt)
            .filter(
                TaskAttempt.user_id == user_id,
                TaskAttempt.task_id.in_(task_ids),
            )
            .order_by(TaskAttempt.created_at.asc())
            .all()
        )
        latest_by_task: dict[int, TaskAttempt] = {}
        for a in attempts:
            latest_by_task[a.task_id] = a  # last one wins (asc order)
        correct = sum(1 for a in latest_by_task.values() if a.is_correct)

    accuracy = (correct / total) if total else 0.0

    progress = (
        db.query(LessonProgress)
        .filter(
            LessonProgress.user_id == user_id,
            LessonProgress.lesson_id == lesson_id,
        )
        .first()
    )
    if progress is None:
        progress = LessonProgress(user_id=user_id, lesson_id=lesson_id)
        db.add(progress)

    progress.correct_count = correct
    progress.total_count = total
    progress.accuracy = accuracy
    just_completed = False
    if total > 0 and correct == total and progress.completed_at is None:
        progress.completed_at = datetime.utcnow()
        just_completed = True
    progress.updated_at = datetime.utcnow()
    db.flush()
    return progress, just_completed


def _emit_lesson_finished_notifications(
    db: Session, *, student: User, lesson: Lesson, progress: LessonProgress
) -> None:
    """Queue a `lesson_finished` notification for every teacher in the DB.

    Group-aware filtering would be nicer but we don't strictly require teachers
    to be enrolled in groups, and most setups have a small staff anyway.
    """
    teachers = db.query(User).filter(User.role == "teacher").all()
    if not teachers:
        return
    student_name = (
        " ".join(filter(None, [student.first_name, student.last_name]))
        or student.username
        or str(student.telegram_id)
    )
    payload = {
        "student_id": student.id,
        "student_telegram_id": student.telegram_id,
        "student_name": student_name,
        "lesson_external_id": lesson.external_id,
        "lesson_title": lesson.title,
        "accuracy": progress.accuracy,
        "correct_count": progress.correct_count,
        "total_count": progress.total_count,
    }
    for teacher in teachers:
        db.add(
            Notification(
                user_id=teacher.id,
                kind="lesson_finished",
                payload=payload,
            )
        )


def _bump_streak(db: Session, *, user: User) -> None:
    """Increment the streak when this is the first attempt of a new day."""
    now = datetime.utcnow()
    last = user.last_active_at
    if last is None:
        user.streak_count = max(user.streak_count or 0, 1)
    else:
        same_day = last.date() == now.date()
        consecutive_day = (now.date() - last.date()) == timedelta(days=1)
        if same_day:
            pass  # already counted today
        elif consecutive_day:
            user.streak_count = (user.streak_count or 0) + 1
        else:
            user.streak_count = 1
    user.last_active_at = now
