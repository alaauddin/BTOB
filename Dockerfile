# ============================================================
# BTOB Multi-Tenant SaaS — Production Dockerfile
# ============================================================
# Multi-stage build: slim Python image + gunicorn WSGI server
# ============================================================

FROM python:3.12-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System dependencies for psycopg2 and Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# --------------- Build Stage ---------------
FROM base AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --------------- Runtime Stage ---------------
FROM base AS runtime

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Create non-root user
RUN groupadd -r app && useradd -r -g app -d /app -s /sbin/nologin app

WORKDIR /app

# Copy project files
COPY --chown=app:app . .

# Collect static files (uses whitenoise)
RUN python manage.py collectstatic --noinput 2>/dev/null || true

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Switch to non-root user
USER app

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "Project.wsgi:application", \
    "--bind", "0.0.0.0:8000", \
    "--workers", "3", \
    "--timeout", "120", \
    "--worker-tmp-dir", "/dev/shm", \
    "--access-logfile", "-", \
    "--error-logfile", "-"]
