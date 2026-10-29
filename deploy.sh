#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Kwamboka Poultry Farm — Deploy Script (server-side build)
# Usage:
#   bash deploy.sh            → deploy both apps
#   bash deploy.sh admin      → deploy admin only
#   bash deploy.sh web        → deploy web only
#
# Server address comes from DEPLOY_HOST (env var) or a gitignored
# .deploy.env file containing:  DEPLOY_HOST=deploy@<server-ip>
# Secrets live in the server's .env.local files — none are in this script.
# ─────────────────────────────────────────────────────────────
set -e

[[ -f .deploy.env ]] && source .deploy.env
SERVER="${DEPLOY_HOST:?Set DEPLOY_HOST (e.g. in .deploy.env: DEPLOY_HOST=deploy@1.2.3.4)}"
REMOTE_ROOT="/var/www/ecokuku"
TARGET="${1:-both}"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'
step() { echo -e "\n${CYAN}▶  $1${RESET}"; }
ok()   { echo -e "${GREEN}✅  $1${RESET}"; }
warn() { echo -e "${YELLOW}⚠️   $1${RESET}"; }

case "$TARGET" in
  admin|web|both) ;;
  *) echo "Unknown target '$TARGET' (use: admin | web | both)"; exit 1 ;;
esac

echo -e "\n══════════════════════════════════════════════════"
echo -e "  Kwamboka Poultry Farm — Deploy  [target: ${TARGET}]"
echo -e "══════════════════════════════════════════════════\n"

# ── 1. Git — commit & push ────────────────────────────────────
step "Step 1 · Commit & push to main"
if [[ -n $(git status --porcelain) ]]; then
  read -p "  Commit message (Enter for 'deploy $(date +%Y-%m-%d)'): " MSG
  MSG="${MSG:-deploy $(date +%Y-%m-%d)}"
  git add -A
  git commit -m "$MSG"
  git push origin main
  ok "Pushed to main"
else
  warn "Working tree clean — nothing to commit"
  git push origin main 2>/dev/null || true
fi

# ── 2. Server: pull → install → prisma → build → restart ─────
step "Step 2 · Server: pull, install, prisma, build, restart"

BUILD_CMDS=""
PM2_APPS=""
if [[ "$TARGET" == "admin" || "$TARGET" == "both" ]]; then
  BUILD_CMDS="${BUILD_CMDS}echo '  → Building admin...' && npm run build --workspace=apps/admin && "
  PM2_APPS="${PM2_APPS} ecokuku-admin"
fi
if [[ "$TARGET" == "web" || "$TARGET" == "both" ]]; then
  BUILD_CMDS="${BUILD_CMDS}echo '  → Building web...' && npm run build --workspace=apps/web && "
  PM2_APPS="${PM2_APPS} ecokuku-web"
fi
BUILD_CMDS="${BUILD_CMDS}true"

ssh ${SERVER} "
  set -e
  cd ${REMOTE_ROOT}

  echo '  → Discarding server-side local changes...'
  git reset --hard HEAD
  git clean -fd

  echo '  → Pulling latest code...'
  git pull origin main

  echo '  → Installing dependencies...'
  npm install --no-audit --no-fund

  echo '  → Prisma generate + db push...'
  # DATABASE_URL is read from packages/db/.env. No --accept-data-loss:
  # if a schema change would drop data, this stops and tells you.
  ./node_modules/.bin/prisma generate --schema=packages/db/prisma/schema.prisma
  ./node_modules/.bin/prisma db push --schema=packages/db/prisma/schema.prisma

  ${BUILD_CMDS}

  echo '  → Restarting PM2...'
  pm2 startOrRestart ecosystem.config.js --only '$(echo ${PM2_APPS} | tr ' ' ',')' || pm2 restart ${PM2_APPS}
  pm2 save
"
ok "Deployed"

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "══════════════════════════════════════════════════"
echo -e "${GREEN}  ✅  Deploy complete!${RESET}"
echo    "  Web:    https://kwambokapoultry.co.ke"
echo    "  Admin:  https://admin.kwambokapoultry.co.ke"
echo    ""
echo    "  Logs:   ssh ${SERVER} 'pm2 logs --lines 30'"
echo -e "══════════════════════════════════════════════════\n"
