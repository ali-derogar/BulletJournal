#!/bin/bash
# Script to run Alembic migrations manually

echo "🔧 Running database migrations..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Run Alembic upgrade
python -m alembic upgrade head

echo "✅ Migrations completed successfully"
