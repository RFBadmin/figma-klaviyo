FROM node:22-alpine

# Upgrade all Alpine packages to patch OS-level CVEs
RUN apk upgrade --no-cache

# Install Python
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

# Install Node dependencies (@squoosh/lib — ignore overly-conservative engine check)
COPY package.json .
RUN npm install --ignore-engines

# Install Python dependencies
COPY requirements.txt .
RUN python3 -m venv /venv && /venv/bin/pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PATH="/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "120", "app:app"]
