from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, or_f
from aiogram.types import Message

from api import client
from keyboards import BTN_LESSONS, lesson_open_kb, mini_app_button

router = Router(name="lessons")

_MAX_LESSONS = 5


def _format_accuracy(value: object) -> str:
    if value is None:
        return "—"
    try:
        return f"{float(value):.0f}%"
    except (TypeError, ValueError):
        return "—"


@router.message(or_f(Command("lessons"), F.text == BTN_LESSONS))
async def on_lessons(message: Message) -> None:
    user = message.from_user
    if not user:
        return

    lessons = await client().get_lessons(user.id)
    if not lessons:
        await message.answer(
            "Сабақтар тізімі әзірге бос немесе сервер қолжетімсіз. Mini App-тан көріп көр.",
            reply_markup=mini_app_button(),
        )
        return

    # Header message
    await message.answer("📚 *Сабақтар (top 5)*", parse_mode="Markdown")

    # One inline button per lesson — Telegram allows multiple short messages,
    # which works better in WebView than a single huge inline grid.
    for lesson in lessons[:_MAX_LESSONS]:
        external_id = lesson.get("external_id") or lesson.get("id") or "?"
        title = lesson.get("title") or lesson.get("topic") or "Lesson"
        accuracy = _format_accuracy(lesson.get("accuracy"))
        text = f"*{external_id}* — {title}\n🎯 {accuracy}"
        kb = lesson_open_kb(str(external_id))
        if kb is not None:
            await message.answer(text, parse_mode="Markdown", reply_markup=kb)
        else:
            await message.answer(text, parse_mode="Markdown")

    if len(lessons) > _MAX_LESSONS:
        await message.answer(
            f"_Тағы {len(lessons) - _MAX_LESSONS} сабақ Mini App-та_",
            parse_mode="Markdown",
            reply_markup=mini_app_button(),
        )
