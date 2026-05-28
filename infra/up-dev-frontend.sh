#!/usr/bin/env sh
# Run DEVELOPMENT frontend (Next.js) with the correct env file.
# Compose: docker-compose.dev.frontend.yml (project: slms-dev-frontend).
# Production: ./infra/up-prod-frontend.sh (docker-compose.prod.frontend.yml).
#
# Usage (from repo root or infra/):
#   ./infra/up-dev-frontend.sh up -d --build web
#   ./infra/up-dev-frontend.sh up -d web
#   ./infra/up-dev-frontend.sh down
#
# Routine deploy: use up -d --build web (Docker reuses cached layers when possible).
# Use build --no-cache only when troubleshooting stale cache or dependency issues.
# If the server is low on space, run ./infra/clean-dev-cache.sh first.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.fe.dev"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.dev.frontend.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: env file not found: $ENV_FILE"
  echo "Create infra/.env.fe.dev with API_URL, API_BACKEND_URL (see docker-compose.dev.frontend.yml)."
  exit 1
fi

cd "$PROJECT_ROOT"
exec docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
