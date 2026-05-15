from __future__ import annotations

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from api import client
from config import TEACHER_TELEGRAM_IDS
from keyboards import main_reply_keyboard, mini_app_button

router = Router(name="start")


STUDENT_TEXT = (
    "Сәлем, {name}!\n\n"
    "CLIL Physics Bot — физиканы ағылшын тілінде үйренуге арналған бот.\n\n"
    "— Әр сабақта 10 қысқа тапсырма (single choice, fill blank, matching, "
    "classification, ordering)\n"
    "— Әр жауаптан кейін бірден feedback пен тілдік кеңес\n"
    "— Стрик пен дәлдік жинай отырып үйрен\n\n"
    "Mini App арқылы ыңғайлы жүйеде ойнауға кеңес береміз."
)

TEACHER_TEXT = (
    "Сәлем, {name}!\n\n"
    "Сен — CLIL Physics Bot ұстазысың. Mini App арқылы:\n\n"
    "— Жаңа сабақтар мен тапсырмалар құрастыр\n"
    "— Топтың прогресін қара (lesson × student матрицасы)\n"
    "— Оқушылардың әрбір әрекетін зертте\n"
    "— Оқушыларға хабарлама жібер\n\n"
    "Бастаймыз."
)


@router.message(CommandStart())
async def on_start(message: Message) -> None:
    user = message.from_user
    if not user:
        return

    # Best-effort registration. If backend is up and accepts the bot's
    # X-Bot-Token, the user gets registered now; otherwise the Mini App will
    # handle it on first open.
    backend_user = await client().register_user(user)
    if backend_user is None:
        # Fallback: try lookup. If neither works, fall back to env-based role.
        backend_user = await client().get_user_by_telegram(user.id)

    if backend_user and backend_user.get("role"):
        role = backend_user["role"]
    else:
        role = "teacher" if user.id in TEACHER_TELEGRAM_IDS else "student"

    template = TEACHER_TEXT if role == "teacher" else STUDENT_TEXT
    text = template.format(
        name=user.first_name or ("ұстаз" if role == "teacher" else "оқушы"),
    )

    # Set the persistent reply keyboard first so it stays across the session.
    await message.answer(text, reply_markup=main_reply_keyboard(role))

    # One-time inline Mini App nudge for one-tap discovery.
    inline = mini_app_button()
    if inline is not None:
        await message.answer("Mini App-ты ашу:", reply_markup=inline)
