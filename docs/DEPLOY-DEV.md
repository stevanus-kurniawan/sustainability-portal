# Deploy SLMS to Dev (Alibaba Cloud, Ubuntu)

Two-server layout:

- **172.28.92.56** – Frontend (Next.js)
- **172.28.92.57** – Backend (API), PostgreSQL, Redis

Docker and images are already set up. This guide covers env, migrations, seeding, and optional items you might have missed.

---

## 1. Backend server (172.28.92.57)

### 1.1 Repository and directory

Ensure the project is on the server (e.g. clone or copy `infra/` and app code). Compose is run from repo root with `-f infra/docker-compose.prod.backend.yml`.

```bash
cd /path/to/sustainability-portal
```

### 1.2 Backend `.env` (infra)

Create or edit `infra/.env` on the backend server. Required variables:

```bash
# Database (required)
DB_USER=slms
DB_PASSWORD=<strong-password>
DB_NAME=slms

# Redis (required)
REDIS_PASSWORD=<strong-password>

# JWT (required) – e.g. openssl rand -base64 64
JWT_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<long-random-secret>
JWT_ADMIN_SECRET=<long-random-secret>

# CORS: allow the frontend origin (browser requests from FE to this API)
# Use the URL users will use to open the app (IP or domain)
CORS_ORIGIN=http://172.28.92.56:3000

# Optional: MinIO (if you run MinIO on this host or elsewhere)
# MINIO_ACCESS_KEY=...
# MINIO_SECRET_KEY=...
# MINIO_ENDPOINT=minio
# MINIO_BUCKET=slms-docs
# If using Alibaba OSS instead, configure STORAGE_* in the API service or a separate env file.
```

Generate secrets:

```bash
openssl rand -base64 64   # use for JWT_SECRET, JWT_REFRESH_SECRET, JWT_ADMIN_SECRET
```

### 1.3 Start backend stack

From repo root:

```bash
docker compose -f infra/docker-compose.prod.backend.yml up -d
```

This starts Postgres, Redis, and the API. The API **entrypoint runs `prisma migrate deploy`** on every start, so migrations are applied automatically. If migrate fails, the container will exit (check logs).

### 1.4 Verify migrations

Check API logs to confirm migrations ran:

```bash
docker compose -f infra/docker-compose.prod.backend.yml logs api
```

You should see Prisma migrate output and then the app listening (e.g. port 4000).

### 1.5 Run database seed (one-time)

Seeding is **not** run in the entrypoint. Run it once after first deploy:

```bash
docker compose -f infra/docker-compose.prod.backend.yml exec api pnpm prisma db seed
```

Default accounts created by seed:

- **Admin (backend)**: `admin@energi-up.com` / `Admin123!` (or set `ADMIN_SEED_PASSWORD` in api env before seeding)
- **Users**: `admin@slms.local`, `auditor@slms.local` (roles assigned; set passwords via app/invite if needed)

Optional, if you use policies/SOP forms:

```bash
docker compose -f infra/docker-compose.prod.backend.yml exec api pnpm run seed:policies
docker compose -f infra/docker-compose.prod.backend.yml exec api pnpm run seed:sop-forms
```

### 1.6 Backend health check

From the same server or from the FE server:

```bash
curl -s http://172.28.92.57:4000/api/v1/health
# Returns { "status": "ok", "database": "connected", ... }
```

---

## 2. Frontend server (172.28.92.56)

### 2.1 Frontend `.env` (infra)

Create `infra/.env` in the repo on the **frontend** server. The important variable is **`API_URL`**: it is passed as **build-time** `NEXT_PUBLIC_API_URL` for the Next.js app. If you change it later, you must **rebuild** the image.

```bash
# API base URL (no trailing slash) – used by the browser to call the backend
# Use backend IP and port, or later your API domain
API_URL=http://172.28.92.57:4000/api/v1

# Optional: CMS URL if you have a separate CMS
# CMS_URL=
```

Do **not** use `localhost` here; the browser runs on the user’s machine and must reach the backend at 172.28.92.57 (or the public API URL).

### 2.2 Build and run frontend

From repo root on the FE server:

```bash
docker compose -f infra/docker-compose.prod.frontend.yml up -d --build
```

`--build` ensures the image is built with the current `API_URL` from `infra/.env`. Without rebuilding, a new `API_URL` in `.env` will not change the already-baked `NEXT_PUBLIC_API_URL` in the app.

### 2.3 Verify frontend

Open in a browser:

- `http://172.28.92.56:3000`

Login and API calls should go to `http://172.28.92.57:4000/api/v1` (or whatever you set in `API_URL`).

---

## 3. Checklist summary

| Step | Server | Action |
|------|--------|--------|
| 1 | Backend (57) | Create `infra/.env` with DB, Redis, JWT, `CORS_ORIGIN` |
| 2 | Backend (57) | `docker compose -f infra/docker-compose.prod.backend.yml up -d` |
| 3 | Backend (57) | Check `logs api` for successful migrate |
| 4 | Backend (57) | Run `docker compose ... exec api pnpm prisma db seed` once |
| 5 | Frontend (56) | Create `infra/.env` with `API_URL=http://172.28.92.57:4000/api/v1` |
| 6 | Frontend (56) | `docker compose -f infra/docker-compose.prod.frontend.yml up -d --build` |
| 7 | Both | Verify app and API from browser and curl |

---

## 4. Points you might have missed

### 4.1 Firewall / security groups

- **Backend (57)**: Allow **port 4000** from the frontend server (172.28.92.56) and, if users hit the API directly, from your office/VPN or the internet as needed.
- **Frontend (56)**: Allow **port 3000** (or 80/443 if you put a reverse proxy in front).

Example (Ubuntu ufw):

```bash
# On backend (57): allow 4000 from FE
sudo ufw allow from 172.28.92.56 to any port 4000
sudo ufw allow 22
sudo ufw enable

# On frontend (56): allow 3000
sudo ufw allow 3000
sudo ufw allow 22
sudo ufw enable
```

### 4.2 CORS

`CORS_ORIGIN` on the backend must match the **origin** the browser uses for the frontend:

- If users open `http://172.28.92.56:3000`, use `CORS_ORIGIN=http://172.28.92.56:3000`.
- If you later use a domain (e.g. `https://slms.example.com`), set `CORS_ORIGIN=https://slms.example.com` and restart the API.

### 4.3 Migrations on backend

Migrations run in the API container entrypoint (`prisma migrate deploy`). If migrate fails, the container exits so you see the error in `docker compose logs api`. No need to run migrate manually unless you are debugging.

**Do I need to create the database?** No. The database is created automatically: the Postgres container uses `POSTGRES_DB=slms` (or your `infra/.env` value), so the `slms` database exists as soon as Postgres is healthy. P3009 means a **migration failed** in the past and is recorded as failed in `_prisma_migrations`; the fix is to resolve that failure, not to create the DB.

**Resolving failed migrations (P3009)**  
If you see:

```text
Error: P3009
migrate found failed migrations in the target database...
The `20250130000000_add_user_password_and_admin` migration ... failed
```

then a previous migration run failed and Prisma will not apply any new migrations until you resolve it.

1. From your **host** (or a one-off container with network access to Postgres), set `DATABASE_URL` to the **same** database the API uses and run:

   **Local dev (Docker Compose from infra, Postgres on host port 5544):**

   ```powershell
   cd apps\api
   $env:DATABASE_URL = "postgresql://slms:slms@localhost:5544/slms?schema=public"
   npx prisma migrate resolve --rolled-back "20250130000000_add_user_password_and_admin"
   ```

   **Production / backend server (Postgres not exposed; run inside API container):**

   ```bash
   docker compose -f infra/docker-compose.prod.backend.yml run --rm api npx prisma migrate resolve --rolled-back "20250130000000_add_user_password_and_admin"
   ```

2. Restart the API so it runs `prisma migrate deploy` again. The failed migration will be re-applied (and should succeed if the schema is now correct, e.g. after adding an init migration that creates the `users` table).

**Migration failed: "relation documents does not exist" (P3018)**  
If a migration fails with `relation "documents" does not exist` (e.g. `20250130120000_add_external_link_and_attachment`), the migration history was missing a step that creates the content tables. A fix migration `20250130110000_create_content_tables` has been added to create `categories`, `documents`, `certifications`, `licenses`, `grievance_cases`, and related tables. After pulling the latest code:

1. Mark the failed migration as rolled back (use the migration name from the error):
   ```bash
   docker compose -f infra/docker-compose.prod.backend.yml run --rm api npx prisma migrate resolve --rolled-back "20250130120000_add_external_link_and_attachment"
   ```
2. Restart the API so `migrate deploy` runs again; it will apply `20250130110000_create_content_tables` then the previously failed migration.

**Alternative: full reset (dev only, all data lost)**  
If you can discard all data and want a clean state:

- **Local:** Remove the Postgres volume and start again, e.g. `docker compose -f infra/docker-compose.yml down -v`, then `up -d`. Or run `npx prisma migrate reset --force` from `apps/api` with `DATABASE_URL=postgresql://slms:slms@localhost:5544/slms?schema=public`.
- **Production:** Prefer resolving the failed migration (steps above); use reset only in a dedicated dev/staging DB.

**Authentication failed (P1000)**  
If you see `Authentication failed against database server at postgres, the provided database credentials for slms are not valid`:

- **Backend (prod compose):** The API uses `DB_USER`, `DB_PASSWORD`, `DB_NAME` from `infra/.env`. They must match what Postgres was created with. Postgres sets the user/password only on **first** startup (when the data volume is empty). If you later change `DB_PASSWORD` in `.env`, the existing volume still has the **old** password.
  - **Fix 1:** Set `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `infra/.env` to the credentials that were used when the Postgres volume was first created (e.g. if you never had a custom password, try `DB_PASSWORD=slms`).
  - **Fix 2 (dev only, data loss):** Remove the volume and start fresh so Postgres re-initializes with the current `.env`:  
    `docker compose -f infra/docker-compose.prod.backend.yml down -v` then `up -d`.
- If the password contains `@`, `#`, `:`, `/`, or `%`, URL-encode it in `DATABASE_URL` (e.g. `%40` for `@`). Prefer a password without those characters to avoid quoting issues in shell/env.

### 4.4 Seeding is one-time

`prisma db seed` is idempotent (upserts). Run it once per environment. Re-running is safe. Do **not** run it from a cron; run manually after deploy or as part of a release script.

### 4.5 Object storage (MinIO vs OSS)

- **docker-compose.prod.backend.yml** does **not** include MinIO. The API env has `MINIO_*` placeholders.
- **Option A**: Add a MinIO service to the backend compose and set `MINIO_*` (and optionally `STORAGE_*`) in `infra/.env`.
- **Option B**: Use **Alibaba Cloud OSS**. Set in API env (or infra `.env` if you pass it through):  
  `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_ACCESS_KEY_SECRET`, `STORAGE_REGION`, and optionally `STORAGE_BASE_URL`. See `infra/env.example` comments.

### 4.6 Frontend env is build-time

`NEXT_PUBLIC_API_URL` is baked at **build** time. Changing only `infra/.env` and restarting the container does **not** change it. Always run:

```bash
docker compose -f infra/docker-compose.prod.frontend.yml up -d --build
```

when you change `API_URL`.

### 4.7 HTTPS and reverse proxy (later)

For dev over IP, HTTP is often enough. For production you will typically:

- Put **Nginx** (or another reverse proxy) in front of FE and/or API.
- Use **certbot** or Alibaba Cloud SSL for HTTPS.
- Then set `CORS_ORIGIN` and `API_URL` to the public HTTPS URLs and rebuild the frontend.

### 4.8 Database backups

Plan backups for Postgres (e.g. `pg_dump` cron or Alibaba Cloud RDS backup). The compose uses a volume `postgres_data`; ensure the host or your backup solution can access it.

### 4.9 Logs and restarts

- Restart API after changing `infra/.env`:  
  `docker compose -f infra/docker-compose.prod.backend.yml up -d api`
- Restart FE after rebuilding:  
  `docker compose -f infra/docker-compose.prod.frontend.yml up -d web`
- Follow logs:  
  `docker compose -f infra/docker-compose.prod.backend.yml logs -f api`

---

## 5. Quick reference

**Backend (172.28.92.57):**

```bash
cd /path/to/sustainability-portal
# Edit infra/.env (DB_*, REDIS_*, JWT_*, CORS_ORIGIN)
docker compose -f infra/docker-compose.prod.backend.yml up -d
docker compose -f infra/docker-compose.prod.backend.yml logs -f api   # confirm migrate
docker compose -f infra/docker-compose.prod.backend.yml exec api pnpm prisma db seed
```

**Frontend (172.28.92.56):**

```bash
cd /path/to/sustainability-portal
# Edit infra/.env (API_URL=http://172.28.92.57:4000/api/v1)
docker compose -f infra/docker-compose.prod.frontend.yml up -d --build
```

Then open `http://172.28.92.56:3000` and log in with `admin@energi-up.com` / `Admin123!` (or your `ADMIN_SEED_PASSWORD`).
