from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.schemas.lesson import LessonDetail, LessonSummary
from app.services import lesson_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/lessons", tags=["lessons"])


@router.get("/", response_model=list[LessonSummary])
def list_lessons(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return lesson_service.list_lessons(db, user)


@router.get("/{external_id}", response_model=LessonDetail)
def get_lesson(
    external_id: str,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = lesson_service.get_lesson(db, external_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson
