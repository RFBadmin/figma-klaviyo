FROM python:3.12-slim

# Patch all Debian packages to latest security fixes at build time
RUN apt-get update && apt-get upgrade -y --no-install-recommends && \
    apt-get install -y --no-install-recommends curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app

COPY package.json .
RUN npm install --ignore-engines

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure /data exists for the Railway Volume mount (brands.json persistence)
RUN mkdir -p /data && chown -R appuser:appuser /app /data
USER appuser

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "120", "app:app"]
