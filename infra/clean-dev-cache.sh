#!/usr/bin/env sh
# Free disk and reduce Docker build cache / unused images on dev or prod servers.
# Run periodically (e.g. before/after deploy) or when the server is low on space ("No space left on device").
#
# Usage:
#   ./infra/clean-dev-cache.sh          # Safe: builder prune + dangling images
#   ./infra/clean-dev-cache.sh --aggressive   # Also remove all unused images (frees more, next build slower)

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Docker disk usage (before) ==="
docker system df

echo ""
echo "=== Removing build cache (docker builder prune) ==="
docker builder prune -f

echo ""
echo "=== Removing dangling images ==="
docker image prune -f

if [ "$1" = "--aggressive" ]; then
  echo ""
  echo "=== Aggressive: removing all unused images (next deploy will re-pull/rebuild) ==="
  docker image prune -af
fi

echo ""
echo "=== Docker disk usage (after) ==="
docker system df
echo ""
echo "Done. Run 'docker compose -f infra/docker-compose.dev.*.yml up -d' as needed."
