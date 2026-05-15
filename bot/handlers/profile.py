from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, or_f
from aiogram.types import Message

from api import client
from keyboards import BTN_PROFILE, mini_app_button

router = Router(name="profile")


@router.message(or_f(Command("profile"), F.text == BTN_PROFILE))
async def on_profile(message: Message) -> None:
    user = message.from_user
    if not user:
        return

    progress = await client().get_my_progress(user.id)

    name = (progress or {}).get("first_name") or user.first_name or "—"
    streak = (progress or {}).get("streak_count")
    completed = (progress or {}).get("completed_lessons")
    accuracy = (progress or {}).get("average_accuracy")

    if progress is None:
        await message.answer(
            "Профиліңді жасау үшін алдымен Mini App-ты ашып, бір сабақтан өт.",
            reply_markup=mini_app_button(),
        )
        return

    lines = [
        "👤 *Сенің профилің*",
        "",
        f"Аты: {name}",
        f"🔥 Стрик: {streak if streak is not None else 0} күн",
        f"📚 Аяқталған сабақтар: {completed if completed is not None else 0}",
        f"🎯 Орташа дәлдік: {f'{accuracy}%' if accuracy is not None else '—'}",
    ]
    await message.answer("\n".join(lines), parse_mode="Markdown")
