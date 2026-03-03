#!/usr/bin/env sh
# Run prod backend stack with the correct env file loaded.
# Usage: from anywhere, run:
#   ./infra/up-prod-backend.sh up -d --build
#   ./infra/up-prod-backend.sh up -d --build api
#   ./infra/up-prod-backend.sh down
# The script resolves infra/env.prod.backend relative to this script so Compose always loads it.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/env.prod.backend"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.backend.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: env file not found: $ENV_FILE"
  echo "Copy env.example.backend to env.prod.backend and set your variables."
  exit 1
fi

cd "$PROJECT_ROOT"
exec docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
