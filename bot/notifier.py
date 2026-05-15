"""Stub: periodic dispatch loop for backend → bot notifications.

Contract (not yet implemented on the backend side):

    GET /api/bot/notifications?since=<iso8601>
        → [{ id, telegram_id, type, payload, created_at }, ...]
    POST /api/bot/notifications/{id}/delivered
        → { ok: true }

Notification types we expect to handle eventually:
    - "new_attempt"     — teacher sees that a student tried a lesson
    - "lesson_reminder" — student gets a streak nudge
    - "broadcast"       — free-form text from teacher's broadcast composer

For MVP this loop is *defined but not started* — flip it on by uncommenting
the `asyncio.create_task(...)` line in main.py once the backend exposes the
endpoints above.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from api import client
from config import NOTIFIER_INTERVAL_SEC
from keyboards import lesson_open_kb, mini_app_button

logger = logging.getLogger(__name__)


def _format(notification: dict) -> tuple[str, Optional[str]]:
    """Return (text, optional_lesson_external_id) for a notification."""
    kind = notification.get("kind") or notification.get("type")
    payload = notification.get("payload") or {}

    if kind == "broadcast":
        return payload.get("text") or "", None

    if kind == "lesson_finished":
        student = payload.get("student_name") or "Оқушы"
        lesson = payload.get("lesson_title") or payload.get("lesson_external_id") or "сабақ"
        acc_raw = payload.get("accuracy")
        acc = (
            f"{round(acc_raw * 100)}%"
            if isinstance(acc_raw, (int, float))
            else "—"
        )
        return (
            f"🎓 *{student}* «{lesson}» сабағын аяқтады.\nДәлдік: *{acc}*",
            payload.get("lesson_external_id"),
        )

    if kind == "new_attempt":
        student = payload.get("student_name") or "Оқушы"
        username = payload.get("student_username")
        suffix = f" (@{username})" if username else ""
        lesson = payload.get("lesson_title") or payload.get("lesson_external_id") or "сабақ"
        return (
            f"*Жаңа әрекет*\n\n{student}{suffix} «{lesson}» сабағында тапсырма орындады.",
            payload.get("lesson_external_id"),
        )

    if kind == "lesson_reminder":
        lesson = payload.get("lesson_title") or payload.get("lesson_external_id") or "сабақ"
        return (
            f"🔥 Стригіңді жоғалтпа! «{lesson}» сабағын аяқтауды ұмытпа.",
            payload.get("lesson_external_id"),
        )

    return payload.get("text") or kind or "Жаңа хабар", payload.get("lesson_external_id")


def _recipient_telegram_id(notification: dict) -> Optional[int]:
    """Backend nests recipient info under `user.telegram_id`."""
    user = notification.get("user") or {}
    tg_id = user.get("telegram_id") or notification.get("telegram_id")
    try:
        return int(tg_id) if tg_id is not None else None
    except (TypeError, ValueError):
        return None


async def deliver_one(bot: Bot, notification: dict) -> bool:
    text, lesson_id = _format(notification)
    chat_id = _recipient_telegram_id(notification)
    if not text or chat_id is None:
        await client().ack_notification(notification["id"])
        return True

    keyboard = (
        lesson_open_kb(lesson_id) if lesson_id else mini_app_button()
    )

    try:
        await bot.send_message(
            chat_id=chat_id,
            text=text,
            parse_mode="Markdown",
            reply_markup=keyboard,
        )
    except TelegramAPIError as exc:
        message = str(exc).lower()
        if any(k in message for k in ("blocked", "chat not found", "user is deactivated")):
            logger.info("Dropping notification %s: %s", notification["id"], exc)
            await client().ack_notification(notification["id"])
            return True
        logger.warning("Telegram delivery failed for %s: %s", notification["id"], exc)
        return False

    await client().ack_notification(notification["id"])
    return True


async def poll_notifications(bot: Bot, stop_event: asyncio.Event) -> None:
    """Long-running poll loop. Start with `asyncio.create_task(...)` from
    main.py when ready. Survives backend hiccups.
    """
    logger.info("Notifier started (interval %ss)", NOTIFIER_INTERVAL_SEC)
    while not stop_event.is_set():
        try:
            pending = await client().pending_notifications()
            for n in pending:
                if stop_event.is_set():
                    break
                await deliver_one(bot, n)
        except Exception:  # noqa: BLE001 — never let a tick kill the loop
            logger.exception("Notifier tick failed")

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=NOTIFIER_INTERVAL_SEC)
        except asyncio.TimeoutError:
            pass
    logger.info("Notifier stopped")
