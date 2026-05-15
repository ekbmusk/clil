from aiogram import Router

from . import help, lessons, profile, start


def all_routers() -> list[Router]:
    return [
        start.router,
        lessons.router,
        profile.router,
        help.router,
    ]
