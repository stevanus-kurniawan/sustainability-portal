# Build from monorepo root: docker build -f apps/api/Dockerfile .
# Alpine + Prisma OpenSSL 3 binary (binaryTargets in schema.prisma) — no Debian/apt-get.
FROM node:20-alpine AS base
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

# Production runner
FROM node:20-alpine AS runner
RUN apk add --no-cache wget
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY apps/api/docker-entrypoint.sh /app/apps/api/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/apps/api/docker-entrypoint.sh && chmod +x /app/apps/api/docker-entrypoint.sh
WORKDIR /app/apps/api
EXPOSE 3001
ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
