#!/bin/bash
# Nightly Postgres dump. Installed to /usr/local/bin/ecokuku-backup by server-setup.sh.
# Keeps 14 days locally. For offsite copies, configure rclone (e.g. Backblaze B2)
# and set OFFSITE_REMOTE, e.g. OFFSITE_REMOTE=b2:ecokuku-backups in /etc/ecokuku-backup.env
set -euo pipefail

[[ -f /etc/ecokuku-backup.env ]] && source /etc/ecokuku-backup.env
DB_NAME="${DB_NAME:-ecokuku_prod}"
DEST="${BACKUP_DIR:-/var/backups/ecokuku}"
STAMP="$(date +%Y-%m-%d_%H%M)"
FILE="$DEST/${DB_NAME}_${STAMP}.sql.gz"

install -d -m 700 "$DEST"
sudo -u postgres pg_dump "$DB_NAME" | gzip > "$FILE"
echo "$(date -Is) wrote $FILE ($(du -h "$FILE" | cut -f1))"

find "$DEST" -name "${DB_NAME}_*.sql.gz" -mtime +14 -delete

if [[ -n "${OFFSITE_REMOTE:-}" ]]; then
  rclone copy "$FILE" "$OFFSITE_REMOTE" && echo "$(date -Is) uploaded to $OFFSITE_REMOTE"
else
  echo "$(date -Is) WARNING: OFFSITE_REMOTE not set — backup exists only on this server"
fi
