#!/usr/bin/env sh
# Run PRODUCTION frontend with the correct env file loaded.
# Compose: docker-compose.prod.frontend.yml (project: slms-prod-frontend).
# Development: ./infra/up-dev-frontend.sh (docker-compose.dev.frontend.yml).
#
# Usage (from repo root):
#   ./infra/up-prod-frontend.sh up -d --build
#   ./infra/up-prod-frontend.sh up -d --build web
# The script resolves infra/env.prod.frontend relative to this script so Compose always loads it.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/env.prod.frontend"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.frontend.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: env file not found: $ENV_FILE"
  echo "Copy env.example.frontend to env.prod.frontend and set your variables."
  exit 1
fi

cd "$PROJECT_ROOT"
exec docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
