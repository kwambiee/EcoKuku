# EcoKuku — Production Deployment Guide

Server IP: `167.172.110.41`
Server path: `/var/www/ecokuku`
Admin URL: `http://167.172.110.41:8080`
Web URL: `http://167.172.110.41`

---

## Every deployment (run on your Mac)

### Step 1 — Push code to GitHub
```bash
cd /Users/joykwamboka/Desktop/EcoKuku
git add -A
git commit -m "your message here"
git push origin main
```

### Step 2 — Pull latest code on server
```bash
ssh root@167.172.110.41
cd /var/www/ecokuku
git pull origin main
exit
```

### Step 3 — Build locally (server RAM is too small to build)

Build admin only (if you changed admin):
```bash
cd /Users/joykwamboka/Desktop/EcoKuku
npm run build --workspace=apps/admin
```

Build web only (if you changed web):
```bash
npm run build --workspace=apps/web
```

Build both:
```bash
npm run build --workspace=apps/admin && npm run build --workspace=apps/web
```

### Step 4 — Upload build to server

Upload admin build:
```bash
rsync -avz --delete apps/admin/.next/ root@167.172.110.41:/var/www/ecokuku/apps/admin/.next/
```

Upload web build:
```bash
rsync -avz --delete apps/web/.next/ root@167.172.110.41:/var/www/ecokuku/apps/web/.next/
```

Upload both:
```bash
rsync -avz --delete apps/admin/.next/ root@167.172.110.41:/var/www/ecokuku/apps/admin/.next/ && \
rsync -avz --delete apps/web/.next/ root@167.172.110.41:/var/www/ecokuku/apps/web/.next/
```

### Step 5 — Restart apps on server
```bash
ssh root@167.172.110.41 "pm2 restart all"
```

Or restart individually:
```bash
ssh root@167.172.110.41 "pm2 restart ecokuku-admin"
ssh root@167.172.110.41 "pm2 restart ecokuku-web"
```

---

## If you changed the Prisma schema (packages/db/prisma/schema.prisma)

Run this on the server AFTER git pull and BEFORE restarting PM2:
```bash
ssh root@167.172.110.41
export DATABASE_URL="postgresql://ecokuku:HsjS9l6%40LigWfHap@localhost:5432/ecokuku_prod"
cd /var/www/ecokuku
./node_modules/.bin/prisma db push --schema=packages/db/prisma/schema.prisma
exit
```

---

## Full deploy in one go (copy-paste this)

For admin only:
```bash
cd /Users/joykwamboka/Desktop/EcoKuku && \
git add -A && git commit -m "deploy" && git push origin main && \
ssh root@167.172.110.41 "cd /var/www/ecokuku && git pull origin main" && \
npm run build --workspace=apps/admin && \
rsync -avz --delete apps/admin/.next/ root@167.172.110.41:/var/www/ecokuku/apps/admin/.next/ && \
ssh root@167.172.110.41 "pm2 restart ecokuku-admin"
```

For web only:
```bash
cd /Users/joykwamboka/Desktop/EcoKuku && \
git add -A && git commit -m "deploy" && git push origin main && \
ssh root@167.172.110.41 "cd /var/www/ecokuku && git pull origin main" && \
npm run build --workspace=apps/web && \
rsync -avz --delete apps/web/.next/ root@167.172.110.41:/var/www/ecokuku/apps/web/.next/ && \
ssh root@167.172.110.41 "pm2 restart ecokuku-web"
```

For both apps:
```bash
cd /Users/joykwamboka/Desktop/EcoKuku && \
git add -A && git commit -m "deploy" && git push origin main && \
ssh root@167.172.110.41 "cd /var/www/ecokuku && git pull origin main" && \
npm run build --workspace=apps/admin && npm run build --workspace=apps/web && \
rsync -avz --delete apps/admin/.next/ root@167.172.110.41:/var/www/ecokuku/apps/admin/.next/ && \
rsync -avz --delete apps/web/.next/ root@167.172.110.41:/var/www/ecokuku/apps/web/.next/ && \
ssh root@167.172.110.41 "pm2 restart all"
```

---

## Useful server commands

Check if apps are running:
```bash
ssh root@167.172.110.41 "pm2 list"
```

View live logs:
```bash
ssh root@167.172.110.41 "pm2 logs --lines 50"
```

View admin logs only:
```bash
ssh root@167.172.110.41 "pm2 logs ecokuku-admin --lines 50 --nostream"
```

View web logs only:
```bash
ssh root@167.172.110.41 "pm2 logs ecokuku-web --lines 50 --nostream"
```

Check Nginx status:
```bash
ssh root@167.172.110.41 "systemctl status nginx --no-pager"
```

Restart Nginx:
```bash
ssh root@167.172.110.41 "systemctl restart nginx"
```

Check database:
```bash
ssh root@167.172.110.41 "sudo -u postgres psql -d ecokuku_prod -c '\dt'"
```

---

## Database credentials (production)

- Host: `localhost:5432`
- Database: `ecokuku_prod`
- User: `ecokuku`
- Password: `HsjS9l6@LigWfHap`
- URL (URL-encoded): `postgresql://ecokuku:HsjS9l6%40LigWfHap@localhost:5432/ecokuku_prod`

---

## Environment files location

- Admin: `/var/www/ecokuku/apps/admin/.env.local`
- Web: `/var/www/ecokuku/apps/web/.env.local`
- Prisma: `/var/www/ecokuku/packages/db/.env`
