FROM cgr.dev/chainguard/python:3.13-dev

USER root

# Install Node.js (required for sharp image compression at runtime)
RUN apk add --no-cache nodejs npm

WORKDIR /app

COPY backend/requirements.txt backend/package.json ./
RUN pip install --no-cache-dir -r requirements.txt && \
    npm install --omit=dev

COPY backend/ .

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "120", "app:app"]
