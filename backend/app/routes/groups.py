from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.schemas.group import EnrollIn, GroupCreateIn, GroupOut
from app.services import group_service, teacher_service
from app.utils.auth import get_current_user, require_teacher

router = APIRouter(prefix="/api/groups", tags=["groups"])


@router.get("/", response_model=list[GroupOut])
def list_groups(
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return group_service.list_groups(db)


@router.post("/", response_model=GroupOut)
def create_group(
    payload: GroupCreateIn,
    _teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    g = group_service.create_group(db, name=payload.name, code=payload.code)
    return GroupOut(
        id=g.id,
        name=g.name,
        code=g.code,
        created_at=g.created_at,
        student_count=0,
    )


@router.post("/{group_id}/enroll")
def enroll(
    group_id: int,
    payload: EnrollIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Two modes:

      - teacher passes {"user_id": N} to enroll any student
      - student passes {"code": "..."} on a group whose code matches → self-enroll
    """
    target_user_id = payload.user_id

    if user.role != "teacher":
        # Students can only self-enroll, and only if the code matches.
        if not payload.code:
            raise HTTPException(status_code=403, detail="Teacher access required")
        g = group_service.find_group_by_code(db, payload.code)
        if not g or g.id != group_id:
            raise HTTPException(status_code=400, detail="Group code mismatch")
        target_user_id = user.id

    if target_user_id is None:
        raise HTTPException(status_code=400, detail="user_id required")

    e = group_service.enroll(db, group_id=group_id, user_id=target_user_id)
    return {"id": e.id, "group_id": e.group_id, "user_id": e.user_id}


@router.delete("/{group_id}/enroll/{user_id}")
def unenroll(
    group_id: int,
    user_id: int,
    _teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    group_service.unenroll(db, group_id=group_id, user_id=user_id)
    return {"ok": True}


@router.get("/{group_id}/progress")
def progress(
    group_id: int,
    _teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return teacher_service.group_progress(db, group_id)
