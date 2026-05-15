# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CLIL Physics Bot — a Telegram Mini App that teaches **physics through English** (CLIL = Content and Language Integrated Learning) via Duolingo-style microtasks. Students see English physics tasks; teachers see progress dashboards. UI chrome is in Kazakh; the educational content stays in English by design.

A **lesson** is the unit of study (e.g. `1.3 Density`, `2.1 Movement vocabulary`). Each lesson has:

- `topic` — broad area (e.g. "Making measurements")
- `title` — short title shown in the catalogue
- `intro` — one-sentence opener
- `physics_target` — what physics concept is being practised
- `language_target` — what English structure is being practised (comparatives, defining clauses, etc.)
- `tasks[]` — an ordered list of microtasks. There are **5 task types**, all defined in `tasks_v1.json`:

| Type | Student input | Auto-grading |
|------|---------------|--------------|
| `single_choice` | one option index | exact match against `correct_index` |
| `fill_blank` | string | case-insensitive match against any of `correct_answers[]` (whitespace-trimmed) |
| `matching` | array of `[left_index, right_index]` pairs | set-equality with `correct_pairs` |
| `classification` | `{item: category}` map | exact match with `correct_mapping` |
| `ordering` | array of item indices | sequence-equality with `correct_order` |

Every task carries `feedback_right`, `feedback_wrong`, and an optional `language_tip` — these are shown immediately after the student submits (Duolingo-style), not buffered for teacher review.

The canonical content lives in `tasks_v1.json` at the project root and is seeded into the DB on backend startup (idempotent). Teachers can also author tasks via the Mini App.

**One Mini App, two roles**, gated server-side by Telegram user ID:

- **Student (оқушы)** — picks a lesson, plays microtasks one-by-one with instant feedback and a progress bar. Earns streak / completion.
- **Teacher (мұғалім)** — same Mini App, recognised via `TEACHER_TELEGRAM_IDS`, sees per-group progress matrix, individual attempts, and a task authoring screen.

There is **no separate teacher web app**. Role detection happens server-side; the frontend renders student or teacher screens from the same React app.

## Conventions

- UI chrome: **Kazakh**. Task content: **English** (this is CLIL). Engineering language: English.
- No long-form theory, no equipment lists, no videos in MVP — keep tasks short and snappy.
- Core stack: React 18 + Vite 5 + TailwindCSS 3, FastAPI + SQLAlchemy 2 + Pydantic 2, aiogram 3, SQLite. AI is optional (Groq llama-3.3-70b for adaptive hints).
- No test suite. No linting/formatting configs.

## Local Development Commands

```bash
# Backend (API docs at localhost:8000/docs) — must run from backend/
cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend — Vite dev server on :3000, proxies /api → localhost:8000
cd frontend && npm install && npm run dev

# Bot
cd bot && pip install -r requirements.txt && python main.py

# Docker (all services: frontend :3001, backend :8000)
docker compose up --build
docker compose --profile bot up   # also start the bot
```

## Architecture

### Three services

- **frontend/** — Single Telegram Mini App for both roles. React + Zustand + axios. On launch, backend returns `{ role: "student" | "teacher" }`; the app branches into `routes/student/*` or `routes/teacher/*`. Sends `X-Telegram-Init-Data` header on every API request.
- **backend/** — FastAPI REST API under `/api/`. Thin routers → `app/services/`. SQLite auto-creates and seeds from `tasks_v1.json` on startup (idempotent). Teacher-only routes are protected by `require_teacher`.
- **bot/** — aiogram 3 long-polling. Communicates with backend via httpx. Sends streak reminders, notifies teachers when new attempts arrive.

### Backend internals

- **Models** (`app/database/models.py`):
  - `User` — `telegram_id`, `role` (`student` | `teacher`), `first_name`, `username`, `streak_count`, `last_active_at`.
  - `Group`, `GroupEnrollment` — many-to-many users ↔ groups.
  - `Lesson` — `external_id` (e.g. `"1.3"`), `topic`, `title`, `intro`, `physics_target`, `language_target`, `position`.
  - `LessonTask` — `lesson_id`, `external_id` (e.g. `"1.3.4"`), `position`, `type`, `difficulty`, and a single `payload` JSON column that holds the type-specific fields (`prompt`, `options`, `correct_index`, etc.). This keeps the schema flat and matches how `tasks_v1.json` is shaped.
  - `LessonProgress` — `user_id`, `lesson_id`, `completed_at`, `correct_count`, `total_count`, `accuracy`.
  - `TaskAttempt` — `user_id`, `task_id`, `payload` JSON (student's answer), `is_correct`, `created_at`. **Append-only** — every attempt is logged so the teacher can see retries.
  - `Notification`, `BroadcastLog` — same patterns as the STEM bot.
- **Auth** (`app/utils/auth.py`): No password login. Both roles authenticate via `X-Telegram-Init-Data`. Teacher role decided server-side by comparing Telegram ID against `TEACHER_TELEGRAM_IDS`. Students auto-registered on first launch. `require_teacher` rejects non-teacher requests. No initData signature validation in MVP — trusts the header.
- **Grader** (`app/services/grader.py`): pure function `grade(task, answer) → {is_correct, feedback}`. One branch per task type, mirroring the table above. **Always trust the server's grading, never the client**.
- **Seed** (`app/database/seed.py`): reads `tasks_v1.json` from project root, upserts lessons + tasks by `external_id`. Safe to re-run.

### Backend API routes (`/api/`)

| Group | Endpoints |
|-------|-----------|
| `/users` | `POST /register` (returns `{role}`), `GET /me`, `GET /{id}/avatar` |
| `/lessons` | `GET /` (catalogue with per-user progress), `GET /{external_id}` (full lesson + tasks) |
| `/attempts` | `POST /` (submit a single task answer → returns `{is_correct, correct_value, feedback, language_tip}`), `POST /finalize-lesson/{external_id}` (mark lesson complete) |
| `/groups` | `GET /`, `POST /` (teacher), `POST /{id}/enroll`, `GET /{id}/progress` |
| `/teacher` | `require_teacher`. `GET /stats`, `GET /students`, `GET /attempts`, `POST /broadcast`, `POST /lessons`, `PATCH /lessons/{external_id}`, `POST /tasks`, `PATCH /tasks/{id}` |

### Frontend internals

- **State**: `store/userStore.js` (user + role), `store/lessonStore.js` (catalogue cache, current lesson, current task index, per-task local answers + feedback). Zustand, no persist middleware.
- **API layer**: `src/api/client.js` (axios, baseURL from `VITE_API_URL` or `/api`, 15s timeout, auto-attaches Telegram initData). Per-domain modules in `src/api/`.
- **Role routing**: `App.jsx` reads `user.role` after `/users/register`. Student → `/lessons` catalogue + lesson player. Teacher → `/teacher/dashboard` with group matrix, attempt inspector, lesson editor, broadcast.
- **Task renderers** (`src/components/tasks/`):
  - `SingleChoice.jsx` — radio-style cards.
  - `FillBlank.jsx` — text input with `___` placeholder rendered in the prompt.
  - `Matching.jsx` — two columns; tap-left then tap-right to pair, or drag.
  - `Classification.jsx` — chips that the student drops into category buckets.
  - `Ordering.jsx` — drag handle list (hello-pangea/dnd).
  - All render `feedback_right`/`feedback_wrong` after `POST /attempts` and surface `language_tip` if present.
- **Telegram SDK**: `WebApp.ready()` + `expand()` + `setHeaderColor('#0F0F1A')` in `App.jsx`. Haptics on right/wrong.
- **Vite config**: `envDir: '../'`, dev proxy `/api` → `localhost:8000`.
- **Tailwind theme**: Dark only. `bg: #0F0F1A`, `surface: #1A1A2E`, `primary: #6C63FF`, `success: #22C55E`, `danger: #EF4444`. Font: Inter.

### Bot internals

- **Handlers**: start (register + role-aware welcome + Mini App button), profile (streak + completion %), lessons (next recommended lesson), help. Teacher handlers: notifications on new attempts.
- **Communication**: backend via `httpx.AsyncClient`, 5–10s timeout. Silent failure pattern (try/except pass).

## Engineering Conventions

- UI chrome in Kazakh; task content in English; code in English.
- Frontend: 100% Tailwind utilities. Mobile-first, Telegram WebView compatible. Haptic feedback on submit.
- Backend: Thin routers → services. Pydantic schemas for all request/response.
- Server-side grading is the only source of truth; the client never decides correctness.
- `.env` sits at project root (this directory), loaded by backend and bot via python-dotenv, by frontend via Vite `envDir: '../'`.

## Environment Variables

Required in `.env`:
```
BOT_TOKEN, TELEGRAM_BOT_TOKEN, MINI_APP_URL,
BACKEND_URL (default http://localhost:8000),
DATABASE_URL (default sqlite:///./clil_bot.db),
TEACHER_TELEGRAM_IDS (comma-separated)
```
Optional: `GROQ_API_KEY` (adaptive hints), `INTERNAL_BOT_TOKEN` (bot ↔ backend shared secret).
Frontend: `VITE_API_URL` (defaults to `/api` via the dev proxy).

## Where the data starts

`tasks_v1.json` at the project root is the source of truth for the seed catalogue. To add lessons:
1. Edit `tasks_v1.json` (keep the schema in the `task_types` block stable).
2. Restart the backend — the seed loader upserts by `external_id`.
3. Or use the teacher Mini App editor (writes to the same tables).
