#!/bin/bash
set -e

echo "🔧 Running database migrations..."

# Run Alembic migrations
python -m alembic upgrade head

echo "✅ Migrations completed successfully"

# Execute the main command (uvicorn)
exec "$@"
