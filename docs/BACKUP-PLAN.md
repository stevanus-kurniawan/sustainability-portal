# Production backup plan

This document recommends what to back up, how often, where to store backups, and how to restore. The actual backup is run by a cron job using the script in `infra/backup/`.

---

## 1. What to back up

| Data        | Importance | Tool / method |
|------------|------------|----------------|
| **PostgreSQL** | Critical   | `pg_dump` (logical backup). Contains all app data (users, orgs, certifications, licenses, etc.). |
| **MinIO (bucket)** | Critical | `mc mirror` or `mc cp` to export the bucket (e.g. `slms-docs`). Contains uploaded documents and files. |
| **Redis**  | Optional   | Cache/sessions only. Can be skipped; app works without it and repopulates cache. If you want: `BGSAVE` + copy RDB file. |

Recommendation: **Back up Postgres and MinIO on a schedule. Skip Redis** unless you have a specific need to restore session state.

---

## 2. Schedule and retention

| Backup type | Frequency | Retention | When to run |
|-------------|-----------|-----------|-------------|
| **Daily**   | Once per day | Keep last **14** days | **22:00 UTC+7** (local backend server) |

- **Location:** `/opt/sustainability-portal/backups/` on the backend server.
- **RPO (Recovery Point Objective):** With daily backups, you can lose at most ~24 hours of data if you restore from the last backup.
- **RTO (Recovery Time Objective):** Depends on restore time (Postgres restore + MinIO copy); typically 15–60 minutes for a full restore.

---

## 3. Where to store backups

1. **Primary:** `/opt/sustainability-portal/backups` on the **backend server**. The cron script writes timestamped folders here (Postgres + MinIO).
2. **Secondary (recommended):** Copy backups off the server so a single-server failure doesn’t wipe backups:
   - Another server or NAS (e.g. `rsync` or `scp` to a backup host).
   - Object storage (e.g. S3, OSS, or another MinIO) with a separate small script or cron job.

The script in `infra/backup/` does **local backups only**. Off-site copy is left to you (e.g. nightly `rsync` to a backup server).

---

## 4. What the backup script does

- Creates a timestamped directory: `BACKUP_DIR/YYYY-MM-DD_HH-MM-SS/`.
- **Postgres:** Runs `pg_dump` inside the Postgres container, writes a compressed `.sql.gz` file.
- **MinIO:** Uses MinIO Client (`mc`) in a one-off container on the same Docker network to mirror the bucket into a folder, then tars and compresses it.
- **Rotation:** Deletes backups older than `RETENTION_DAYS` (default **14**).
- Logs to a file and on failure can optionally send an alert (e.g. email) if you add it.

---

## 5. Recovery (restore)

### 5.1 Restore PostgreSQL

```bash
# Stop API so nothing writes to DB (optional but safer)
docker stop slms-api-prod

# Restore (gunzip and feed into postgres). Replace BACKUP_FILE with your .sql.gz path.
gunzip -c /opt/sustainability-portal/backups/2025-03-06_22-00-00/slms.sql.gz | \
  docker exec -i slms-postgres-prod psql -U slms -d slms

# Restart API
docker start slms-api-prod
```

If the DB user or database name is different, adjust `-U` and `-d`. For a clean restore you may want to drop and recreate the DB first (see your DBA or run `drop database` / `create database` as needed).

### 5.2 Restore MinIO bucket

- Stop or pause the API so no new uploads run during restore (optional).
- Use MinIO Client to copy from the backup tar (after extracting) back into the bucket, or replace the MinIO data volume from a full volume backup if you have one.
- Example (after extracting the backup tar to a directory `./minio-restore/`):

```bash
docker run --rm --network slms-network-prod-backend \
  -v $(pwd)/minio-restore:/restore \
  -e MINIO_ACCESS_KEY=... -e MINIO_SECRET_KEY=... \
  minio/mc:latest \
  /bin/sh -c "mc alias set slms http://minio:9000 \$MINIO_ACCESS_KEY \$MINIO_SECRET_KEY; mc mirror /restore slms/slms-docs"
```

(You can also add a small `restore-minio.sh` script that reads from the latest backup dir and runs the mirror.)

---

## 6. Checklist before going live

- [ ] Backend server has enough disk for `BACKUP_DIR` (e.g. 2× current DB + MinIO size for retention).
- [ ] Cron is installed and the backup script runs daily at **22:00 UTC+7**.
- [ ] Script is executable and env vars (or defaults) are set: `BACKUP_DIR` (default `/opt/sustainability-portal/backups`), `RETENTION_DAYS` (default 14), and compose/env so the script can see `DB_*`, `MINIO_*`, container names, network.
- [ ] One manual run of the script succeeds and produces a Postgres dump and a MinIO archive in `BACKUP_DIR`.
- [ ] (Recommended) Set up off-server copy (rsync, cloud, or NAS) for the contents of `BACKUP_DIR`.

---

## 7. Summary

| Item        | Value |
|------------|--------|
| **Back up** | Postgres (pg_dump) + MinIO bucket. |
| **Schedule** | Daily at **22:00 UTC+7**. |
| **Retention** | **14 days** (configurable via `RETENTION_DAYS`). |
| **Location** | **`/opt/sustainability-portal/backups`** on backend server; optionally copy off-server. |
| **Restore** | Postgres: `gunzip -c file.sql.gz \| docker exec -i ... psql`. MinIO: extract backup and `mc mirror` back to bucket. |

The implementation is in **`infra/backup/`**: script + README for cron setup.
