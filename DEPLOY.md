# EcoKuku — Production Deployment Guide

Host: Contabo Cloud VPS 4 (4 vCPU, 8 GB RAM, 100 GB) — Ubuntu
Server path: `/var/www/ecokuku`
Server user: `deploy` (root login and password SSH are disabled)
Web: `https://kwambokapoultry.co.ke` → port 3000
Admin: `https://admin.kwambokapoultry.co.ke` → port 3001

The server has enough RAM to build, so builds now happen **on the server**.
No database passwords or server IPs are stored in this repo.

---

## One-time setup (new server)

1. In the Contabo panel, install Ubuntu with your SSH public key (`~/.ssh/id_ed25519.pub`).
2. Create `.deploy.env` in the repo root (gitignored):
   ```
   DEPLOY_HOST=deploy@<server-ip>
   ```
3. Copy the setup script and run it as root (first login is `root`):
   ```bash
   scp scripts/server-setup.sh scripts/backup-db.sh root@<server-ip>:/root/
   ssh root@<server-ip>
   REPO_URL=git@github.com:<you>/<repo>.git bash server-setup.sh
   ```
   If the clone fails it prints a deploy key — add it under GitHub repo → Settings → Deploy keys, then re-run.
   It prints the new `DATABASE_URL` at the end (also saved in `/home/deploy/.ecokuku-db-url`).
   `backup-db.sh` is installed from the file you copied next to it.
4. In a **new terminal**, check `ssh deploy@<server-ip>` works before closing the root session.
5. Copy env files from your Mac (then edit on the server — see below):
   ```bash
   scp apps/admin/.env.local deploy@<server-ip>:/var/www/ecokuku/apps/admin/.env.local
   scp apps/web/.env.local   deploy@<server-ip>:/var/www/ecokuku/apps/web/.env.local
   ```
   On the server, in all three files below, set:
   - `DATABASE_URL` → the URL printed by setup (also write it to `packages/db/.env`)
   - `NEXTAUTH_URL` → `https://admin.kwambokapoultry.co.ke` (admin) / `https://kwambokapoultry.co.ke` (web)
   - `NEXT_PUBLIC_ADMIN_URL` (web) → `https://admin.kwambokapoultry.co.ke`
   - `NODE_ENV=production`
   - Use a **fresh `NEXTAUTH_SECRET`** (`openssl rand -base64 32`)
6. Point DNS A records for `@`, `www` and `admin` at the server IP, wait for propagation, then:
   ```bash
   ssh deploy@<server-ip>
   sudo certbot --nginx -d kwambokapoultry.co.ke -d www.kwambokapoultry.co.ke -d admin.kwambokapoultry.co.ke
   ```

### First deploy
```bash
bash deploy.sh
```
For a brand-new empty database, seed it once:
```bash
ssh deploy@<server-ip> "cd /var/www/ecokuku && npm run db:seed"
```
To restore an existing database dump instead:
```bash
scp dump.sql.gz deploy@<server-ip>:/tmp/
ssh deploy@<server-ip> "gunzip -c /tmp/dump.sql.gz | psql \"\$(cat ~/.ecokuku-db-url)\""
```

---

## Every deployment

```bash
bash deploy.sh          # both apps
bash deploy.sh admin    # admin only
bash deploy.sh web      # web only
```
It commits and pushes, then on the server: pulls, installs, runs `prisma generate` + `prisma db push`, builds, and restarts PM2.

`prisma db push` no longer uses `--accept-data-loss`. If a schema change would delete data, the deploy stops with a message — review it and run the push by hand if you really mean it.

---

## Backups

- A nightly `pg_dump` runs at 02:30 and keeps 14 days in `/var/backups/ecokuku` (log: `/var/log/ecokuku-backup.log`).
- **Local-only backups don't survive losing the server.** Set up an offsite copy: install `rclone`, configure a remote (e.g. Backblaze B2), then create `/etc/ecokuku-backup.env`:
  ```
  OFFSITE_REMOTE=b2:your-bucket-name
  ```
- Test a manual backup: `ssh deploy@<server-ip> "sudo ecokuku-backup"`.
- Uploaded product images are on Cloudinary; legacy `apps/admin/public/uploads` files are not in git — back them up too (`rsync -az deploy@<server-ip>:/var/www/ecokuku/apps/admin/public/ ./backup-public/`).

---

## Useful server commands

```bash
ssh deploy@<server-ip> "pm2 list"
ssh deploy@<server-ip> "pm2 logs --lines 50 --nostream"
ssh deploy@<server-ip> "pm2 logs ecokuku-admin --lines 50 --nostream"
ssh deploy@<server-ip> "sudo systemctl status nginx --no-pager"
ssh deploy@<server-ip> "sudo systemctl restart nginx"
ssh deploy@<server-ip> "psql \"\$(cat ~/.ecokuku-db-url)\" -c '\dt'"
```

## Environment files location

- Admin: `/var/www/ecokuku/apps/admin/.env.local`
- Web: `/var/www/ecokuku/apps/web/.env.local`
- Prisma: `/var/www/ecokuku/packages/db/.env`

## Billing — don't repeat the last outage

Enable 2FA (done), keep a card with balance plus a second payment method, and make sure Contabo's billing emails go to an inbox you read daily.
