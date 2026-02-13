# Deploy SLMS to Dev (Two-Server: Frontend + Backend)

**Target:**
- **172.28.92.56** = Frontend only (Next.js web)
- **172.28.92.57** = Backend only (API + Postgres + Redis)

**Current situation:** Docker is up on backend with the old single-server compose (web + api + DB). Data seeded, npm installed. You use PuTTY.

---

## Phase 1: Backend server (172.28.92.57)

### 1.1 Connect and go to project

```bash
ssh your-user@172.28.92.57
cd /root/sustainability-portal
# or: cd /path/where/repo/is
```

### 1.2 Pull latest code (get backend-only compose)

```bash
git fetch origin
git checkout feature/exclude-strapi
git pull origin feature/exclude-strapi
```

### 1.3 Check backend `.env`

```bash
cd infra
cat .env | grep -E '^DB_|^REDIS_|^JWT_SECRET|^CORS_ORIGIN'
```

Ensure at least:

- `DB_PASSWORD` = set (no blank)
- `REDIS_PASSWORD` = set (no blank)
- `JWT_SECRET` = set (no blank)
- `CORS_ORIGIN` = frontend origin, e.g. `http://172.28.92.56:3000` (no trailing slash)

Edit if needed:

```bash
nano .env
# Set: CORS_ORIGIN=http://172.28.92.56:3000
# Save: Ctrl+O, Enter, Ctrl+X
cd ..
```

### 1.4 Stop current stack (keep volumes so DB data stays)

From **repo root**:

```bash
cd /root/sustainability-portal
docker compose -f infra/docker-compose.prod.yml down
```

This stops web, api, postgres, redis. **Volumes (postgres_data, redis_data) are kept** so seeded data remains.

### 1.5 Start backend-only stack

```bash
docker compose -f infra/docker-compose.prod.backend.yml up -d --build
```

`--build` rebuilds the API image. Postgres and Redis use existing volumes.

### 1.6 Wait for API to be healthy

```bash
sleep 15
docker compose -f infra/docker-compose.prod.backend.yml ps
```

All services should be “Up”. Then:

```bash
curl -s http://localhost:4000/api/v1/health
```

Expect JSON with status ok. If not, check logs:

```bash
docker compose -f infra/docker-compose.prod.backend.yml logs api --tail 80
```

### 1.7 Migrations and seed (order: migrate first, then seed)

**Order:** Always run **migration first**, then **seed**. Migrations create/update tables; seed inserts data.

Migrations already run on API startup via `docker-entrypoint.sh`. To run them again or run seed, do it **inside the API container** (so `DATABASE_URL` is set):

```bash
# Migration (apply pending migrations)
docker compose -f infra/docker-compose.prod.backend.yml exec api npx prisma migrate deploy

# Seed (after migration)
docker compose -f infra/docker-compose.prod.backend.yml exec api npx prisma db seed
```

If you use the full prod compose file:

```bash
docker compose -f infra/docker-compose.prod.yml exec api npx prisma migrate deploy
docker compose -f infra/docker-compose.prod.yml exec api npx prisma db seed
```

**Do not** run `pnpm db:migrate` on the host unless you have `DATABASE_URL` in `apps/api/.env` (and Postgres reachable from the host). Prefer the `exec api` method above.

---

## Phase 2: Frontend server (172.28.92.56)

### 2.1 Connect and prepare repo

```bash
ssh your-user@172.28.92.56
cd /root
# If repo not cloned yet:
# git clone https://github.com/stevanus-kurniawan/sustainability-portal.git
# cd sustainability-portal
# git checkout feature/exclude-strapi

cd sustainability-portal
git fetch origin
git checkout feature/exclude-strapi
git pull origin feature/exclude-strapi
```

### 2.2 Create frontend `.env`

The frontend needs `API_URL` **at build time** (Next.js bakes it in).

```bash
cd infra
cp env.example .env
nano .env
```

Set at least:

```env
API_URL=http://172.28.92.57:4000/api/v1
CMS_URL=
```

Save (Ctrl+O, Enter, Ctrl+X), then:

```bash
cd ..
```

### 2.3 Build and run frontend only

From **repo root**:

```bash
cd /root/sustainability-portal
docker compose -f infra/docker-compose.prod.frontend.yml build --no-cache web
docker compose -f infra/docker-compose.prod.frontend.yml up -d
```

`--no-cache` ensures the image is built with the correct `API_URL`.

### 2.4 Check web is up

```bash
docker compose -f infra/docker-compose.prod.frontend.yml ps
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expect `200`. In browser: `http://172.28.92.56:3000`.

---

## Phase 3: End-to-end check

### 3.1 From your PC (browser)

- Open: `http://172.28.92.56:3000`
- Log in or hit any page that calls the API.
- If you see CORS errors: on **backend** (92.57) ensure `CORS_ORIGIN=http://172.28.92.56:3000` in `infra/.env`, then restart API:

```bash
docker compose -f infra/docker-compose.prod.backend.yml restart api
```

### 3.2 From backend server (API health)

```bash
ssh your-user@172.28.92.57
curl -s http://localhost:4000/api/v1/health
```

### 3.3 From frontend server (reach API from host)

```bash
ssh your-user@172.28.92.56
curl -s http://172.28.92.57:4000/api/v1/health
```

If this fails, fix firewall/network between 92.56 and 92.57 (port 4000).

---

## Quick reference

| Server        | Compose file                              | Services              |
|---------------|-------------------------------------------|------------------------|
| 172.28.92.57 | `infra/docker-compose.prod.backend.yml`   | postgres, redis, api   |
| 172.28.92.56 | `infra/docker-compose.prod.frontend.yml` | web                    |

**Backend .env (92.57):** `DB_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`, `CORS_ORIGIN=http://172.28.92.56:3000`  
**Frontend .env (92.56):** `API_URL=http://172.28.92.57:4000/api/v1`

**Useful commands:**

```bash
# Backend: logs
docker compose -f infra/docker-compose.prod.backend.yml logs -f api

# Backend: restart API
docker compose -f infra/docker-compose.prod.backend.yml restart api

# Frontend: rebuild after .env change (API_URL)
docker compose -f infra/docker-compose.prod.frontend.yml build --no-cache web
docker compose -f infra/docker-compose.prod.frontend.yml up -d
```
