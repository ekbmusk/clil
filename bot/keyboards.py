"""Keyboard factories.

- `main_reply_keyboard` — persistent reply keyboard sent on /start, gives
  the student fast access to the most-used flows without typing slash commands.
- `mini_app_button` / `lesson_open_kb` — inline web-app buttons used inside
  individual messages (welcomes, lesson lists, notifications).
"""
from __future__ import annotations

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

from config import MINI_APP_URL

# Button labels — also used as message-text filters in handlers so the same
# function fires whether the user typed /command or tapped the button.
BTN_OPEN_APP = "🚀 Mini App ашу"
BTN_LESSONS = "📚 Сабақтар"
BTN_PROFILE = "👤 Профиль"
BTN_HELP = "ℹ️ Көмек"


def main_reply_keyboard(role: str | None = None) -> ReplyKeyboardMarkup:
    """Persistent keyboard shown under the chat input. Stays put across
    messages until the bot replaces it. The web-app button is only attached
    when MINI_APP_URL is set, since aiogram refuses empty URLs.
    """
    rows: list[list[KeyboardButton]] = []
    if MINI_APP_URL:
        rows.append([KeyboardButton(text=BTN_OPEN_APP, web_app=WebAppInfo(url=MINI_APP_URL))])
    rows.append(
        [
            KeyboardButton(text=BTN_LESSONS),
            KeyboardButton(text=BTN_PROFILE),
        ]
    )
    rows.append([KeyboardButton(text=BTN_HELP)])
    return ReplyKeyboardMarkup(
        keyboard=rows,
        resize_keyboard=True,
        is_persistent=True,
    )


def mini_app_button(text: str = BTN_OPEN_APP) -> InlineKeyboardMarkup | None:
    """One-tap inline Mini App opener. Returns None if MINI_APP_URL is unset
    so callers can guard their reply_markup.
    """
    if not MINI_APP_URL:
        return None
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=text, web_app=WebAppInfo(url=MINI_APP_URL))],
        ]
    )


def lesson_open_kb(
    lesson_external_id: str, label: str = "Ашу"
) -> InlineKeyboardMarkup | None:
    """Deep-link button — opens the Mini App with the lesson preselected via
    `?lesson=<external_id>`. The frontend reads this from
    `Telegram.WebApp.initDataUnsafe.start_param` or the query string.
    """
    if not MINI_APP_URL:
        return None
    sep = "&" if "?" in MINI_APP_URL else "?"
    url = f"{MINI_APP_URL}{sep}lesson={lesson_external_id}"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=label, web_app=WebAppInfo(url=url))]
        ]
    )
