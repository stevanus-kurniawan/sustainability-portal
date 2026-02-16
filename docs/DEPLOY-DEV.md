# Deploy SLMS to Dev (Alibaba Cloud, Ubuntu)

Two-server layout:

- **172.28.92.56** – Frontend (Next.js) – *private* IP
- **172.28.92.57** – Backend (API), PostgreSQL, Redis – *private* IP

Docker and images are already set up. This guide covers env, migrations, seeding, and optional items you might have missed.

---

## 0. Quick path: make the app reachable from your browser

If you **cannot access the app** from your PC (frontend or backend), follow this order. You need the **public IPs** of both ECS instances (Alibaba Cloud Console → ECS → each instance → Public IP).

| # | Where | What to do |
|---|--------|------------|
| 1 | **Alibaba Cloud** | Note **backend public IP** (e.g. `47.x.x.x`) and **frontend public IP** (e.g. `39.x.x.x`). |
| 2 | **Backend server** (SSH with private IP 172.28.92.57 or its public IP) | Create `infra/.env` with `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `REDIS_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ADMIN_SECRET`, and **`CORS_ORIGIN=http://<frontend-public-ip>:3000`** (so the browser is allowed to call the API). Then run `docker compose -f infra/docker-compose.prod.backend.yml up -d`. Check `docker compose ... logs api` for success; run `docker compose ... exec api npx prisma db seed` once. |
| 3 | **Alibaba Cloud – Backend security group** | Inbound rule: **port 3001** TCP (or your `API_PORT`), source `0.0.0.0/0` (or your IP). So the browser can call the API. |
| 4 | **Frontend server** (SSH with private IP 172.28.92.56 or its public IP) | Create `infra/.env` with **`API_URL=http://<backend-public-ip>:3001/api/v1`** (use your `API_PORT` if different; the browser must use the backend’s **public** IP). Then run `docker compose -f infra/docker-compose.prod.frontend.yml up -d --build`. |
| 5 | **Alibaba Cloud – Frontend security group** | Inbound rule: **port 3000** TCP, source `0.0.0.0/0` (or your IP). So you can open the app in the browser. |
| 6 | **Your browser** | Open **`http://<frontend-public-ip>:3000`**. Log in with `admin@energi-up.com` / `Admin123!` (or your seed password). |

**Why public IPs?** 172.28.92.56 and 172.28.92.57 are private; your PC cannot reach them. The browser talks to the **frontend** at the frontend’s public IP and to the **API** at the backend’s public IP, so both security groups must allow those ports from the internet (or your IP).

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
# Use the URL users actually use in the browser (frontend public IP or domain)
CORS_ORIGIN=http://<frontend-public-ip>:3000

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

The API listens on **port 3001** by default (configurable via `API_PORT` in `infra/.env`, e.g. `API_PORT=3001`). Use the same port in `API_URL` on the frontend and in the backend security group.

**If the log shows a different port (e.g. 4000):** You have `API_PORT=4000` (or `PORT=4000`) in `infra/.env`. To use 3001, set `API_PORT=3001` in backend `infra/.env` and restart: `docker compose -f infra/docker-compose.prod.backend.yml up -d api`.

From repo root:

```bash
docker compose -f infra/docker-compose.prod.backend.yml up -d
```

This starts Postgres, Redis, and the API. The API **entrypoint runs `prisma migrate deploy`** on every start, so migrations are applied automatically. If migrate fails, the container will exit (check logs).

### 1.4 Verify migrations

**1. API logs** – On a successful start you should see Prisma apply migrations then the app listening:

```bash
docker compose -f infra/docker-compose.prod.backend.yml logs api
```

Look for lines like `Applying migration \`20250129000000_init_schema\`` and no `Error: P3009` / `Error: P3018`. If the API stays running and listens on port 3001, migrate almost certainly succeeded.

**2. Prisma migrate status** – Lists which migrations are applied and whether any are pending:

```bash
docker compose -f infra/docker-compose.prod.backend.yml exec api npx prisma migrate status
```

You want: `Database schema is up to date!` and no pending migrations.

**3. Database table** – Applied migrations are recorded in `_prisma_migrations`:

```bash
docker compose -f infra/docker-compose.prod.backend.yml exec postgres psql -U slms -d slms -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;"
```

Each migration should have a non-null `finished_at`. If you have 12 migrations in `prisma/migrations`, you should see 12 rows with `finished_at` set.

**4. Health check** – If the API responds with DB connected, the schema is in use:

```bash
curl -s http://172.28.92.57:3001/api/v1/health
```

Expect something like `{"status":"ok","database":"connected",...}`.

### 1.5 Run database seed (one-time)

Seeding is **not** run in the entrypoint. Run it once after first deploy:

```bash
docker compose -f infra/docker-compose.prod.backend.yml exec api npx prisma db seed
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
curl -s http://172.28.92.57:3001/api/v1/health
# Returns { "status": "ok", "database": "connected", ... }
```

---

## 2. Frontend server (172.28.92.56)

### 2.1 Frontend `.env` (infra)

Create `infra/.env` in the repo on the **frontend** server. The important variable is **`API_URL`**: it is passed as **build-time** `NEXT_PUBLIC_API_URL` for the Next.js app. If you change it later, you must **rebuild** the image.

```bash
# API base URL (no trailing slash) – used by the browser to call the backend
# Use backend IP and port, or later your API domain
API_URL=http://<backend-public-ip>:3001/api/v1

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

Open in a browser (use the **frontend public IP**, not 172.28.92.56):

- `http://<frontend-public-ip>:3000`

Login and API calls go to the URL you set in `API_URL` (backend public IP).

---

## 3. Checklist summary

| Step | Server | Action |
|------|--------|--------|
| 1 | Backend (57) | Create `infra/.env` with DB, Redis, JWT, `CORS_ORIGIN` |
| 2 | Backend (57) | `docker compose -f infra/docker-compose.prod.backend.yml up -d` |
| 3 | Backend (57) | Check `logs api` for successful migrate |
| 4 | Backend (57) | Run `docker compose ... exec api npx prisma db seed` once |
| 5 | Frontend (56) | Create `infra/.env` with `API_URL=http://<backend-public-ip>:3001/api/v1` |
| 6 | Frontend (56) | `docker compose -f infra/docker-compose.prod.frontend.yml up -d --build` |
| 7 | Both | Verify app and API from browser and curl |

---

## 4. Points you might have missed

### 4.1 Firewall / security groups

- **Backend (57)**: Allow **port 3001** from the frontend server (172.28.92.56) and, if users hit the API directly, from your office/VPN or the internet as needed.
- **Frontend (56)**: Allow **port 3000** (or 80/443 if you put a reverse proxy in front).

**Why am I still blocked from the private network?**  
When you open the app in your **browser** (from your PC or laptop), API requests go **from your machine’s IP** to the backend, not from the frontend server. So:

- A rule like “allow from 172.28.92.56” on the backend only allows the **frontend server** to call the API (e.g. server-side calls). Your browser uses a **different** IP (your PC in the VPC or VPN).
- To allow **your** access: allow port 3001 (backend) and 3000 (frontend) from **your IP** or from the **whole VPC** (e.g. `172.28.0.0/16`), in both **ufw** and **Alibaba Cloud security group**.

Example (Ubuntu ufw) – **allow from the whole VPC** so any machine on the private network can reach the app:

**On the backend server** (SSH to 172.28.92.57 or its public IP):

```bash
# Allow API port from entire VPC (adjust 172.28.0.0/16 to your VPC CIDR if different)
udo ufw allow from 172.28.0.0/16 to any port 3001
sudo ufw allow 22
sudo ufw enables
```

**On the frontend server** (SSH to 172.28.92.56 or its public IP):

```bash
sudo ufw allow from 172.28.0.0/16 to any port 3000
sudo ufw allow 22
sudo ufw enable
```

If you only need the frontend server to call the API (no browser from other hosts), you can keep `allow from 172.28.92.56` for port 3001 on the backend; for **browser** access from your PC you must allow your PC’s IP or the VPC range above. **Alibaba Cloud security group:** add inbound rules for port 3000 and 3001 with source **172.28.0.0/16** (or your VPC CIDR) so private-network clients can connect.

### 4.2 CORS and "Login returns failed to fetch"

`CORS_ORIGIN` on the backend must match the **origin** the browser uses for the frontend (exact scheme, host, port; no trailing slash):

- If users open `http://172.28.92.56:3000`, set **`CORS_ORIGIN=http://172.28.92.56:3000`** in the backend `infra/.env`.
- If you use a domain (e.g. `https://slms.example.com`), set `CORS_ORIGIN=https://slms.example.com` and restart the API.

**If the app loads but login shows "failed to fetch":** The browser is calling the API but the response is blocked (usually CORS or the API URL is unreachable). (1) Set **CORS_ORIGIN** on the **backend** to the exact URL you use to open the app (e.g. `http://172.28.92.56:3000`), then restart the API: `docker compose -f infra/docker-compose.prod.backend.yml up -d api`. (2) Ensure the **frontend** was built with **API_URL** that your browser can reach (e.g. from the same VPC use `http://172.28.92.57:3001/api/v1`; if the API is on 4000, use port 4000). Rebuild the frontend after changing API_URL: `docker compose -f infra/docker-compose.prod.frontend.yml up -d --build`. (3) In the browser dev tools (F12 → Network), check the failing request: if it is blocked by CORS, fix CORS_ORIGIN; if it times out or connection refused, the browser cannot reach the API (wrong API_URL or firewall).

**Root cause when using private IPs:** If you open the app at `http://172.28.92.56:3000`, the browser sends `Origin: http://172.28.92.56:3000`. The backend only allows origins listed in `CORS_ORIGIN` or `CORS_ORIGINS`. The compose default is `http://localhost:3000`, so that origin is **not** allowed and the browser blocks the login response. Fix: set `CORS_ORIGIN=http://172.28.92.56:3000` (or use `CORS_ORIGINS` to allow both private and public frontend URLs), then restart the API.

**Multiple origins (e.g. private + public IP):** Set `CORS_ORIGINS=http://172.28.92.56:3000,http://<frontend-public-ip>:3000` in backend `infra/.env` and ensure the compose file passes `CORS_ORIGINS` into the API container (see `infra/docker-compose.prod.backend.yml`).

### 4.2.1 Login returns 401 "Invalid credentials" or admin not found

If the request reaches the API but you get **401 Unauthorized** or "Invalid credentials":

1. **Seed not run** – The admin user is created only by the database seed. Run once on the backend:
   ```bash
   docker compose -f infra/docker-compose.prod.backend.yml exec api npx prisma db seed
   ```
   Default admin: `admin@energi-up.com` / `Admin123!`.

2. **Wrong password** – The seed uses `ADMIN_SEED_PASSWORD` if set when seeding; otherwise it uses `Admin123!`. If you ran seed with a different `ADMIN_SEED_PASSWORD`, log in with that password. **Note:** Re-running the seed does **not** change the existing admin’s password (upsert only creates; it does not update the password). To reset: delete the admin row and run seed again, or set `ADMIN_SEED_PASSWORD` to the current password and run seed (no change), or update `passwordHash` in the DB.

3. **Verify with curl** – From a host that can reach the API (e.g. backend server or same VPC):
   ```bash
   curl -s -X POST http://172.28.92.57:3001/api/v1/admin-auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@energi-up.com","password":"Admin123!"}'
   ```
   - **200 + JSON** with `admin` and `expiresIn`: login works; if the browser still fails, the issue is CORS or cookies (see 4.2).
   - **401**: admin missing, wrong password, or admin not ACTIVE; run seed or fix password/status.

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

**If `migrate resolve` fails with P3009** (e.g. "migrate found failed migrations... new migrations will not be applied"), Prisma is blocking the resolve command. Fix it by clearing the failed migration row directly in the database, then let the API run `migrate deploy` on restart. Ensure the server has the latest code (including `20250130110000_create_content_tables`), then:

1. Connect to Postgres and remove the failed migration record (replace the migration name if yours is different):
   ```bash
   docker compose -f infra/docker-compose.prod.backend.yml exec postgres psql -U slms -d slms -c "DELETE FROM _prisma_migrations WHERE migration_name = '20250130120000_add_external_link_and_attachment';"
   ```
   If your DB user is different (e.g. from `DB_USER` in `.env`), use that user: `psql -U $DB_USER -d slms -c "..."`.

2. Restart the API so it runs `migrate deploy`:
   ```bash
   docker compose -f infra/docker-compose.prod.backend.yml up -d api
   ```
   Deploy will apply `20250130110000_create_content_tables` (creating the content tables), then `20250130120000_add_external_link_and_attachment`, then any later migrations.

**Alternative: full reset (dev only, all data lost)**  
If you can discard all data and want a clean state:

- **Local:** Remove the Postgres volume and start again, e.g. `docker compose -f infra/docker-compose.yml down -v`, then `up -d`. Or run `npx prisma migrate reset --force` from `apps/api` with `DATABASE_URL=postgresql://slms:slms@localhost:5544/slms?schema=public`.
- **Production:** Prefer resolving the failed migration (steps above); use reset only in a dedicated dev/staging DB.

**Authentication failed (P1000)**  
If you see `Authentication failed against database server at postgres, the provided database credentials for slms are not valid`:

- **Backend (prod compose):** The API uses `DB_USER`, `DB_PASSWORD`, `DB_NAME` from `infra/.env`. They must match what Postgres was created with. Postgres sets the user/password only on **first** startup (when the data volume is empty). If you later change `DB_PASSWORD` in `.env`, the existing volume still has the **old** password.
  - **Fix 1:** Set `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `infra/.env` to the credentials that were used when the Postgres volume was first created (e.g. if you never had a custom password, try `DB_PASSWORD=slms`).
  - **Fix 2:** Reset the database user password inside Postgres (see **Reset DB password** below), then set the same password in `infra/.env` and restart the API.
  - **Fix 3 (dev only, data loss):** Remove the volume and start fresh so Postgres re-initializes with the current `.env`:  
    `docker compose -f infra/docker-compose.prod.backend.yml down -v` then `up -d`.
- If the password contains `@`, `#`, `:`, `/`, or `%`, URL-encode it in `DATABASE_URL` (e.g. `%40` for `@`). Prefer a password without those characters to avoid quoting issues in shell/env.

**Reset DB password**  
To set a new password for the `slms` DB user so it matches `infra/.env`:

1. From the server (e.g. SSH), open a shell in the Postgres container and connect as the superuser `postgres` (local connection inside the container does not require the app password):
   ```bash
   docker compose -f infra/docker-compose.prod.backend.yml exec postgres psql -U postgres -d postgres
   ```
   If `postgres` is not allowed (e.g. image only created `slms`), use the same user as `DB_USER` with the **current** password if you know it, or use the **host** user and `sudo` to exec as root and then run `psql` (see alternative below).

2. In the `psql` prompt, set the new password (replace `YourNewPassword` and `slms` if your `DB_USER` is different):
   ```sql
   ALTER USER slms PASSWORD 'YourNewPassword';
   \q
   ```

3. Update `infra/.env` with the same password:
   ```bash
   DB_PASSWORD=YourNewPassword
   ```

4. Restart the API so it picks up the new credentials:
   ```bash
   docker compose -f infra/docker-compose.prod.backend.yml up -d api
   ```

   **If "role postgres does not exist":** The image was started with `POSTGRES_USER=slms`, so only the `slms` DB role exists. Try connecting as `slms` over the local socket (no `-h`); some setups allow peer or trust for local connections:
   ```bash
   docker compose -f infra/docker-compose.prod.backend.yml exec postgres psql -U slms -d slms -c "ALTER USER slms PASSWORD 'YourNewPassword';"
   ```
   If that prompts for a password you don’t know, or fails, the only way to set a known password is **Fix 3**: remove the Postgres data volume and recreate the DB so it is initialized with the password from `.env` (all data in that DB is lost).

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

### 4.10 Accessing the database from outside (e.g. DBeaver, pgAdmin)

To connect to Postgres from your PC (or another host), the backend compose exposes the Postgres port on the host. You still need the **security group** to allow that port.

1. **Port:** Postgres is mapped to the host with `POSTGRES_PORT` (default **5432**). Set `POSTGRES_PORT=5432` in `infra/.env` on the backend server if you want to change it, then restart:  
   `docker compose -f infra/docker-compose.prod.backend.yml up -d postgres`

2. **Alibaba Cloud security group (backend server 172.28.92.57):**  
   - Add an **inbound** rule: port **5432**, protocol **TCP**.  
   - **Source:** for dev you can use your IP or `0.0.0.0/0`; for production restrict to a specific IP or VPN range.

3. **Connection from your PC:** Use the **public IP** of the backend ECS (not the private 172.28.92.57):
   - **Host:** `<backend-server-public-ip>`
   - **Port:** `5432` (or whatever you set in `POSTGRES_PORT`)
   - **Database:** `slms` (or `DB_NAME` from `.env`)
   - **User:** `slms` (or `DB_USER`)
   - **Password:** value of `DB_PASSWORD` in `infra/.env`

   Example URL: `postgresql://slms:<DB_PASSWORD>@<public-ip>:5432/slms`

4. **If you get timeout:** The security group for the **backend** instance must allow inbound TCP 5432 from your IP (or 0.0.0.0/0). Check that the rule is saved and attached to the correct ECS.

---

## 5. Frontend not opening (http://172.28.92.56:3000)

If the app at `http://172.28.92.56:3000` does not load, run these checks **on the frontend server (172.28.92.56)**.

**1. Is the web container running?**

```bash
docker compose -f infra/docker-compose.prod.frontend.yml ps
# or: docker ps --filter name=web
```

You should see the `web` service with status `Up`. If it is `Exit` or missing, start it:  
`docker compose -f infra/docker-compose.prod.frontend.yml up -d --build`.

**2. Is the app listening on port 3000?**

```bash
ss -tlnp | grep 3000
# or: netstat -tlnp | grep 3000
```

You should see something like `0.0.0.0:3000` or `*:3000`. If not, check container logs (step 3).

**3. Container logs (build or runtime errors)?**

```bash
docker compose -f infra/docker-compose.prod.frontend.yml logs web
```

Look for build failures, "Error:", or "EADDRINUSE". Fix any errors and run `up -d --build` again.

**4. Can the server reach itself on 3000?**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expect `200` or `304`. If you get "Connection refused", the app inside the container is not listening or the port is not bound.

**5. Firewall / security group**

- **Local firewall (e.g. ufw):** Port 3000 must be allowed for the clients that need to reach the frontend (e.g. your office IP or `0.0.0.0/0` for any):
  ```bash
  sudo ufw status
  sudo ufw allow 3000
  sudo ufw reload
  ```
- **Alibaba Cloud security group:** For the ECS instance 172.28.92.56, add an **inbound** rule: port **3000**, source as needed (e.g. your VPN IP or 0.0.0.0/0 for dev). Without this, traffic from your browser is dropped before it reaches the server.

**6. Public IP vs private IP (172.28.92.56)**

- **172.28.92.56** is a **private** IP. It is only reachable from inside the same Alibaba Cloud VPC (e.g. from the backend server 172.28.92.57 or another ECS in that VPC).
- If you open the URL **from your PC/laptop** (home, office, etc.), your browser cannot route to 172.28.92.56. You must use the frontend ECS instance’s **public IP** instead.
- In Alibaba Cloud Console: **ECS** → select the frontend instance → copy its **Public IP** (or Elastic IP). Then in the browser open: `http://<public-ip>:3000`.
- Ensure the security group for **that same ECS instance** has an **inbound** rule allowing **port 3000** (e.g. source `0.0.0.0/0` for testing). The rule must be on the security group attached to the instance that has the public IP you use.
- If you are testing from **another server in the same VPC** (e.g. SSH to backend 172.28.92.57 and run `curl http://172.28.92.56:3000`), then 172.28.92.56 is correct; the security group must still allow port 3000 from the backend’s IP or from the VPC CIDR.

**7. Frontend not deployed yet?**

On the frontend server you must have run at least once:

```bash
cd ~/slms   # or your repo path
# Create infra/.env with API_URL=http://<backend-public-ip>:3001/api/v1
docker compose -f infra/docker-compose.prod.frontend.yml up -d --build
```

---

## 6. DevOps runbook: still can’t access after ufw and security group

Use this when you’ve already opened ufw and Alibaba inbound rules but still can’t open the app. Run the steps in order and fix any failure before the next step.

### 6.1 Important: which server has which port

- **Port 3000** = frontend (Next.js). Only the **frontend server (172.28.92.56)** must allow port 3000.
- **Port 3001** = backend (API). Only the **backend server (172.28.92.57)** must allow port 3001.

If you ran both ufw blocks on the same machine, one port is still closed on the other server. Apply the rules on the correct host as below.

### 6.2 Verify backend (run on backend server 172.28.92.57)

SSH to the **backend** server, then:

```bash
cd ~/slms   # or your repo path

# 1) Containers up
docker compose -f infra/docker-compose.prod.backend.yml ps
# Expect: postgres, redis, api all "Up"

# 2) API listening on 3001
ss -tlnp | grep 3001
# Expect: 0.0.0.0:3001 or *:3001

# 3) API responds locally
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health
# Expect: 200 (if you see nothing or 000, the API may be on a different port – check "docker compose ... ps" PORTS column; if it shows 4000:4000, set API_PORT=3001 in infra/.env and restart: docker compose ... up -d api)

# 4) ufw allows 3001 from VPC (only on THIS server)
sudo ufw status numbered | grep 3001
# Expect: a rule allowing 3001 (e.g. from 172.28.0.0/16)
# If missing: sudo ufw allow from 172.28.0.0/16 to any port 3001 && sudo ufw reload
```

If step 1–3 fail: fix containers or app (logs: `docker compose -f infra/docker-compose.prod.backend.yml logs api`). If step 3 is 200 but you still can’t reach from your PC, the block is network (ufw or security group).

### 6.3 Verify frontend (run on frontend server 172.28.92.56)

SSH to the **frontend** server, then:

```bash
cd ~/slms

# 1) Web container up
docker compose -f infra/docker-compose.prod.frontend.yml ps
# Expect: web "Up"

# 2) Listening on 3000
ss -tlnp | grep 3000
# Expect: 0.0.0.0:3000 or *:3000

# 3) Responds locally
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Expect: 200 or 307

# 4) ufw allows 3000 from VPC (only on THIS server)
sudo ufw status numbered | grep 3000
# If missing: sudo ufw allow from 172.28.0.0/16 to any port 3000 && sudo ufw reload
```

### 6.4 Test backend → frontend (from backend server)

Run this **on the backend server (172.28.92.57)** only. If you run it on the frontend server you will be testing the frontend from itself; then "Connection refused" means the web container on that host is down or not listening.

**On the backend server** (check the prompt: you should be on the backend host, not the frontend):

```bash
curl -s -o /dev/null -w "%{http_code}" http://172.28.92.56:3000
```

- **200/307** = backend server can reach the frontend. If your browser still can’t, the problem is between your PC and the frontend (your IP not allowed, or you’re not on the VPC).
- **Nothing / empty / 000 / timeout** = path backend→frontend is blocked. Fix: (1) On frontend server run `sudo ufw allow from 172.28.0.0/16 to any port 3000` and `sudo ufw reload`. (2) In Alibaba Cloud, frontend ECS security group must have an **inbound** rule: port **3000**, protocol **TCP**, source **172.28.0.0/16** (or **0.0.0.0/0**). Save and ensure that security group is attached to the frontend instance.

### 6.5 Test backend → API (from frontend server)

SSH to the **frontend** server:

```bash
curl -s -o /dev/null -w "%{http_code}" http://172.28.92.57:3001/api/v1/health
```

- **200** = frontend server can reach the API. If the app loads in the browser but API calls fail, check CORS and `API_URL` (see 6.7).
- **Timeout / connection refused** = path frontend→backend is blocked (backend ufw or Alibaba security group for 172.28.92.57).

### 6.6 Alibaba Cloud security group (concrete)

- **Frontend ECS (172.28.92.56):** One **inbound** rule: port **3000**, protocol **TCP**, source **0.0.0.0/0** (or your VPC CIDR, e.g. 172.28.0.0/16). Save and ensure this security group is **attached** to the frontend instance.
- **Backend ECS (172.28.92.57):** One **inbound** rule: port **3001**, protocol **TCP**, source **0.0.0.0/0** (or 172.28.0.0/16). Attached to the backend instance.

If you use **private IPs** from the same VPC, source **172.28.0.0/16** is enough. If you use **public IPs** from the internet, source must be **0.0.0.0/0** (or your office IP) for the ports above.

### 6.7 CORS and API URL (if app loads but API fails)

- **How you open the app:** e.g. `http://172.28.92.56:3000` or `http://<frontend-public-ip>:3000`.
- **Backend `infra/.env`:** `CORS_ORIGIN` must match that **exactly** (same scheme, host, port), e.g. `CORS_ORIGIN=http://172.28.92.56:3000`. Then restart API: `docker compose -f infra/docker-compose.prod.backend.yml up -d api`.
- **Frontend `infra/.env`:** `API_URL` must be a URL your **browser** can reach. From private network use `http://172.28.92.57:3001/api/v1`; from internet use `http://<backend-public-ip>:3001/api/v1`. After changing `API_URL`, rebuild: `docker compose -f infra/docker-compose.prod.frontend.yml up -d --build`.

### 6.8 Where you open the URL

- **From a PC on the same VPC (e.g. VPN giving you 172.28.x.x):** Open `http://172.28.92.56:3000`. Security group source can be 172.28.0.0/16.
- **From a PC on the internet (home/office):** Open `http://<frontend-public-ip>:3000`. Security group source for ports 3000 and 3001 must allow **0.0.0.0/0** (or your public IP). You cannot use 172.28.92.56 from the internet.

---

## 7. Quick reference

**Backend (172.28.92.57):**

```bash
cd /path/to/sustainability-portal
# Edit infra/.env (DB_*, REDIS_*, JWT_*, CORS_ORIGIN)
docker compose -f infra/docker-compose.prod.backend.yml up -d
docker compose -f infra/docker-compose.prod.backend.yml logs -f api   # confirm migrate
docker compose -f infra/docker-compose.prod.backend.yml exec api npx prisma db seed
```

**Frontend (172.28.92.56):**

```bash
cd /path/to/sustainability-portal
# Edit infra/.env (API_URL=http://<backend-public-ip>:3001/api/v1)
docker compose -f infra/docker-compose.prod.frontend.yml up -d --build
```

Then open `http://<frontend-public-ip>:3000` (or `http://172.28.92.56:3000` if on the same VPC) and log in with `admin@energi-up.com` / `Admin123!` (or your `ADMIN_SEED_PASSWORD`).
