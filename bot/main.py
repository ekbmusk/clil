from __future__ import annotations

import asyncio
import logging
import os

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.types import BotCommand

import api
from config import BOT_TOKEN, assert_runtime_config
from handlers import all_routers

# TODO(notifier): uncomment to enable the backend → bot notification loop
# import notifier  # noqa: F401


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


BOT_COMMANDS = [
    BotCommand(command="start", description="Бастапқы экран"),
    BotCommand(command="lessons", description="Сабақтар тізімі"),
    BotCommand(command="profile", description="Профиль және статистика"),
    BotCommand(command="help", description="Көмек"),
]


async def main() -> None:
    if not assert_runtime_config():
        logger.warning(
            "BOT_TOKEN (or TELEGRAM_BOT_TOKEN) is not set — bot cannot start. "
            "Set it in the project root .env and re-run."
        )
        return

    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=None),
    )
    dispatcher = Dispatcher()
    for router in all_routers():
        dispatcher.include_router(router)

    # TODO(notifier): once backend exposes /api/bot/notifications, flip these
    # two lines on to push attempt alerts / streak reminders to users.
    # stop_event = asyncio.Event()
    # notifier_task = asyncio.create_task(notifier.poll_notifications(bot, stop_event))

    try:
        await bot.set_my_commands(BOT_COMMANDS)
        logger.info("Starting bot polling")
        await dispatcher.start_polling(
            bot, allowed_updates=dispatcher.resolve_used_update_types()
        )
    finally:
        # TODO(notifier): mirror these on the shutdown path:
        # stop_event.set()
        # await notifier_task
        await api.shutdown()
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot stopped")
