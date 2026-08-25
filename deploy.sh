#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Kwamboka Poultry Farm — Deploy Script
# Run from the repo root on your Mac:
#   bash deploy.sh
# ─────────────────────────────────────────────────────────────
set -e

SERVER="root@167.172.110.41"
REMOTE_ROOT="/var/www/ecokuku"

echo ""
echo "══════════════════════════════════════════════════"
echo "  Kwamboka Poultry Farm — Build & Deploy"
echo "══════════════════════════════════════════════════"
echo ""

# ── 1. Build ──────────────────────────────────────────────────
echo "▶  Building admin app..."
cd apps/admin
npm run build
cd ../..

echo "▶  Building web app..."
cd apps/web
npm run build
cd ../..

# ── 2. Rsync .next folders to server ─────────────────────────
echo ""
echo "▶  Uploading admin .next to server..."
rsync -avz --delete apps/admin/.next/ ${SERVER}:${REMOTE_ROOT}/apps/admin/.next/

echo "▶  Uploading web .next to server..."
rsync -avz --delete apps/web/.next/ ${SERVER}:${REMOTE_ROOT}/apps/web/.next/

# ── 3. Rsync public folders (for any local /uploads) ─────────
echo ""
echo "▶  Syncing admin public/uploads..."
rsync -avz apps/admin/public/ ${SERVER}:${REMOTE_ROOT}/apps/admin/public/

# ── 4. Sync package.json files (in case deps changed) ────────
echo "▶  Syncing package files..."
rsync -avz --include="package.json" --include="package-lock.json" \
  --exclude="*" apps/admin/ ${SERVER}:${REMOTE_ROOT}/apps/admin/
rsync -avz --include="package.json" --include="package-lock.json" \
  --exclude="*" apps/web/ ${SERVER}:${REMOTE_ROOT}/apps/web/

# ── 5. Restart PM2 on server ─────────────────────────────────
echo ""
echo "▶  Restarting PM2 on server..."
ssh ${SERVER} "cd ${REMOTE_ROOT} && pm2 restart all && pm2 save"

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅  Deploy complete!"
echo "  Admin: http://167.172.110.41:3001"
echo "  Web:   http://167.172.110.41:3000"
echo "══════════════════════════════════════════════════"
echo ""
