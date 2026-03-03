# Build from monorepo root: docker build -f apps/web/Dockerfile .
# Optional build-arg: NEXT_PUBLIC_API_URL (default http://localhost:3001/api/v1)
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Dependencies (full workspace so lockfile resolves)
FROM base AS deps
# Cap Node memory during install/build to avoid OOM on low-RAM servers (e.g. 8GB).
ARG NODE_OPTIONS=--max-old-space-size=1536
ENV NODE_OPTIONS=${NODE_OPTIONS}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN sh -c 'export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"; pnpm install --frozen-lockfile'
RUN sh -c 'export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"; pnpm --filter @slms/shared build'

# Build web (shared already built in deps)
# API_BACKEND_URL: used by next.config rewrites to proxy /api/v1 to backend (for same-origin admin cookie when FE and API are on different hosts).
FROM base AS builder
ARG NODE_OPTIONS=--max-old-space-size=1536
ENV NODE_OPTIONS=${NODE_OPTIONS}
ARG API_BACKEND_URL
ENV API_BACKEND_URL=$API_BACKEND_URL
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps
# Reduce webpack parallelism in low-memory builds to lower peak RAM (optional, set in build-arg).
ARG BUILD_LOW_MEMORY=
ENV BUILD_LOW_MEMORY=${BUILD_LOW_MEMORY}
RUN sh -c 'export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"; pnpm --filter @slms/web build'

# Production runner
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web ./apps/web
WORKDIR /app/apps/web
EXPOSE 3000
# Use shell so the process is sh; it finds pnpm in PATH (avoids node treating "pnpm" as a script path)
CMD ["sh", "-c", "pnpm start"]
