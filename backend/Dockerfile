FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
# Python entrypoint reads $PORT itself — survives builders that don't
# expand shell vars in exec-form CMDs (e.g. Railway's auto-generated start).
CMD ["python", "main.py"]
