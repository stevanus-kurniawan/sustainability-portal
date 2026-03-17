# Production backup (cron / scheduler)

This folder contains the **backup script** for production data (PostgreSQL + MinIO). The **backup plan** (what to back up, retention, restore steps) is in [docs/BACKUP-PLAN.md](../../docs/BACKUP-PLAN.md).

## What the script does

- **PostgreSQL:** `pg_dump` from container `slms-postgres-prod` → compressed `slms.sql.gz`.
- **MinIO:** `mc mirror` of bucket (e.g. `slms-docs`) → folder then compressed to `minio.tar.gz`.
- **Retention:** Deletes backup directories older than `RETENTION_DAYS` (default **14** days).

Backups are written to a timestamped directory under `BACKUP_DIR` (default **`/opt/sustainability-portal/backups`**), e.g.:

```text
/opt/sustainability-portal/backups/
  2025-03-06_22-00-00/
    slms.sql.gz      # Postgres dump
    minio.tar.gz     # MinIO bucket archive
  backup.log         # Append-only log
```

## Prerequisites

- Run on the **backend server** where `docker-compose.prod.backend.yml` is used.
- Docker and the prod backend stack must be running (containers `slms-postgres-prod`, `slms-minio-prod` and network `slms-network-prod-backend`).
- Env vars for DB and MinIO must be available (see below). The script loads `infra/.env` or `infra/env.prod.backend` if present.

## Setup

### 1. Create backup directory (on backend server)

```bash
sudo mkdir -p /opt/sustainability-portal/backups
sudo chown "$USER:$USER" /opt/sustainability-portal/backups
```

### 2. Make the script executable

From the **project root** (repo clone on the backend server):

```bash
chmod +x infra/backup/backup.sh
```

### 3. Ensure env is available

The script sources env from (in order):

- `INFRA_ENV` if set (e.g. `export INFRA_ENV=/path/to/infra/env.prod.backend`)
- Otherwise `infra/env.prod.backend` if it exists
- Otherwise `infra/.env`

Required variables (same as prod backend):

- `DB_USER`, `DB_PASSWORD`, `DB_NAME` (Postgres)
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` (MinIO)

Optional overrides:

- `BACKUP_DIR` (default: `/opt/sustainability-portal/backups`)
- `RETENTION_DAYS` (default: `14`)
- `POSTGRES_CONTAINER` (default: `slms-postgres-prod`)
- `MINIO_CONTAINER` (default: `slms-minio-prod`)
- `BACKEND_NETWORK` (default: `slms-network-prod-backend`)

### 4. Test run (from project root)

```bash
./infra/backup/backup.sh
```

Check that `BACKUP_DIR` contains a new timestamped folder with `slms.sql.gz` and `minio.tar.gz`, and `backup.log` shows success.

### 5. Install cron (daily at 22:00 UTC+7)

On the backend server:

```bash
crontab -e
```

Add one line. Use **22:00 UTC+7** (e.g. Asia/Jakarta). If the server timezone is already UTC+7, use:

```cron
0 22 * * * cd /opt/sustainability-portal && INFRA_ENV=infra/env.prod.backend ./infra/backup/backup.sh >> /opt/sustainability-portal/backups/backup.log 2>&1
```

If the server uses a different timezone (e.g. UTC), set `TZ` so the job runs at 22:00 UTC+7:

```cron
TZ=Asia/Jakarta
0 22 * * * cd /opt/sustainability-portal && INFRA_ENV=infra/env.prod.backend ./infra/backup/backup.sh >> /opt/sustainability-portal/backups/backup.log 2>&1
```

Summary:

| Setting    | Value |
|-----------|--------|
| Schedule  | Every day at **22:00 UTC+7** |
| Retention | **14 days** (older backups deleted automatically) |
| Location  | `/opt/sustainability-portal/backups/` |

## Restore

See [docs/BACKUP-PLAN.md – Recovery (restore)](../../docs/BACKUP-PLAN.md#5-recovery-restore).

## Troubleshooting

- **"Postgres not ready"** – Ensure the backend stack is up: `docker ps` should show `slms-postgres-prod`.
- **"MinIO backup failed"** – Check `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` and that `slms-minio-prod` is on `slms-network-prod-backend`.
- **Permission denied** – Run `chmod +x infra/backup/backup.sh` and ensure the user running cron can read `infra/.env` or `infra/env.prod.backend`.
- **No space left** – Increase disk or reduce `RETENTION_DAYS`; consider copying backups off-server (e.g. rsync to another host).
