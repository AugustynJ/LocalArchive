FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py email_utils.py ./

RUN useradd --uid 10001 --no-create-home app && mkdir -p /data/uploads && chown app:app /data/uploads
USER app

EXPOSE 5000
# gthread: 2 procesy x 4 wątki; argon2 (64 MiB/hash) mieści się w limicie 1 GiB
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--worker-class", "gthread", "--timeout", "60", "--access-logfile", "-", "app:app"]
