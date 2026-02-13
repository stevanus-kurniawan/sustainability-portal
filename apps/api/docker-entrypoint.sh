#!/bin/sh
set -e
cd /app/apps/api
# On Debian (node:20-slim) Prisma detects OpenSSL 3 and uses debian-openssl-3.0.x engine.
# On Alpine, force the musl OpenSSL 3 engine path to avoid "failed to detect" / libssl.so.1.1.
PRISMA_ENGINE_PATH=$(find /app -path '*node_modules*' -name 'libquery_engine-linux-musl-openssl-3.0.x.so.node' 2>/dev/null | head -1)
if [ -n "$PRISMA_ENGINE_PATH" ]; then
  export PRISMA_QUERY_ENGINE_LIBRARY="$PRISMA_ENGINE_PATH"
fi
npx prisma migrate deploy
exec node dist/main.js
