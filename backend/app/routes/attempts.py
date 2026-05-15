from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.schemas.attempt import AttemptIn, AttemptOut, LessonFinalizeOut
from app.services import attempt_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/attempts", tags=["attempts"])


@router.post("/", response_model=AttemptOut)
def submit(
    payload: AttemptIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = attempt_service.submit_attempt(
        db,
        user=user,
        task_external_id=payload.task_external_id,
        answer_payload=payload.answer,
    )
    return result


@router.post("/finalize-lesson/{external_id}", response_model=LessonFinalizeOut)
def finalize(
    external_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return attempt_service.finalize_lesson(db, user=user, lesson_external_id=external_id)
