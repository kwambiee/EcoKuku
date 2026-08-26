#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Kwamboka Poultry Farm — Deploy Script
# Usage:
#   bash deploy.sh            → deploy both apps
#   bash deploy.sh admin      → deploy admin only
#   bash deploy.sh web        → deploy web only
# ─────────────────────────────────────────────────────────────
set -e

SERVER="root@167.172.110.41"
REMOTE_ROOT="/var/www/ecokuku"
DB_URL="postgresql://ecokuku:HsjS9l6%40LigWfHap@localhost:5432/ecokuku_prod"
TARGET="${1:-both}"

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

# ── 2. Build locally ──────────────────────────────────────────
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

# ── 3+4. Server prep — one SSH session does it all ───────────
step "Steps 3–4 · Server: pull code → prisma → clear old builds"

# Build the rm commands for only the apps being deployed
RM_CMDS=""
[[ "$TARGET" == "admin" || "$TARGET" == "both" ]] && RM_CMDS="${RM_CMDS}rm -rf ${REMOTE_ROOT}/apps/admin/.next && "
[[ "$TARGET" == "web"   || "$TARGET" == "both" ]] && RM_CMDS="${RM_CMDS}rm -rf ${REMOTE_ROOT}/apps/web/.next && "
RM_CMDS="${RM_CMDS}echo 'Old builds cleared'"

ssh ${SERVER} "
  set -e
  cd ${REMOTE_ROOT}

  echo '  → Discarding server-side local changes...'
  git reset --hard HEAD
  git clean -fd

  echo '  → Pulling latest code...'
  git pull origin main

  echo '  → Running prisma db push...'
  export DATABASE_URL='${DB_URL}'
  ./node_modules/.bin/prisma db push \
    --schema=packages/db/prisma/schema.prisma \
    --accept-data-loss 2>&1 | tail -3

  echo '  → Clearing old build files...'
  ${RM_CMDS}
"
ok "Server ready"

# ── 5. Upload new builds ──────────────────────────────────────
step "Step 5 · Upload new builds"
if [[ "$TARGET" == "admin" || "$TARGET" == "both" ]]; then
  echo "  Uploading admin .next..."
  rsync -az --delete apps/admin/.next/ ${SERVER}:${REMOTE_ROOT}/apps/admin/.next/
  ok "Admin build uploaded"
fi
if [[ "$TARGET" == "web" || "$TARGET" == "both" ]]; then
  echo "  Uploading web .next..."
  rsync -az --delete apps/web/.next/ ${SERVER}:${REMOTE_ROOT}/apps/web/.next/
  ok "Web build uploaded"
fi

# Always sync admin public/ so local uploads stay available as fallback
rsync -az apps/admin/public/ ${SERVER}:${REMOTE_ROOT}/apps/admin/public/

# ── 6. Restart PM2 — one SSH session ─────────────────────────
step "Step 6 · Restart PM2"

PM2_CMD=""
if   [[ "$TARGET" == "admin" ]]; then PM2_CMD="pm2 restart ecokuku-admin"
elif [[ "$TARGET" == "web"   ]]; then PM2_CMD="pm2 restart ecokuku-web"
else                                  PM2_CMD="pm2 restart ecokuku-admin ecokuku-web"
fi

ssh ${SERVER} "${PM2_CMD} && pm2 save"
ok "PM2 restarted"

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "══════════════════════════════════════════════════"
echo -e "${GREEN}  ✅  Deploy complete!${RESET}"
echo    "  Web:    https://kwambokapoultry.co.ke"
echo    "  Admin:  https://admin.kwambokapoultry.co.ke"
echo    ""
echo    "  Logs:   ssh ${SERVER} 'pm2 logs --lines 30'"
echo -e "══════════════════════════════════════════════════\n"
