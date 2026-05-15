"""Centralised env-driven config for the CLIL Physics Bot process."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# .env sits at project root, one level up from bot/.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


# Telegram — accept either name; BOT_TOKEN takes precedence.
BOT_TOKEN = os.getenv("BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN") or ""

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
INTERNAL_BOT_TOKEN = os.getenv("INTERNAL_BOT_TOKEN", "")
MINI_APP_URL = os.getenv("MINI_APP_URL", "")


def _parse_teacher_ids(raw: str) -> set[int]:
    ids: set[int] = set()
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        try:
            ids.add(int(chunk))
        except ValueError:
            continue
    return ids


TEACHER_TELEGRAM_IDS: set[int] = _parse_teacher_ids(os.getenv("TEACHER_TELEGRAM_IDS", ""))

NOTIFIER_INTERVAL_SEC = int(os.getenv("NOTIFIER_INTERVAL_SEC", "30"))
HTTP_TIMEOUT_SEC = float(os.getenv("BOT_HTTP_TIMEOUT_SEC", "10"))


def assert_runtime_config() -> bool:
    """Return True iff the critical envs are present. Caller decides what to do.

    We intentionally don't raise — `main.py` logs a warning and exits cleanly
    so the process supervisor doesn't restart in a hot loop.
    """
    return bool(BOT_TOKEN)
