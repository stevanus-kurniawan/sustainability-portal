# Build from monorepo root: docker build -f apps/api/Dockerfile .
# All stages use Debian (node:20-slim) so native modules (bcrypt, Prisma) are built for glibc and run correctly.
FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate
WORKDIR /app

# Dependencies (Debian so bcrypt native addon is built for glibc, not musl)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm install --frozen-lockfile

# Build shared then API (prisma generate must run before API build so @prisma/client has enums like UserStatus)
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/api ./apps/api
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
RUN pnpm --filter @slms/shared build
WORKDIR /app/apps/api
RUN npx prisma generate
WORKDIR /app
RUN pnpm --filter @slms/api build

# Production runner (same Debian base = no musl/glibc mismatch)
FROM node:20-slim AS runner
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
# Set ownership on copy so we avoid `chown -R` over node_modules (large tree = heavy I/O and can fail when disk is tight).
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/apps/api ./apps/api
COPY --chown=node:node --chmod=0755 apps/api/docker-entrypoint.sh /app/apps/api/docker-entrypoint.sh
USER node
RUN sed -i 's/\r$//' /app/apps/api/docker-entrypoint.sh
# Generate Prisma client in final image so debian-openssl-3.0.x engine is present for this runtime
WORKDIR /app/apps/api
RUN npx prisma generate
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost:3001/api/v1/health/ready || exit 1
ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
