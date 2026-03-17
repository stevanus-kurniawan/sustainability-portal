#!/usr/bin/env bash
# Production backup: Postgres (pg_dump) + MinIO bucket.
# Run from host where Docker is running (cron: daily at 22:00 UTC+7).
# Requires: same .env as docker-compose.prod.backend (DB_*, MINIO_*), container names and network from that compose.

set -e

# Script dir and project root (repo root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/infra"

# Load env (same file used by prod backend compose). Override path with INFRA_ENV if needed.
INFRA_ENV="${INFRA_ENV:-$INFRA_DIR/.env}"
if [[ -f "$INFRA_DIR/env.prod.backend" ]]; then
  INFRA_ENV="${INFRA_ENV:-$INFRA_DIR/env.prod.backend}"
fi
if [[ -f "$INFRA_ENV" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$INFRA_ENV"
  set +a
fi

# Config (override with env)
BACKUP_DIR="${BACKUP_DIR:-/opt/sustainability-portal/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_USER="${DB_USER:-slms}"
DB_NAME="${DB_NAME:-slms}"
MINIO_BUCKET="${MINIO_BUCKET:-slms-docs}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-slms-postgres-prod}"
MINIO_CONTAINER="${MINIO_CONTAINER:-slms-minio-prod}"
BACKEND_NETWORK="${BACKEND_NETWORK:-slms-network-prod-backend}"

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
RUN_DIR="$BACKUP_DIR/$TIMESTAMP"
LOG_FILE="$BACKUP_DIR/backup.log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"; }

mkdir -p "$RUN_DIR"

log "Starting backup to $RUN_DIR"

# --- PostgreSQL ---
if docker exec "$POSTGRES_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
  if docker exec "$POSTGRES_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" 2>>"$RUN_DIR/error.log" | gzip > "$RUN_DIR/slms.sql.gz"; then
    log "Postgres backup OK: $RUN_DIR/slms.sql.gz"
  else
    log "ERROR: Postgres backup failed (see $RUN_DIR/error.log)"
    exit 1
  fi
else
  log "ERROR: Postgres not ready or container missing: $POSTGRES_CONTAINER"
  exit 1
fi

# --- MinIO bucket ---
if docker ps --format '{{.Names}}' | grep -q "^${MINIO_CONTAINER}$"; then
  # Mirror bucket to a folder inside RUN_DIR (container writes to mounted RUN_DIR)
  if docker run --rm \
    --network "$BACKEND_NETWORK" \
    -v "$RUN_DIR:/backup" \
    -e "MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY" \
    -e "MINIO_SECRET_KEY=$MINIO_SECRET_KEY" \
    -e "MINIO_BUCKET=$MINIO_BUCKET" \
    minio/mc:latest \
    /bin/sh -c "
      mc alias set slms http://minio:9000 \"\$MINIO_ACCESS_KEY\" \"\$MINIO_SECRET_KEY\" &&
      mc mirror slms/\$MINIO_BUCKET /backup/minio --overwrite
    " >>"$LOG_FILE" 2>>"$RUN_DIR/error.log"; then
    # Compress and remove raw dir to save space
    tar -czf "$RUN_DIR/minio.tar.gz" -C "$RUN_DIR" minio 2>>"$RUN_DIR/error.log" && rm -rf "$RUN_DIR/minio"
    log "MinIO backup OK: $RUN_DIR/minio.tar.gz"
  else
    log "ERROR: MinIO backup failed (see $RUN_DIR/error.log)"
    exit 1
  fi
else
  log "WARN: MinIO container not running ($MINIO_CONTAINER), skipping bucket backup"
fi

# --- Retention: remove backups older than RETENTION_DAYS ---
if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] && [[ "$RETENTION_DAYS" -gt 0 ]]; then
  find "$BACKUP_DIR" -maxdepth 1 -type d -name '20*' -mtime +$((RETENTION_DAYS - 1)) 2>/dev/null | while read -r old; do
    log "Removing old backup: $old"
    rm -rf "$old"
  done
fi

log "Backup finished: $RUN_DIR"
