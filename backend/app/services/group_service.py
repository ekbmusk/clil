from __future__ import annotations

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Group, GroupEnrollment, User


def list_groups(db: Session) -> list[dict]:
    rows = (
        db.query(Group, func.count(GroupEnrollment.id))
        .outerjoin(GroupEnrollment, GroupEnrollment.group_id == Group.id)
        .group_by(Group.id)
        .order_by(Group.name)
        .all()
    )
    return [
        {
            "id": g.id,
            "name": g.name,
            "code": g.code,
            "created_at": g.created_at,
            "student_count": count or 0,
        }
        for g, count in rows
    ]


def create_group(db: Session, *, name: str, code: str) -> Group:
    existing = db.query(Group).filter(Group.code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Group code already exists")
    g = Group(name=name, code=code)
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


def find_group(db: Session, group_id: int) -> Group:
    g = db.query(Group).filter(Group.id == group_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    return g


def find_group_by_code(db: Session, code: str) -> Optional[Group]:
    return db.query(Group).filter(Group.code == code).first()


def enroll(db: Session, *, group_id: int, user_id: int) -> GroupEnrollment:
    find_group(db, group_id)
    if not db.query(User).filter(User.id == user_id).first():
        raise HTTPException(status_code=404, detail="User not found")
    existing = (
        db.query(GroupEnrollment)
        .filter(
            GroupEnrollment.group_id == group_id,
            GroupEnrollment.user_id == user_id,
        )
        .first()
    )
    if existing:
        return existing
    e = GroupEnrollment(group_id=group_id, user_id=user_id)
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


def unenroll(db: Session, *, group_id: int, user_id: int) -> None:
    db.query(GroupEnrollment).filter(
        GroupEnrollment.group_id == group_id,
        GroupEnrollment.user_id == user_id,
    ).delete()
    db.commit()
