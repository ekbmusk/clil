# Deploy — CLIL Physics Bot

Three pieces to deploy:
- **frontend** → Vercel (free)
- **backend** → Railway (Hobby)
- **bot** → Railway (same project, separate service)

Repo: <https://github.com/ekbmusk/clil>

---

## 0. Создать бота в @BotFather

В Telegram открой [@BotFather](https://t.me/BotFather) → `/newbot` → выбери имя и username (например `clil_physics_bot`). Скопируй `BOT_TOKEN`.

Затем:
- `/mybots` → выбери бота → **Bot Settings → Menu Button** → задай URL Mini App (пока временный — обновим после деплоя фронта).
- `/setdomain` → пропиши домен из Vercel (см. ниже).

---

## 1. Railway — backend + bot

Используем [railway.app](https://railway.app) (нужен GitHub login).

### 1.1 backend (FastAPI)
1. Railway → **New Project → Deploy from GitHub repo → `ekbmusk/clil`**.
2. Railway сам подхватит `railway.json` из корня → соберёт `backend/Dockerfile`.
3. Service **Settings**:
   - **Root Directory**: `/` (оставить пустым).
   - **Watch Paths**: `backend/**`, `tasks_v1.json` (чтобы пересборка только при изменениях бэка).
   - **Networking → Generate Domain** → получишь `https://<...>.up.railway.app`. Запиши — это `BACKEND_PUBLIC_URL`.
4. **Variables** (Settings → Variables):
   ```
   DATABASE_URL=sqlite:///./clil_bot.db
   TEACHER_TELEGRAM_IDS=<твой telegram user_id>
   BOT_TOKEN=<токен из BotFather>
   TELEGRAM_BOT_TOKEN=<тот же токен>
   MINI_APP_URL=https://<vercel domain>   # обновишь после шага 2
   INTERNAL_BOT_TOKEN=<любая случайная строка>
   LOG_LEVEL=INFO
   ```
   `PORT` Railway проставляет сам.
5. Volume (опционально, чтобы SQLite не терялась при редеплое):
   - Service → **Volumes → Mount path** `/app/data`.
   - `DATABASE_URL=sqlite:////app/data/clil_bot.db` (4 слэша — абсолютный путь).
6. Deploy → дождись зелёного health-check на `/api/health`.

### 1.2 bot (aiogram polling)
1. В **том же** Railway-проекте: **New Service → GitHub repo → `ekbmusk/clil`**.
2. Settings:
   - **Root Directory**: `/`.
   - **Build → Dockerfile Path**: `bot/Dockerfile` (override через UI, потому что `railway.json` смотрит на backend).
   - **Watch Paths**: `bot/**`.
   - **Networking**: оставить без публичного домена (бот сам обращается к Telegram).
3. **Variables**:
   ```
   BOT_TOKEN=<тот же токен>
   TELEGRAM_BOT_TOKEN=<тот же токен>
   BACKEND_URL=https://<backend railway domain>
   INTERNAL_BOT_TOKEN=<та же строка, что в backend>
   MINI_APP_URL=https://<vercel domain>
   TEACHER_TELEGRAM_IDS=<твой telegram user_id>
   ```
4. Deploy.

---

## 2. Vercel — frontend

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository → `ekbmusk/clil`**.
2. **Configure Project**:
   - **Root Directory**: `frontend`.
   - **Framework Preset**: Vite (auto-detect).
   - **Build Command**: `npm run build` (auto).
   - **Output Directory**: `dist` (auto).
3. **Environment Variables**:
   ```
   VITE_API_URL=https://<backend railway domain>/api
   ```
4. **Deploy**. Получишь домен типа `https://clil.vercel.app`.
5. Возвращайся к Railway → обнови `MINI_APP_URL` в обоих сервисах (backend + bot) на этот домен → redeploy.
6. Возвращайся к BotFather → **Menu Button** на этот домен.

---

## 3. Финальная проверка

1. Открой бота в Telegram → `/start`.
2. Нажми **🚀 Mini App ашу** → должен открыться список уроков.
3. Пройди один task — после `Тексеру` должен прийти зелёный/красный feedback.
4. Открой логи Railway:
   - backend logs должны показать `[seed] loaded 2 lessons, 20 tasks`.
   - bot logs не должны показывать стектрейсов на регулярных интервалах.

---

## Шпаргалка по переменным

| Var | backend | bot | frontend (Vercel) |
|-----|---------|-----|-------------------|
| `BOT_TOKEN` | ✓ (для avatar proxy) | ✓ | — |
| `TELEGRAM_BOT_TOKEN` | ✓ | ✓ | — |
| `MINI_APP_URL` | ✓ | ✓ | — |
| `BACKEND_URL` | — | ✓ | — (используем `VITE_API_URL`) |
| `DATABASE_URL` | ✓ | — | — |
| `TEACHER_TELEGRAM_IDS` | ✓ | ✓ | — |
| `INTERNAL_BOT_TOKEN` | ✓ | ✓ | — |
| `VITE_API_URL` | — | — | ✓ |

---

## Локальная разработка (для справки)

```bash
cp .env.example .env  # заполни BOT_TOKEN, TEACHER_TELEGRAM_IDS
docker compose up --build               # backend :8000 + frontend :3001
docker compose --profile bot up         # + bot
```
