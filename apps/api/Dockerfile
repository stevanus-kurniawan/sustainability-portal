# Build from monorepo root: docker build -f apps/api/Dockerfile .
# Builder: Alpine. Runner: Debian slim so Prisma's OpenSSL detection works (no musl/libssl.so.1.1 issues).
FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm install --frozen-lockfile

# Build shared then API
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/api ./apps/api
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
RUN pnpm --filter @slms/shared build
RUN pnpm --filter @slms/api build
WORKDIR /app/apps/api
RUN npx prisma generate

# Production runner: Debian slim — Prisma detects OpenSSL 3 reliably (no "failed to detect" / libssl.so.1.1)
FROM node:20-slim AS runner
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY apps/api/docker-entrypoint.sh /app/apps/api/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/apps/api/docker-entrypoint.sh && chmod +x /app/apps/api/docker-entrypoint.sh
# Generate Prisma client in final image so debian-openssl-3.0.x engine is present for this runtime
WORKDIR /app/apps/api
RUN npx prisma generate
EXPOSE 3001
ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
