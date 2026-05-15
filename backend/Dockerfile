FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Build context is the repo root so we can also grab tasks_v1.json.
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY tasks_v1.json /tasks_v1.json

EXPOSE 8000
# Python entrypoint reads $PORT itself — survives builders that don't
# expand shell vars in exec-form CMDs (e.g. Railway's auto-generated start).
CMD ["python", "main.py"]
