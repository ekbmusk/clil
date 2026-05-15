"""Bot-facing endpoints. All gated by `X-Bot-Token` (shared secret with the
aiogram service). These are *not* meant for the Mini App frontend.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import Notification, User
from app.utils.auth import require_bot_token

router = APIRouter(
    prefix="/api/bot",
    tags=["bot"],
    dependencies=[Depends(require_bot_token)],
)


@router.get("/notifications/pending")
def pending_notifications(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Notification, User)
        .join(User, User.id == Notification.user_id)
        .filter(Notification.read_at.is_(None))
        .order_by(Notification.created_at.asc())
        .limit(limit)
        .all()
    )
    out = []
    for note, user in rows:
        out.append(
            {
                "id": note.id,
                "kind": note.kind,
                "payload": note.payload or {},
                "created_at": note.created_at,
                "user": {
                    "id": user.id,
                    "telegram_id": user.telegram_id,
                    "first_name": user.first_name,
                    "username": user.username,
                    "role": user.role,
                },
            }
        )
    return out


@router.post("/notifications/{notification_id}/delivered")
def mark_delivered(notification_id: int, db: Session = Depends(get_db)):
    note: Optional[Notification] = (
        db.query(Notification).filter(Notification.id == notification_id).first()
    )
    if note is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    if note.read_at is None:
        note.read_at = datetime.utcnow()
        db.commit()
    return {"id": note.id, "read_at": note.read_at}
