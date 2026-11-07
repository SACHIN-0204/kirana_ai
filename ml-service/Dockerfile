FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --upgrade pip setuptools wheel

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python -c "from prophet import Prophet; print('Prophet OK')"

EXPOSE 8000

# Shell form so ${PORT} is expanded (defaults to 8000 for docker compose)
CMD gunicorn app:app --bind 0.0.0.0:${PORT:-8000} --workers 1 --timeout 180