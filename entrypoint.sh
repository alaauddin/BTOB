#!/bin/bash
set -e

echo "🚀 BTOB Platform — Starting up..."

# Run migrations
echo "📦 Applying database migrations..."
python manage.py migrate --noinput

# Collect static files (safe re-run)
echo "🎨 Collecting static files..."
python manage.py collectstatic --noinput 2>/dev/null || true

echo "✅ Ready. Handing off to: $@"
exec "$@"
