#!/bin/sh
set -e
cd /app/apps/api
# Force Prisma to use the OpenSSL 3 engine on Alpine (avoids "libssl.so.1.1: No such file or directory")
# Prisma may default to openssl-1.1.x when it fails to detect libssl; Alpine has OpenSSL 3 only.
PRISMA_ENGINE_PATH=$(find /app/node_modules -name 'libquery_engine-linux-musl-openssl-3.0.x.so.node' 2>/dev/null | head -1)
if [ -n "$PRISMA_ENGINE_PATH" ]; then
  export PRISMA_QUERY_ENGINE_LIBRARY="$PRISMA_ENGINE_PATH"
fi
npx prisma migrate deploy --skip-generate 2>/dev/null || true
exec node dist/main.js
