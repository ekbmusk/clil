from __future__ import annotations

import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse, Response
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import Lesson, LessonProgress, User
from app.schemas.user import UserOut, UserRegisterOut
from app.utils.auth import get_current_user, require_bot_token

router = APIRouter(prefix="/api/users", tags=["users"])
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserRegisterOut)
def register(user: User = Depends(get_current_user)):
    """get_current_user does the work — find-or-create + role decision."""
    return UserRegisterOut(user=UserOut.model_validate(user), role=user.role)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.get(
    "/by-telegram/{telegram_id}",
    response_model=UserOut,
    dependencies=[Depends(require_bot_token)],
)
def by_telegram(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get(
    "/by-telegram/{telegram_id}/stats",
    dependencies=[Depends(require_bot_token)],
)
def by_telegram_stats(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    rows = (
        db.query(LessonProgress).filter(LessonProgress.user_id == user.id).all()
    )
    completed = sum(1 for r in rows if r.completed_at is not None)
    avg_accuracy = (sum(r.accuracy for r in rows) / len(rows)) if rows else 0.0
    return {
        "telegram_id": user.telegram_id,
        "first_name": user.first_name,
        "username": user.username,
        "role": user.role,
        "streak_count": user.streak_count or 0,
        "completed_lessons": completed,
        "total_lessons_with_progress": len(rows),
        "avg_accuracy": float(avg_accuracy),
    }


@router.get("/{user_id}/avatar")
async def avatar(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.photo_url:
        return RedirectResponse(user.photo_url, status_code=302)

    bot_token = os.getenv("BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        raise HTTPException(status_code=404, detail="No avatar available")

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(
                f"https://api.telegram.org/bot{bot_token}/getUserProfilePhotos",
                params={"user_id": user.telegram_id, "limit": 1},
            )
            data = r.json()
            if not data.get("ok") or not data["result"].get("photos"):
                raise HTTPException(status_code=404, detail="No avatar available")
            file_id = data["result"]["photos"][0][-1]["file_id"]
            r = await client.get(
                f"https://api.telegram.org/bot{bot_token}/getFile",
                params={"file_id": file_id},
            )
            fdata = r.json()
            if not fdata.get("ok"):
                raise HTTPException(status_code=404, detail="No avatar available")
            file_path = fdata["result"]["file_path"]
            r = await client.get(
                f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
            )
            return Response(
                content=r.content,
                media_type=r.headers.get("content-type", "image/jpeg"),
            )
    except httpx.HTTPError:
        logger.exception("Telegram avatar proxy failed")
        raise HTTPException(status_code=502, detail="Telegram unreachable")
