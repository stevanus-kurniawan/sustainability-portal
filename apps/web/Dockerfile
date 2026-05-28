# Build from monorepo root: docker build -f apps/web/Dockerfile .
# Build args: NEXT_PUBLIC_API_URL, API_BACKEND_URL, BUILD_LOW_MEMORY, NODE_OPTIONS
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Dependencies — only web + shared (avoids invalidating cache on api/cms changes)
FROM base AS deps
ARG NODE_OPTIONS=--max-old-space-size=1536
ENV NODE_OPTIONS=${NODE_OPTIONS}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    sh -c 'export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"; pnpm install --frozen-lockfile'
RUN sh -c 'export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"; pnpm --filter @slms/shared build'

# Build web (shared already built in deps)
# API_BACKEND_URL: used by next.config rewrites to proxy /api/v1 to backend (same-origin admin cookie).
FROM base AS builder
ARG NODE_OPTIONS=--max-old-space-size=1536
ENV NODE_OPTIONS=${NODE_OPTIONS}
ARG API_BACKEND_URL
ENV API_BACKEND_URL=$API_BACKEND_URL
ARG BUILD_LOW_MEMORY=
ENV BUILD_LOW_MEMORY=${BUILD_LOW_MEMORY}
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/tsconfig.base.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/web ./apps/web
RUN sh -c 'export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"; pnpm --filter @slms/web build'

# Production runner — Next.js standalone (no full node_modules / pnpm in final image)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
