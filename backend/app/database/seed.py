"""Seed loader for tasks_vN.json. Idempotent: upserts lessons + tasks by their
JSON `id` (which we store as `external_id`). Two default groups are also
ensured.

We prefer the highest-versioned tasks file we find. Search order, in:
  1. $TASKS_JSON_PATH (overrides everything)
  2. /tasks_v2.json, /tasks_v1.json (Docker bind paths)
  3. <backend>/tasks_v2.json, <backend>/tasks_v1.json (shipped in image)
  4. <backend>/../tasks_v2.json, <backend>/../tasks_v1.json (local dev)
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.database.models import Group, Lesson, LessonTask

logger = logging.getLogger(__name__)


_DEFAULT_GROUPS = [
    {"name": "10A", "code": "10A"},
    {"name": "11B", "code": "11B"},
]

# Fields that move from the JSON task entry into LessonTask columns; the rest
# is stuffed into `payload` verbatim.
_TASK_COLUMN_FIELDS = {"id", "type", "difficulty"}


_VERSIONS = ("v2", "v1")


def _locate_tasks_json() -> Optional[Path]:
    env_path = os.getenv("TASKS_JSON_PATH")
    if env_path:
        p = Path(env_path)
        if p.is_file():
            return p

    backend_dir = Path(__file__).resolve().parent.parent.parent  # → backend/
    project_root = backend_dir.parent  # → repo root
    for v in _VERSIONS:
        for p in (
            Path(f"/tasks_{v}.json"),
            backend_dir / f"tasks_{v}.json",
            project_root / f"tasks_{v}.json",
        ):
            if p.is_file():
                return p
    return None


def _seed_groups(db: Session) -> None:
    existing_codes = {g.code for g in db.query(Group).all()}
    for g in _DEFAULT_GROUPS:
        if g["code"] in existing_codes:
            continue
        db.add(Group(name=g["name"], code=g["code"]))


def seed_from_json(db: Session) -> None:
    path = _locate_tasks_json()
    if not path:
        logger.warning("tasks_v1.json not found; skipping content seed")
        _seed_groups(db)
        db.commit()
        return

    try:
        with path.open("r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception:  # noqa: BLE001 — malformed seed shouldn't crash the API
        logger.exception("Failed to parse tasks_v1.json at %s", path)
        _seed_groups(db)
        db.commit()
        return

    lessons_raw = raw.get("lessons") or []
    lesson_count = 0
    task_count = 0

    for lesson_pos, lesson_entry in enumerate(lessons_raw):
        try:
            ext_id = lesson_entry["id"]
        except (KeyError, TypeError):
            logger.warning("Skipping lesson without id: %r", lesson_entry)
            continue

        try:
            lesson = (
                db.query(Lesson).filter(Lesson.external_id == ext_id).first()
            )
            if lesson is None:
                lesson = Lesson(external_id=ext_id, title=lesson_entry.get("title") or ext_id)
                db.add(lesson)
                db.flush()

            lesson.topic = lesson_entry.get("topic")
            lesson.title = lesson_entry.get("title") or ext_id
            lesson.intro = lesson_entry.get("intro")
            lesson.physics_target = lesson_entry.get("physics_target")
            lesson.language_target = lesson_entry.get("language_target")
            lesson.position = lesson_pos

            lesson_count += 1

            for task_pos, task_entry in enumerate(lesson_entry.get("tasks") or []):
                try:
                    task_ext_id = task_entry["id"]
                except (KeyError, TypeError):
                    logger.warning("Skipping task without id in lesson %s", ext_id)
                    continue

                payload = {
                    k: v
                    for k, v in task_entry.items()
                    if k not in _TASK_COLUMN_FIELDS
                }

                task = (
                    db.query(LessonTask)
                    .filter(LessonTask.external_id == task_ext_id)
                    .first()
                )
                if task is None:
                    task = LessonTask(
                        external_id=task_ext_id,
                        lesson_id=lesson.id,
                        type=task_entry.get("type") or "single_choice",
                    )
                    db.add(task)

                task.lesson_id = lesson.id
                task.position = task_pos
                task.type = task_entry.get("type") or task.type
                task.difficulty = int(task_entry.get("difficulty") or 1)
                task.payload = payload
                task_count += 1

        except Exception:  # noqa: BLE001 — one bad lesson shouldn't kill the rest
            logger.exception("Failed to seed lesson %r", lesson_entry.get("id"))
            db.rollback()
            continue

    _seed_groups(db)
    db.commit()
    print(f"[seed] loaded {lesson_count} lessons, {task_count} tasks")
