#!/bin/sh
set -e
cd /app/apps/api
# Point Prisma at the engine binary generated in this app (pnpm resolves @prisma/client from root)
PRISMA_ENGINE_PATH="/app/apps/api/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node"
if [ -f "$PRISMA_ENGINE_PATH" ]; then
  export PRISMA_QUERY_ENGINE_LIBRARY="$PRISMA_ENGINE_PATH"
fi
npx prisma migrate deploy --skip-generate 2>/dev/null || true
exec node dist/main.js
