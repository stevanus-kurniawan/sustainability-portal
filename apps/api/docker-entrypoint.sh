#!/bin/sh
set -e
cd /app/apps/api
# Only force the musl engine on Alpine (libc.musl). On Debian (node:20-slim) Prisma must use
# debian-openssl-3.0.x; forcing musl here would cause "libc.musl-x86_64.so.1: cannot open shared object file".
if [ -f /etc/alpine-release ]; then
  PRISMA_ENGINE_PATH=$(find /app -path '*node_modules*' -name 'libquery_engine-linux-musl-openssl-3.0.x.so.node' 2>/dev/null | head -1)
  if [ -n "$PRISMA_ENGINE_PATH" ]; then
    export PRISMA_QUERY_ENGINE_LIBRARY="$PRISMA_ENGINE_PATH"
  fi
fi
npx prisma migrate deploy
exec node dist/main.js
