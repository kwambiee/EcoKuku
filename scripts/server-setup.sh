#!/bin/bash
# ─────────────────────────────────────────────────────────────
# EcoKuku — one-time server setup (Ubuntu 22.04 / 24.04)
# Run ONCE on a fresh server, as root:
#   REPO_URL=git@github.com:<you>/<repo>.git bash server-setup.sh
# Optional: DOMAIN=kwambokapoultry.co.ke (default)
# Safe to re-run; each step skips what already exists.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${DOMAIN:-kwambokapoultry.co.ke}"
REPO_URL="${REPO_URL:?Set REPO_URL, e.g. REPO_URL=git@github.com:you/EcoKuku.git}"
APP_USER="deploy"
APP_DIR="/var/www/ecokuku"
DB_NAME="ecokuku_prod"
DB_USER="ecokuku"

[[ $EUID -eq 0 ]] || { echo "Run as root"; exit 1; }
[[ -s /root/.ssh/authorized_keys ]] || { echo "No SSH key in /root/.ssh/authorized_keys — refusing to lock down SSH"; exit 1; }

echo "▶ Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git rsync ufw fail2ban nginx postgresql postgresql-contrib \
  build-essential certbot python3-certbot-nginx unattended-upgrades

echo "▶ Node 20 + PM2"
if ! command -v node >/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2

echo "▶ Swap (4G safety net for builds)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "▶ Deploy user"
if ! id "$APP_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$APP_USER"
fi
usermod -aG sudo "$APP_USER"
echo "$APP_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-$APP_USER
install -d -m 700 -o "$APP_USER" -g "$APP_USER" /home/$APP_USER/.ssh
cp /root/.ssh/authorized_keys /home/$APP_USER/.ssh/authorized_keys
chown "$APP_USER:$APP_USER" /home/$APP_USER/.ssh/authorized_keys
chmod 600 /home/$APP_USER/.ssh/authorized_keys

echo "▶ Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
systemctl enable --now fail2ban

echo "▶ PostgreSQL"
CRED_FILE="/home/$APP_USER/.ecokuku-db-url"
if [[ ! -f "$CRED_FILE" ]]; then
  DB_PASS="$(openssl rand -hex 16)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';
  END IF;
END \$\$;
SQL
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
    || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  echo "postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME" > "$CRED_FILE"
  chown "$APP_USER:$APP_USER" "$CRED_FILE" && chmod 600 "$CRED_FILE"
fi

echo "▶ App directory + git"
install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR"
KEY="/home/$APP_USER/.ssh/id_ed25519"
if [[ ! -f "$KEY" ]]; then
  sudo -u "$APP_USER" ssh-keygen -t ed25519 -N "" -f "$KEY" -C "ecokuku-server"
fi
sudo -u "$APP_USER" bash -c "ssh-keyscan -H github.com >> ~/.ssh/known_hosts 2>/dev/null"
if [[ ! -d "$APP_DIR/.git" ]]; then
  if ! sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"; then
    echo ""
    echo "Clone failed. Add this as a read-only DEPLOY KEY on GitHub"
    echo "(repo → Settings → Deploy keys), then re-run this script:"
    echo ""
    cat "$KEY.pub"
    exit 1
  fi
fi

echo "▶ Nginx"
cat > /etc/nginx/sites-available/ecokuku <<NGINX
server {
  listen 80;
  server_name $DOMAIN www.$DOMAIN;
  client_max_body_size 20M;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
server {
  listen 80;
  server_name admin.$DOMAIN;
  client_max_body_size 20M;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/ecokuku /etc/nginx/sites-enabled/ecokuku
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "▶ PM2 on boot"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" >/dev/null || true

echo "▶ Nightly DB backup (02:30)"
SRC="$(cd "$(dirname "$0")" && pwd)/backup-db.sh"
[[ -f "$SRC" ]] || SRC="$APP_DIR/scripts/backup-db.sh"
install -m 755 "$SRC" /usr/local/bin/ecokuku-backup
echo "30 2 * * * root /usr/local/bin/ecokuku-backup >> /var/log/ecokuku-backup.log 2>&1" > /etc/cron.d/ecokuku-backup

echo "▶ Lock down SSH (key-only, no root login)"
cat > /etc/ssh/sshd_config.d/99-ecokuku.conf <<SSHD
PasswordAuthentication no
PermitRootLogin no
SSHD
systemctl reload ssh || systemctl reload sshd

echo ""
echo "══════════════════════════════════════════════════"
echo " Setup done. Database URL (also in $CRED_FILE):"
cat "$CRED_FILE"
echo ""
echo " Next: from your Mac, in a NEW terminal, confirm  ssh $APP_USER@<server-ip>  works"
echo " before closing this session. Then follow DEPLOY.md → 'First deploy'."
echo "══════════════════════════════════════════════════"
