#!/bin/bash
# Restart backend container to apply migrations

echo "Restarting backend container..."
sudo docker compose restart backend

echo ""
echo "Checking backend logs..."
sudo docker compose logs backend --tail=20

echo ""
echo "Backend restarted successfully!"
echo "Migrations will run automatically on startup."
