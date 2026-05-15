"""SQLAlchemy engine + session, with idempotent table creation, a stub for
future ALTER-TABLE migrations, and seed data loading from tasks_v1.json.
"""
from __future__ import annotations

import logging
import os
from typing import Iterable

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.database.models import Base

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./clil_bot.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Iterable[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- migrations -------------------------------------------------------------

# (table_name, column_name, ddl_fragment) — all nullable / defaulted so we can
# tack them onto existing rows without a backfill. Add entries here as schema
# evolves; create_tables already covers fresh installs.
_SQLITE_MIGRATIONS: list[tuple[str, str, str]] = []


def _migrate_sqlite() -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return
    if not _SQLITE_MIGRATIONS:
        return
    inspector = inspect(engine)
    existing = {
        t: {c["name"] for c in inspector.get_columns(t)}
        for t in inspector.get_table_names()
    }
    with engine.begin() as conn:
        for table, column, ddl in _SQLITE_MIGRATIONS:
            if table not in existing or column in existing[table]:
                continue
            logger.info("Migrating %s: adding column %s", table, column)
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


def create_tables() -> None:
    """Create tables if missing, run lightweight migrations, then seed."""
    Base.metadata.create_all(bind=engine)
    _migrate_sqlite()

    # Imported lazily so a broken seed file can't keep us from booting.
    from app.database.seed import seed_from_json

    with SessionLocal() as db:
        try:
            seed_from_json(db)
        except Exception:  # noqa: BLE001 — seed is best-effort
            logger.exception("Seed failed; continuing with empty/partial DB")
