# EcoKuku — Poultry Farm Platform

A full-stack farm management and e-commerce platform for poultry farming in Nairobi, Kenya. Customers can order products, book batches of chicks to rear, and track their flock's growth and health in real time.

**Status**: ✅ Functional — both apps running

---

## Project Structure

```
ecokuku/
├── apps/
│   ├── web/          # Customer-facing site   → http://localhost:3000
│   └── admin/        # Farm management dashboard → http://localhost:3001
├── packages/
│   ├── db/           # Prisma schema, client & seed
│   └── ui/           # Shared React components
├── package.json      # Root workspace config
└── turbo.json        # Turbo build pipeline
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+ running locally

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Each app has its own `.env.local`. The defaults below work for local development with the standard PostgreSQL setup.

**`apps/web/.env.local`**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ecokuku_dev"
NEXTAUTH_SECRET="xRaMCK6uRBRBil6CExEX+zPFcIKoFxgxy9KneAE8mgo="
NEXTAUTH_URL="http://localhost:3000"
```

**`apps/admin/.env.local`**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ecokuku_dev"
NEXTAUTH_SECRET="ecokuku_admin_secret_key_min_32_chars_required_nextauth"
NEXTAUTH_URL="http://localhost:3001"
```

### 3. Set up the database

```bash
# Push the schema to your local PostgreSQL database
DATABASE_URL="postgresql://postgres:password@localhost:5432/ecokuku_dev" \
  npx prisma db push --schema packages/db/prisma/schema.prisma

# Seed with test data (users, products, batches, orders)
npx ts-node packages/db/prisma/seed.ts
```

### 4. Start the apps

You can start both at once or individually:

**Both apps together:**
```bash
npm run dev
```

**Customer app only (port 3000):**
```bash
npm run dev --workspace=apps/web
```

**Admin app only (port 3001):**
```bash
npm run dev --workspace=apps/admin
```

---

## Test Credentials

> These are created by the seed script above.

### Customer App — http://localhost:3000/auth/login

| Name | Email | Password |
|------|-------|----------|
| Joy Kwamboka | `joy@example.com` | `joy123` |
| Sarah Kipchoge | `sarah@example.com` | `sarah123` |

### Admin App — http://localhost:3001/login

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@ecokuku.local` | `admin123` |
| Staff | `staff@ecokuku.local` | `staff123` |

---


export DATABASE_URL="postgresql://ecokuku:HsjS9l6%40LigWfHap@localhost:5432/ecokuku_prod"

./node_modules/.bin/prisma db execute \
  --schema=packages/db/prisma/schema.prisma \
  --stdin <<'SQL'
INSERT INTO "User" (id, name, email, password, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Joy Kwamboka',
  'joy.kwamboka@kwambokapoultry.co.ke',
  '$2a$10$BEyUISbMFPWF7poTk2X1X.yqwrkJ4RtRsGrVyLliTo1BHMuHM2T6q',
  'ADMIN',
  true,
  NOW(),
  NOW()
);
INSERT INTO "User" (id, name, email, password, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Chris',
  'chris@kwambokapoultry.co.ke',
  '$2a$10$BEyUISbMFPWF7poTk2X1X.yqwrkJ4RtRsGrVyLliTo1BHMuHM2T6q',
  'ADMIN',
  true,
  NOW(),
  NOW()
);
SQL


## Customer App Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero, featured products, batch booking CTA |
| Shop | `/shop` | Products with category filters |
| Product Detail | `/shop/[id]` | Reviews, stock, add to cart |
| Cart | `/cart` | Quantity control, promo codes |
| Checkout | `/checkout` | Delivery form, M-PESA payment |
| Orders | `/orders` | Order history |
| Order Detail | `/orders/[id]` | Status timeline, items, totals |
| Book a Batch | `/batches` | Available chick batches for rearing |
| Batch Detail | `/batches/[id]` | Reserve chicks, pay deposit |
| My Flock | `/my-flock` | Lifecycle tracker for booked batches |
| Farm Journey | `/journey` | How the farm works |
| About | `/about` | Farm story, values, contact form |
| Account | `/account` | Profile, order history |

---

## Admin App Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/dashboard` | Live metrics, recent orders, alerts |
| Batches | `/batches` | Batch lifecycle management |
| Batch Bookings | `/batch-bookings` | Customer pre-orders, status updates |
| Incubation | `/incubation` | Hatchery and egg incubation logs |
| Egg Production | `/eggs` | Daily egg collection records |
| Feed | `/feed` | Feed stock and consumption |
| Health | `/health` | Vaccination schedules and history |
| Inventory | `/inventory` | Product stock levels |
| Orders | `/orders` | Customer order management |
| Logistics | `/logistics` | Deliveries and driver assignment |
| Customers | `/customers` | Customer directory |
| Reports | `/reports` | Sales analytics |
| Settings | `/settings` | Farm info and preferences |

---

## Key Feature: Batch Booking & Lifecycle Tracking

1. **Admin** opens a batch for booking via the Batches page (toggle `isOpenForBooking`, set `pricePerChick` and `maxBookings`)
2. **Customer** browses `/batches`, selects a batch, and pays a 30% deposit via M-PESA
3. **Admin** sees the booking on `/batch-bookings` and progresses its status: `CONFIRMED → GROWING → READY → COMPLETED`
4. **Admin** logs vaccinations (`/health`) or growth measurements (`/batches/[id]`) — this automatically pushes an update to each customer's **My Flock** feed
5. **Customer** checks `/my-flock` to see age in days, current weight, last vaccination, and a chronological updates feed

---

## Workspace Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps for production |
| `npm run lint` | Lint all packages |
| `npm run db:push` | Sync Prisma schema with the database |
| `npm run db:seed` | Seed the database with sample data |
| `npm run db:studio` | Open Prisma Studio GUI |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (JWT, role-based) |
| State | Zustand (cart) |
| Monorepo | Turborepo |
| Payments | M-PESA Daraja API (STK Push) |
| SMS | Africa's Talking |

---

## Environment Variables Reference

| Variable | App | Description |
|----------|-----|-------------|
| `DATABASE_URL` | both | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | both | JWT signing secret (32+ chars) |
| `NEXTAUTH_URL` | both | App origin URL |
| `MPESA_CONSUMER_KEY` | web | Daraja API key |
| `MPESA_CONSUMER_SECRET` | web | Daraja API secret |
| `MPESA_BUSINESS_SHORT_CODE` | web | M-PESA business shortcode |
| `MPESA_PASSKEY` | web | M-PESA passkey |
| `MPESA_ENVIRONMENT` | web | `sandbox` or `production` |
| `AFRICAS_TALKING_API_KEY` | web | SMS API key |
| `AFRICAS_TALKING_USERNAME` | web | SMS account username |

---

## Troubleshooting

**Port already in use**
```bash
# Kill whatever is on port 3000 or 3001
kill $(lsof -ti :3000)
kill $(lsof -ti :3001)
```

**Database connection error**
```bash
# Confirm PostgreSQL is running
pg_isready -h localhost -p 5432

# Re-push the schema
DATABASE_URL="postgresql://postgres:password@localhost:5432/ecokuku_dev" \
  npx prisma db push --schema packages/db/prisma/schema.prisma
```

**Prisma client out of date after schema changes**
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/ecokuku_dev" \
  npx prisma generate --schema packages/db/prisma/schema.prisma
```

**Clean reinstall**
```bash
rm -rf node_modules apps/web/node_modules apps/admin/node_modules packages/db/node_modules
npm install
```

---

**Last Updated**: June 2026
