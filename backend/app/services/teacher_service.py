from __future__ import annotations

from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import (
    BroadcastLog,
    Group,
    GroupEnrollment,
    Lesson,
    LessonProgress,
    LessonTask,
    Notification,
    TaskAttempt,
    User,
)
from app.services.grader import grade


def stats(db: Session) -> dict:
    total_students = (
        db.query(func.count(User.id)).filter(User.role == "student").scalar() or 0
    )
    total_lessons = db.query(func.count(Lesson.id)).scalar() or 0
    total_attempts = db.query(func.count(TaskAttempt.id)).scalar() or 0
    avg_accuracy = (
        db.query(func.avg(LessonProgress.accuracy)).scalar()
    )
    per_lesson_rows = (
        db.query(Lesson, func.avg(LessonProgress.accuracy))
        .outerjoin(LessonProgress, LessonProgress.lesson_id == Lesson.id)
        .group_by(Lesson.id)
        .order_by(Lesson.position, Lesson.id)
        .all()
    )
    per_lesson = [
        {
            "external_id": lesson.external_id,
            "title": lesson.title,
            "avg_accuracy": float(avg) if avg is not None else 0.0,
        }
        for lesson, avg in per_lesson_rows
    ]
    return {
        "total_students": total_students,
        "total_lessons": total_lessons,
        "total_attempts": total_attempts,
        "avg_accuracy": float(avg_accuracy) if avg_accuracy is not None else 0.0,
        "per_lesson": per_lesson,
    }


def list_students(db: Session) -> list[dict]:
    students = (
        db.query(User)
        .filter(User.role == "student")
        .order_by(User.first_name, User.last_name)
        .all()
    )
    progress_by_user: dict[int, list[LessonProgress]] = {}
    for p in db.query(LessonProgress).all():
        progress_by_user.setdefault(p.user_id, []).append(p)

    out = []
    for s in students:
        rows = progress_by_user.get(s.id, [])
        completed = sum(1 for r in rows if r.completed_at is not None)
        avg_acc = (sum(r.accuracy for r in rows) / len(rows)) if rows else 0.0
        name = " ".join(filter(None, [s.first_name, s.last_name])) or s.username or str(s.telegram_id)
        out.append(
            {
                "id": s.id,
                "telegram_id": s.telegram_id,
                "name": name,
                "streak": s.streak_count or 0,
                "completed_lessons": completed,
                "avg_accuracy": float(avg_acc),
            }
        )
    return out


def group_progress(db: Session, group_id: int) -> dict:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        return {"group_id": group_id, "lessons": [], "rows": []}

    students = (
        db.query(User)
        .join(GroupEnrollment, GroupEnrollment.user_id == User.id)
        .filter(GroupEnrollment.group_id == group_id)
        .order_by(User.first_name, User.last_name)
        .all()
    )
    lessons = db.query(Lesson).order_by(Lesson.position, Lesson.id).all()

    student_ids = [s.id for s in students]
    lesson_ids = [l.id for l in lessons]

    progress_rows = (
        db.query(LessonProgress)
        .filter(
            LessonProgress.user_id.in_(student_ids or [-1]),
            LessonProgress.lesson_id.in_(lesson_ids or [-1]),
        )
        .all()
        if student_ids and lesson_ids
        else []
    )
    by_key = {(p.user_id, p.lesson_id): p for p in progress_rows}

    rows = []
    for s in students:
        cells = []
        for l in lessons:
            p = by_key.get((s.id, l.id))
            cells.append(
                {
                    "lesson_external_id": l.external_id,
                    "correct_count": p.correct_count if p else 0,
                    "total_count": p.total_count if p else 0,
                    "accuracy": p.accuracy if p else 0.0,
                    "completed_at": p.completed_at if p else None,
                }
            )
        rows.append(
            {
                "user": {
                    "id": s.id,
                    "telegram_id": s.telegram_id,
                    "name": " ".join(filter(None, [s.first_name, s.last_name]))
                    or s.username
                    or str(s.telegram_id),
                },
                "lessons": cells,
            }
        )

    return {
        "group_id": group_id,
        "lessons": [{"external_id": l.external_id, "title": l.title} for l in lessons],
        "rows": rows,
    }


def list_attempts(
    db: Session,
    *,
    group_id: Optional[int] = None,
    lesson_external_id: Optional[str] = None,
    user_id: Optional[int] = None,
    limit: int = 100,
) -> list[dict]:
    q = (
        db.query(TaskAttempt, LessonTask, Lesson, User)
        .join(LessonTask, LessonTask.id == TaskAttempt.task_id)
        .join(Lesson, Lesson.id == LessonTask.lesson_id)
        .join(User, User.id == TaskAttempt.user_id)
    )
    if user_id is not None:
        q = q.filter(TaskAttempt.user_id == user_id)
    if lesson_external_id:
        q = q.filter(Lesson.external_id == lesson_external_id)
    if group_id is not None:
        q = q.join(GroupEnrollment, GroupEnrollment.user_id == User.id).filter(
            GroupEnrollment.group_id == group_id
        )

    q = q.order_by(TaskAttempt.created_at.desc()).limit(limit)

    out = []
    for attempt, task, lesson, user in q.all():
        out.append(
            {
                "id": attempt.id,
                "is_correct": attempt.is_correct,
                "payload": attempt.payload,
                "created_at": attempt.created_at,
                "user": {
                    "id": user.id,
                    "telegram_id": user.telegram_id,
                    "name": " ".join(filter(None, [user.first_name, user.last_name]))
                    or user.username
                    or str(user.telegram_id),
                },
                "task": {
                    "external_id": task.external_id,
                    "type": task.type,
                    "difficulty": task.difficulty,
                },
                "lesson": {
                    "external_id": lesson.external_id,
                    "title": lesson.title,
                },
            }
        )
    return out


def _user_display_name(u: User) -> str:
    return (
        " ".join(filter(None, [u.first_name, u.last_name]))
        or u.username
        or str(u.telegram_id)
    )


def student_progress(db: Session, *, user_id: int) -> Optional[dict]:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    lessons = db.query(Lesson).order_by(Lesson.position, Lesson.id).all()
    progress_rows = (
        db.query(LessonProgress)
        .filter(LessonProgress.user_id == user_id)
        .all()
    )
    by_lesson = {p.lesson_id: p for p in progress_rows}

    lesson_rows = []
    for l in lessons:
        p = by_lesson.get(l.id)
        lesson_rows.append(
            {
                "external_id": l.external_id,
                "title": l.title,
                "topic": l.topic,
                "correct_count": p.correct_count if p else 0,
                "total_count": p.total_count if p else 0,
                "accuracy": p.accuracy if p else 0.0,
                "completed_at": p.completed_at if p else None,
            }
        )

    # Recent attempts.
    recent = (
        db.query(TaskAttempt, LessonTask, Lesson)
        .join(LessonTask, LessonTask.id == TaskAttempt.task_id)
        .join(Lesson, Lesson.id == LessonTask.lesson_id)
        .filter(TaskAttempt.user_id == user_id)
        .order_by(TaskAttempt.created_at.desc())
        .limit(50)
        .all()
    )
    attempts = [
        {
            "id": a.id,
            "is_correct": a.is_correct,
            "created_at": a.created_at,
            "task": {
                "external_id": t.external_id,
                "type": t.type,
                "difficulty": t.difficulty,
            },
            "lesson": {"external_id": l.external_id, "title": l.title},
        }
        for a, t, l in recent
    ]

    return {
        "user": {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "name": _user_display_name(user),
            "username": user.username,
            "role": user.role,
            "streak_count": user.streak_count or 0,
        },
        "lessons": lesson_rows,
        "recent_attempts": attempts,
    }


def attempt_detail(db: Session, *, attempt_id: int) -> Optional[dict]:
    row = (
        db.query(TaskAttempt, LessonTask, Lesson, User)
        .join(LessonTask, LessonTask.id == TaskAttempt.task_id)
        .join(Lesson, Lesson.id == LessonTask.lesson_id)
        .join(User, User.id == TaskAttempt.user_id)
        .filter(TaskAttempt.id == attempt_id)
        .first()
    )
    if row is None:
        return None
    attempt, task, lesson, user = row
    grading = grade(task, attempt.payload or {})
    return {
        "id": attempt.id,
        "is_correct": attempt.is_correct,
        "answer_payload": attempt.payload,
        "correct_value": grading.get("correct_value"),
        "feedback": grading.get("feedback"),
        "created_at": attempt.created_at,
        "task": {
            "external_id": task.external_id,
            "type": task.type,
            "difficulty": task.difficulty,
            "payload": task.payload,  # full payload, teacher gets to see answers
        },
        "lesson": {
            "external_id": lesson.external_id,
            "title": lesson.title,
            "topic": lesson.topic,
        },
        "user": {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "name": _user_display_name(user),
        },
    }


def queue_broadcast(
    db: Session, *, teacher_id: int, message: str, group_ids: Optional[list[int]] = None
) -> int:
    """Record a broadcast intent. The bot actually delivers the messages."""
    if group_ids:
        recipients = (
            db.query(User.id)
            .join(GroupEnrollment, GroupEnrollment.user_id == User.id)
            .filter(GroupEnrollment.group_id.in_(group_ids))
            .filter(User.role == "student")
            .distinct()
            .all()
        )
    else:
        recipients = (
            db.query(User.id).filter(User.role == "student").all()
        )
    user_ids = [r[0] for r in recipients]

    for uid in user_ids:
        db.add(
            BroadcastLog(
                sent_by_user_id=teacher_id,
                recipient_user_id=uid,
                message=message,
            )
        )
        db.add(
            Notification(
                user_id=uid,
                kind="broadcast",
                payload={"text": message},
            )
        )
    db.commit()
    return len(user_ids)
