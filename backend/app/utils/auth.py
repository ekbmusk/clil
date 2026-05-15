"""Telegram-initData based auth.

Matches the stem-bot approach: the backend trusts the X-Telegram-Init-Data
header WITHOUT verifying its HMAC signature. The teacher role is decided
server-side by matching the Telegram user ID against TEACHER_TELEGRAM_IDS.

TODO: harden this before production. We should validate the initData
signature using BOT_TOKEN per Telegram's spec. Out-of-scope for MVP.
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from typing import Optional
from urllib.parse import parse_qsl

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User

logger = logging.getLogger(__name__)

_DEV_FALLBACK_TELEGRAM_ID = 1


def parse_init_data(init_data: str) -> dict:
    """Parse the Telegram WebApp initData query string into a dict.

    The `user` field is JSON-decoded; other fields are returned as raw strings.
    Returns an empty dict on missing / unparseable input rather than raising.
    """
    if not init_data:
        return {}
    try:
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    except Exception:  # noqa: BLE001
        logger.warning("Failed to parse Telegram initData query string")
        return {}
    user_raw = parsed.get("user")
    if user_raw:
        try:
            parsed["user"] = json.loads(user_raw)
        except json.JSONDecodeError:
            logger.warning("Failed to parse Telegram initData user field")
            parsed["user"] = None
    return parsed


def get_teacher_ids() -> set[int]:
    raw = os.getenv("TEACHER_TELEGRAM_IDS", "")
    out: set[int] = set()
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            out.add(int(part))
        except ValueError:
            logger.warning("Invalid teacher Telegram ID: %s", part)
    return out


def is_teacher(telegram_id: int) -> bool:
    return telegram_id in get_teacher_ids()


def _upsert_user(
    db: Session,
    *,
    telegram_id: int,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    username: Optional[str] = None,
    photo_url: Optional[str] = None,
) -> User:
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    desired_role = "teacher" if is_teacher(telegram_id) else "student"
    if user is None:
        user = User(
            telegram_id=telegram_id,
            first_name=first_name,
            last_name=last_name,
            username=username,
            photo_url=photo_url,
            role=desired_role,
        )
        db.add(user)
    else:
        user.first_name = first_name or user.first_name
        user.last_name = last_name or user.last_name
        user.username = username or user.username
        user.photo_url = photo_url or user.photo_url
        # Allow role promotion/demotion as TEACHER_TELEGRAM_IDS changes.
        user.role = desired_role
    user.last_active_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user


def get_current_user(
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data"),
    db: Session = Depends(get_db),
) -> User:
    """Find-or-create the caller's user record.

    If the initData header is missing/unparseable, we fall back to a dev user
    (telegram_id=1) so the API is usable from curl during development. In
    production this should be tightened.
    """
    parsed = parse_init_data(x_telegram_init_data or "")
    tg_user = parsed.get("user") if isinstance(parsed.get("user"), dict) else None
    tg_id = tg_user.get("id") if tg_user else None

    if not tg_id:
        # Dev fallback — see module docstring.
        return _upsert_user(
            db,
            telegram_id=_DEV_FALLBACK_TELEGRAM_ID,
            first_name="Dev",
            username="dev",
        )

    return _upsert_user(
        db,
        telegram_id=int(tg_id),
        first_name=tg_user.get("first_name"),
        last_name=tg_user.get("last_name"),
        username=tg_user.get("username"),
        photo_url=tg_user.get("photo_url"),
    )


def require_teacher(user: User = Depends(get_current_user)) -> User:
    if user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher access required",
        )
    return user
