# Step-by-step: Deploy new changes (with migrations) to dev

Use this when you have **pulled the latest `dev`** branch and need to deploy to your dev environment (two-server: backend 172.28.92.57, frontend 172.28.92.56, or your actual dev hosts).

**New migrations in this release (applied automatically when API starts):**

- `20260223000000_add_password_reset_tokens` – table for forgot-password reset tokens  
- `20260223025654_migration_forgot_password` – forgot-password support  
- `20260224024137_add_admin_user_management_and_audit_fields` – admin user management and audit fields  

The API **entrypoint runs `prisma migrate deploy`** on every container start, so migrations run automatically after you rebuild and restart the API.

---

## 1. Backend server (API + Postgres + Redis + MinIO)

### 1.1 Pull latest code

```bash
cd /path/to/sustainability-portal
git fetch origin
git checkout dev
git pull origin dev
```

### 1.2 Rebuild and start the backend stack

Rebuilding the API image ensures the new migration files and code are inside the container.

```bash
docker compose -f infra/docker-compose.dev.backend.yml build api --no-cache
docker compose -f infra/docker-compose.dev.backend.yml up -d
```

- **First time or no existing DB:** Postgres/Redis/MinIO start; then the API starts and runs `prisma migrate deploy` (all migrations, including the new ones), then the app listens.
- **Existing DB:** Same; Prisma will only apply migrations that are not yet in `_prisma_migrations`.

### 1.3 Check that migrations ran

**Option A – API logs (quick):**

```bash
docker compose -f infra/docker-compose.dev.backend.yml logs api
```

Look for lines like:

- `Applying migration \`20260223000000_add_password_reset_tokens\``  
- `Applying migration \`20260223025654_migration_forgot_password\``  
- `Applying migration \`20260224024137_add_admin_user_management_and_audit_fields\``  

(Only pending ones appear.) Then the app should listen (e.g. “Nest application successfully started” or “listening on port 3001”).

**Option B – Migrate status:**

```bash
docker compose -f infra/docker-compose.dev.backend.yml exec api npx prisma migrate status
```

Expected: **“Database schema is up to date!”** and no pending migrations.

### 1.4 (Optional) Run seed

If you need to reset or refresh seed data (e.g. admin user, policies):

```bash
docker compose -f infra/docker-compose.dev.backend.yml exec api npx prisma db seed
```

Run once after migrations. If seed is already up to date, this is safe to run again.

### 1.5 Health check

```bash
curl -s http://localhost:3001/api/v1/health
# Or from your PC (use backend public IP if different):
# curl -s http://<backend-public-ip>:3001/api/v1/health
```

You should get a 200 JSON response.

---

## 2. Frontend server (Next.js web)

### 2.1 Pull latest code

```bash
cd /path/to/sustainability-portal
git fetch origin
git checkout dev
git pull origin dev
```

### 2.2 Rebuild and start the frontend

```bash
docker compose -f infra/docker-compose.dev.frontend.yml up -d --build
```

`--build` forces a new image with the latest web code (e.g. login, license page, forgot-password, admin users).

### 2.3 Check the web container

```bash
docker compose -f infra/docker-compose.dev.frontend.yml ps
docker compose -f infra/docker-compose.dev.frontend.yml logs web --tail 30
```

Web should be listening on port 3000.

---

## 3. Quick checklist

| Step | Where | Command / check |
|------|--------|------------------|
| 1 | Backend | `git pull origin dev` |
| 2 | Backend | `docker compose -f infra/docker-compose.dev.backend.yml build api --no-cache` |
| 3 | Backend | `docker compose -f infra/docker-compose.dev.backend.yml up -d` |
| 4 | Backend | `docker compose -f infra/docker-compose.dev.backend.yml logs api` → confirm migrations + app started |
| 5 | Backend | (optional) `docker compose -f infra/docker-compose.dev.backend.yml exec api npx prisma db seed` |
| 6 | Backend | `curl -s http://localhost:3001/api/v1/health` → 200 OK |
| 7 | Frontend | `git pull origin dev` |
| 8 | Frontend | `docker compose -f infra/docker-compose.dev.frontend.yml up -d --build` |
| 9 | Browser | Open `http://<frontend-public-ip>:3000` and test login, forgot-password, license page |

---

## 4. If something goes wrong

**Migrations fail (API exits or “migrate deploy” error):**

- Check logs: `docker compose -f infra/docker-compose.dev.backend.yml logs api`
- Check status: `docker compose -f infra/docker-compose.dev.backend.yml exec api npx prisma migrate status`
- Ensure `infra/.env` has correct `DB_USER`, `DB_PASSWORD`, `DB_NAME` and Postgres is healthy:  
  `docker compose -f infra/docker-compose.dev.backend.yml ps`

**API healthy but app features broken:**

- Confirm `CORS_ORIGIN` on backend matches the URL you use to open the app (e.g. `http://<frontend-public-ip>:3000`).
- Confirm frontend `API_URL` in `infra/.env` is the URL the **browser** uses to call the API (e.g. `http://<backend-public-ip>:3001/api/v1`).

**Frontend shows old UI:**

- Rebuild: `docker compose -f infra/docker-compose.dev.frontend.yml up -d --build`
- Clear browser cache or use an incognito window.

---

For more detail (env vars, security groups, troubleshooting), see [DEPLOY-DEV.md](./DEPLOY-DEV.md).
