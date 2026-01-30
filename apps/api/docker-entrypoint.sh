#!/bin/sh
set -e
cd /app/apps/api
npx prisma migrate deploy --skip-generate 2>/dev/null || true
exec node dist/main.js
