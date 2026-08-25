#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Kwamboka Poultry Farm — Deploy Script
# Run from the repo root on your Mac:
#   bash deploy.sh            → deploy both apps
#   bash deploy.sh admin      → deploy admin only
#   bash deploy.sh web        → deploy web only
# ─────────────────────────────────────────────────────────────
set -e

SERVER="root@167.172.110.41"
REMOTE_ROOT="/var/www/ecokuku"
DB_URL="postgresql://ecokuku:HsjS9l6%40LigWfHap@localhost:5432/ecokuku_prod"

TARGET="${1:-both}"   # admin | web | both

# ── Colours ───────────────────────────────────────────────────
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'
step() { echo -e "\n${CYAN}▶  $1${RESET}"; }
ok()   { echo -e "${GREEN}✅  $1${RESET}"; }
warn() { echo -e "${YELLOW}⚠️   $1${RESET}"; }

echo -e "\n══════════════════════════════════════════════════"
echo -e "  Kwamboka Poultry Farm — Deploy  [target: ${TARGET}]"
echo -e "══════════════════════════════════════════════════\n"

# ── 1. Git — commit & push ────────────────────────────────────
step "Step 1 · Commit & push to main"

if [[ -n $(git status --porcelain) ]]; then
  read -p "  Commit message (Enter for 'deploy $(date +%Y-%m-%d)'): " MSG
  MSG="${MSG:-deploy $(date +%Y-%m-%d)}"
  git add -A
  git commit -m "$MSG

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
  git push origin main
  ok "Pushed to main"
else
  warn "Working tree clean — nothing to commit"
  git push origin main 2>/dev/null || true
fi

# ── 2. Build locally (server RAM too small to build) ─────────
step "Step 2 · Build"

if [[ "$TARGET" == "admin" || "$TARGET" == "both" ]]; then
  echo "  Building admin..."
  npm run build --workspace=apps/admin
  ok "Admin built"
fi

if [[ "$TARGET" == "web" || "$TARGET" == "both" ]]; then
  echo "  Building web..."
  npm run build --workspace=apps/web
  ok "Web built"
fi

# ── 3. Server: pull latest source ────────────────────────────
step "Step 3 · Pull latest code on server"
ssh ${SERVER} "cd ${REMOTE_ROOT} && git pull origin main"
ok "Server is on latest main"

# ── 4. Prisma: apply schema changes ──────────────────────────
step "Step 4 · Prisma db push (apply schema changes)"
ssh ${SERVER} "cd ${REMOTE_ROOT} && \
  export DATABASE_URL='${DB_URL}' && \
  ./node_modules/.bin/prisma db push \
    --schema=packages/db/prisma/schema.prisma \
    --accept-data-loss 2>&1 | tail -5"
ok "Schema up to date"

# ── 5. Remove old build & upload new build ───────────────────
step "Step 5 · Replace build files on server"

if [[ "$TARGET" == "admin" || "$TARGET" == "both" ]]; then
  echo "  Clearing old admin .next..."
  ssh ${SERVER} "rm -rf ${REMOTE_ROOT}/apps/admin/.next"
  echo "  Uploading new admin .next..."
  rsync -az --delete apps/admin/.next/ ${SERVER}:${REMOTE_ROOT}/apps/admin/.next/
  ok "Admin build uploaded"
fi

if [[ "$TARGET" == "web" || "$TARGET" == "both" ]]; then
  echo "  Clearing old web .next..."
  ssh ${SERVER} "rm -rf ${REMOTE_ROOT}/apps/web/.next"
  echo "  Uploading new web .next..."
  rsync -az --delete apps/web/.next/ ${SERVER}:${REMOTE_ROOT}/apps/web/.next/
  ok "Web build uploaded"
fi

# Always sync admin public/uploads so Cloudinary-fallback images stay available
echo "  Syncing admin public folder..."
rsync -az apps/admin/public/ ${SERVER}:${REMOTE_ROOT}/apps/admin/public/

# ── 6. Restart PM2 ───────────────────────────────────────────
step "Step 6 · Restart PM2"

if [[ "$TARGET" == "admin" ]]; then
  ssh ${SERVER} "pm2 restart ecokuku-admin && pm2 save"
  ok "ecokuku-admin restarted"
elif [[ "$TARGET" == "web" ]]; then
  ssh ${SERVER} "pm2 restart ecokuku-web && pm2 save"
  ok "ecokuku-web restarted"
else
  ssh ${SERVER} "pm2 restart ecokuku-admin ecokuku-web && pm2 save"
  ok "All apps restarted"
fi

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "══════════════════════════════════════════════════"
echo -e "${GREEN}  ✅  Deploy complete!${RESET}"
echo    "  Admin:  http://167.172.110.41:8080"
echo    "  Web:    http://167.172.110.41"
echo    ""
echo    "  Check logs:  ssh ${SERVER} \"pm2 logs --lines 30\""
echo -e "══════════════════════════════════════════════════\n"
