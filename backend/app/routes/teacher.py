from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import Lesson, LessonTask, User
from app.schemas.teacher import (
    AttemptListItem,
    BroadcastIn,
    BroadcastOut,
    LessonUpsertIn,
    StudentRow,
    TaskUpsertIn,
    TeacherStats,
)
from app.services import teacher_service
from app.utils.auth import require_teacher

router = APIRouter(prefix="/api/teacher", tags=["teacher"])


@router.get("/stats", response_model=TeacherStats)
def stats(
    _t: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return teacher_service.stats(db)


@router.get("/students", response_model=list[StudentRow])
def students(
    _t: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return teacher_service.list_students(db)


@router.get("/attempts", response_model=list[AttemptListItem])
def attempts(
    group_id: Optional[int] = Query(None),
    lesson_external_id: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    _t: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return teacher_service.list_attempts(
        db,
        group_id=group_id,
        lesson_external_id=lesson_external_id,
        user_id=user_id,
        limit=limit,
    )


@router.post("/broadcast", response_model=BroadcastOut)
def broadcast(
    payload: BroadcastIn,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    queued = teacher_service.queue_broadcast(
        db, teacher_id=teacher.id, message=payload.message, group_ids=payload.group_ids
    )
    return BroadcastOut(queued=queued)


# ---- lesson / task authoring ----------------------------------------------


@router.post("/lessons")
def create_lesson(
    payload: LessonUpsertIn,
    _t: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    if db.query(Lesson).filter(Lesson.external_id == payload.external_id).first():
        raise HTTPException(status_code=400, detail="external_id already exists")
    lesson = Lesson(
        external_id=payload.external_id,
        topic=payload.topic,
        title=payload.title,
        intro=payload.intro,
        physics_target=payload.physics_target,
        language_target=payload.language_target,
        position=payload.position or 0,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return {"id": lesson.id, "external_id": lesson.external_id}


@router.patch("/lessons/{external_id}")
def update_lesson(
    external_id: str,
    payload: LessonUpsertIn,
    _t: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.external_id == external_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    # external_id from URL wins; payload.external_id is informational.
    lesson.topic = payload.topic if payload.topic is not None else lesson.topic
    lesson.title = payload.title or lesson.title
    lesson.intro = payload.intro if payload.intro is not None else lesson.intro
    lesson.physics_target = (
        payload.physics_target if payload.physics_target is not None else lesson.physics_target
    )
    lesson.language_target = (
        payload.language_target if payload.language_target is not None else lesson.language_target
    )
    if payload.position is not None:
        lesson.position = payload.position
    db.commit()
    db.refresh(lesson)
    return {"id": lesson.id, "external_id": lesson.external_id}


@router.post("/tasks")
def create_task(
    payload: TaskUpsertIn,
    _t: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    lesson = (
        db.query(Lesson).filter(Lesson.external_id == payload.lesson_external_id).first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if db.query(LessonTask).filter(LessonTask.external_id == payload.external_id).first():
        raise HTTPException(status_code=400, detail="Task external_id already exists")
    task = LessonTask(
        external_id=payload.external_id,
        lesson_id=lesson.id,
        type=payload.type,
        difficulty=payload.difficulty,
        position=payload.position if payload.position is not None else 0,
        payload=payload.payload or {},
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"id": task.id, "external_id": task.external_id}


@router.patch("/tasks/{task_id}")
def update_task(
    task_id: int,
    payload: TaskUpsertIn,
    _t: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    task = db.query(LessonTask).filter(LessonTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    lesson = (
        db.query(Lesson).filter(Lesson.external_id == payload.lesson_external_id).first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    task.lesson_id = lesson.id
    task.type = payload.type or task.type
    task.difficulty = payload.difficulty if payload.difficulty is not None else task.difficulty
    if payload.position is not None:
        task.position = payload.position
    if payload.payload is not None:
        task.payload = payload.payload
    db.commit()
    db.refresh(task)
    return {"id": task.id, "external_id": task.external_id}
