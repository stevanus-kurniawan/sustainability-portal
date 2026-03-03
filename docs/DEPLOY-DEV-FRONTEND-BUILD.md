# Dev frontend build: why the server can hang and what to do

When you run on the **dev frontend server**:

```bash
docker compose --env-file infra/.env.fe.dev -f infra/docker-compose.dev.frontend.yml up -d --build web
```

the server may **hang** (become unresponsive) during the build. This has happened when the dev server has limited RAM.

---

## Optimizations for 8GB servers (already applied)

The **docker-compose.dev.frontend.yml** and **apps/web/Dockerfile** are tuned for low-memory builds:

- **NODE_OPTIONS=--max-old-space-size=1536** — Caps Node.js heap at 1.5GB during build so the process doesn’t grab 2–2.5GB and hang the server. Override in `.env.fe.dev` (e.g. `NODE_OPTIONS=--max-old-space-size=1024`) for stricter cap.
- **BUILD_LOW_MEMORY=1** — Disables webpack cache during build to reduce peak RAM.
- **Backend** (`docker-compose.dev.backend.yml`): Postgres and API limits reduced to 768M each so more memory is free for the system and for frontend builds.

If the build still OOMs or the server is still tight, use Option 1 (build elsewhere) or Option 2 (add swap) below.

---

## Why it happens

The **build** of the web image does:

1. `pnpm install` for the whole monorepo
2. `pnpm --filter @slms/shared build`
3. `pnpm --filter @slms/web build` → **Next.js production build** (TypeScript, bundling, minification)

The Next.js step alone often needs **about 1.5–2.5 GB RAM**. That is **build-time** usage; the `memory: 512M` limit in the compose file applies only to the **running** container, not to the build.

So:

- If the dev server has e.g. **2 GB total RAM**, the build can use almost all of it.
- The system starts **swapping** heavily or the **OOM killer** runs, and the machine becomes unresponsive (SSH freezes, “server hang”).

So the hang is from **memory exhaustion during the image build**, not from the running app.

---

## What you can do

### Option 1: Build the image elsewhere, then run on the dev server (recommended)

Build on a machine with enough RAM (e.g. your laptop or CI), then bring the image to the dev server.

**On a machine with enough RAM (e.g. your PC, same repo and branch):**

```bash
cd /path/to/sustainability-portal
# Use the same env file or pass build-args so API_URL etc. are correct
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://YOUR_FE_DEV_IP:3000/api/v1 \
  --build-arg API_BACKEND_URL=http://YOUR_BE_DEV_IP:3001 \
  -t slms-web-dev:latest .
```

Save the image to a file:

```bash
docker save slms-web-dev:latest -o slms-web-dev.tar
```

Copy `slms-web-dev.tar` to the dev frontend server (e.g. with scp). On the **dev server**:

```bash
docker load -i slms-web-dev.tar
```

Then on the dev server, **run without `--build`** so Compose uses the loaded image:

```bash
cd /path/to/sustainability-portal
docker compose --env-file infra/.env.fe.dev -f infra/docker-compose.dev.frontend.yml up -d web
```

(Compose will use the image named from the Dockerfile; you may need to tag the loaded image so the compose project can use it, e.g. name it like the project’s web service image, or use `image: slms-web-dev:latest` in the compose and then `docker tag slms-web-dev:latest <project>_web` as needed. Easiest is to build with the same project name: on your PC run the same compose command with `build` once, then `docker save` the built image, then on the server `docker load` and run `up -d` without `--build`.)

**Simpler variant:** On your PC (with enough RAM), from the repo root:

```bash
docker compose --env-file infra/.env.fe.dev -f infra/docker-compose.dev.frontend.yml build web
docker save sustainability-portal-web:latest -o slms-web-dev.tar
# scp slms-web-dev.tar user@dev-fe-server:/tmp/
```

On the dev server:

```bash
docker load -i /tmp/slms-web-dev.tar
cd /path/to/sustainability-portal
docker compose --env-file infra/.env.fe.dev -f infra/docker-compose.dev.frontend.yml up -d web
```

(Image name might be `sustainability-portal-web` or `<dirname>_web` depending on project name; adjust the `docker save` name if needed after `docker images`.)

---

### Option 2: Add swap on the dev server, then build there

So the build can use swap instead of exhausting RAM and hanging:

```bash
# Check current swap
free -h

# Add 2GB swap file (run once)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Then run the build again
cd /path/to/sustainability-portal
docker compose --env-file infra/.env.fe.dev -f infra/docker-compose.dev.frontend.yml up -d --build web
```

Build will be slower but the server is less likely to hang.

---

### Option 3: Stricter Node memory cap (build fails instead of hanging)

The compose file already passes **NODE_OPTIONS=--max-old-space-size=1536** by default. To cap lower so the build **fails** with OOM instead of freezing the server (e.g. on very tight RAM), set in `infra/.env.fe.dev`:

```bash
NODE_OPTIONS=--max-old-space-size=1024
```

Then run compose as usual. If the build OOMs, either add swap / build elsewhere, or increase (e.g. 1536).

---

## Summary

| Cause | Build uses a lot of RAM (1.5–2.5GB); small dev server runs out → hang. |
| Fix   | **Default:** Compose now caps build with NODE_OPTIONS and BUILD_LOW_MEMORY. If still tight: build the image elsewhere and load/run on the dev server, or add swap, or lower NODE_OPTIONS so the build fails instead of hanging. |

The `memory: 512M` in `docker-compose.dev.frontend.yml` only limits the **running** container; it does not limit the **build**. The hang is from the build step.
