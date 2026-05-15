"""Thin httpx wrapper around the backend's /api/* endpoints.

Per CLAUDE.md, every backend call uses a short timeout and degrades silently
on failure — handlers should always return *something* to the user, even when
the backend is down. The bot is a companion to the Mini App; if any call fails,
we just nudge the student to open the Mini App where auto-registration handles
the cold path.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from config import BACKEND_URL, HTTP_TIMEOUT_SEC, INTERNAL_BOT_TOKEN

logger = logging.getLogger(__name__)


class BackendClient:
    def __init__(self) -> None:
        headers: dict[str, str] = {}
        if INTERNAL_BOT_TOKEN:
            # Shared-secret header. Backend may or may not honour this in MVP;
            # if it doesn't, calls still go through but rely on the Mini App
            # for auto-registration.
            headers["X-Bot-Token"] = INTERNAL_BOT_TOKEN
        self._client = httpx.AsyncClient(
            base_url=BACKEND_URL,
            timeout=HTTP_TIMEOUT_SEC,
            headers=headers,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str, **params: Any) -> Optional[Any]:
        try:
            r = await self._client.get(path, params=params or None)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError:
            logger.warning("Backend GET %s failed", path, exc_info=True)
            return None

    async def _post(self, path: str, **json_body: Any) -> Optional[Any]:
        try:
            r = await self._client.post(path, json=json_body or None)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError:
            logger.warning("Backend POST %s failed", path, exc_info=True)
            return None

    # ---- domain methods --------------------------------------------------

    async def register_user(self, telegram_user: Any) -> Optional[dict]:
        """Best-effort registration. The Mini App is the canonical registration
        path (it sends the signed initData header). From the bot we either:

          1. POST /api/users/register with a JSON body + X-Bot-Token if the
             backend supports it, or
          2. Silently no-op and rely on the user opening the Mini App.

        Either way we return None on failure so handlers can keep going.
        """
        if telegram_user is None:
            return None
        payload = {
            "telegram_id": telegram_user.id,
            "first_name": telegram_user.first_name or "",
            "last_name": getattr(telegram_user, "last_name", "") or "",
            "username": getattr(telegram_user, "username", "") or "",
            "language_code": getattr(telegram_user, "language_code", "") or "",
        }
        return await self._post("/api/users/register", **payload)

    async def get_user_by_telegram(self, tg_id: int) -> Optional[dict]:
        # Convention: backend exposes a bot-friendly lookup. If it 404s, the
        # caller treats the user as un-registered.
        return await self._get(f"/api/users/by-telegram/{tg_id}")

    async def get_lessons(self, telegram_id: int) -> list[dict]:
        # Per-user catalogue: backend can return progress fields if it knows
        # the user; otherwise it returns the plain catalogue.
        data = await self._get("/api/lessons", telegram_id=telegram_id)
        return data or []

    async def get_my_progress(self, telegram_id: int) -> Optional[dict]:
        """Streak, completed lessons, average accuracy.

        Tries `/api/users/me?telegram_id=` first (lightweight), falls back to
        deriving from the lessons list if that endpoint is missing.
        """
        me = await self._get("/api/users/me", telegram_id=telegram_id)
        if me is not None:
            return me

        lessons = await self.get_lessons(telegram_id)
        if not lessons:
            return None
        completed = [l for l in lessons if l.get("completed_at")]
        accuracies = [l.get("accuracy") for l in completed if l.get("accuracy") is not None]
        avg = round(sum(accuracies) / len(accuracies), 1) if accuracies else None
        return {
            "first_name": None,
            "streak_count": None,
            "completed_lessons": len(completed),
            "average_accuracy": avg,
        }

    async def notify_teacher_of_attempt(self, *args: Any, **kwargs: Any) -> None:
        """Stub. Notifications flow the *other* way: the backend writes to its
        Notification table when a new attempt arrives, and the bot's poll loop
        (see notifier.py) picks them up. The bot does not push notifications
        *to* the backend. Kept here so callers don't crash if invoked.
        """
        return None

    async def pending_notifications(self, limit: int = 50) -> list[dict]:
        return await self._get("/api/bot/notifications/pending", limit=limit) or []

    async def ack_notification(self, notification_id: int) -> bool:
        return bool(await self._post(f"/api/bot/notifications/{notification_id}/delivered"))


# Module-level singleton — bot is single-process, so a shared client is fine.
_client: Optional[BackendClient] = None


def client() -> BackendClient:
    global _client
    if _client is None:
        _client = BackendClient()
    return _client


async def shutdown() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None
