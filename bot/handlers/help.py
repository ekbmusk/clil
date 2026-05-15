from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, or_f
from aiogram.types import Message

from keyboards import BTN_HELP, mini_app_button

router = Router(name="help")

HELP_TEXT = (
    "ℹ️ *Көмек*\n\n"
    "Бұл бот сені физиканы ағылшын тілінде үйренуге көмектеседі. "
    "Әр сабақта 10 микро-тапсырма бар: бір таңдау (single choice), "
    "толтыру (fill blank), сәйкестендіру (matching), "
    "топтастыру (classification), реттеу (ordering). "
    "Үздіксіз шынықтыр!\n\n"
    "*Командалар*\n"
    "/start — бастапқы экран\n"
    "/lessons — сабақтар тізімі\n"
    "/profile — профиль және статистика\n"
    "/help — осы анықтама\n\n"
    "💡 *Кеңес:* Mini App арқылы ыңғайлы жүйеде ойна — барлық тапсырма түрі толық қолдау табады."
)


@router.message(or_f(Command("help"), F.text == BTN_HELP))
async def on_help(message: Message) -> None:
    await message.answer(
        HELP_TEXT,
        parse_mode="Markdown",
        reply_markup=mini_app_button(),
    )
