# 🚀 EcoKuku Quick Start

## Getting Started in 5 Minutes

### 1️⃣ Prerequisites
- Node.js 18+ (`node --version`)
- PostgreSQL 12+ (create empty `ecokuku_dev` database)
- Git

### 2️⃣ Install & Setup
```bash
cd /Users/joykwamboka/Desktop/EcoKuku

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local - Set DATABASE_URL to your PostgreSQL
nano .env.local
# DATABASE_URL="postgresql://user:pass@localhost:5432/ecokuku_dev"
```

### 3️⃣ Setup Database
```bash
# Sync schema
npm run db:push

# Add sample data
npm run db:seed
```

### 4️⃣ Start Development
```bash
# In one terminal - starts both apps on ports 3000 & 3001
npm run dev

# Or separately:
# Terminal 1: Customer site
cd apps/web && npm run dev

# Terminal 2: Admin dashboard
cd apps/admin && npm run dev
```

### 5️⃣ Access Apps
- 🛒 **Customer**: http://localhost:3000
- 👨‍💼 **Admin**: http://localhost:3001

---

## 📂 Project Structure

```
ecokuku/
├── packages/
│   ├── db/        # 💾 Prisma schema & client
│   └── ui/        # 🎨 Shared React components
├── apps/
│   ├── web/       # 🛒 Customer website (Next.js)
│   └── admin/     # 👨‍💼 Admin dashboard (Next.js)
└── [config files omitted for brevity]
```

## 🔓 Test Accounts

After seeding, use these to test:

**Admin/Staff Login** (Coming Soon)
- Email: `admin@ecokuku.local`
- Password: `hashed_password_admin`

**Customer Login** (Coming Soon)
- Email: `joy@example.com`
- Password: `hashed_password_1`

## 📊 Database Overview

The Prisma schema includes models for:
- 👥 Users (with roles)
- 🛒 Products, Orders, Cart
- 🐔 Batches, Incubation, Eggs
- 🌽 Feed, Health, Vaccinations
- 🚚 Logistics, Delivery
- ⭐ Reviews

Use `npm run db:studio` to explore the database GUI.

## 🛠 Common Commands

```bash
npm run dev          # Start all dev servers
npm run build        # Build for production
npm run lint         # Check code quality
npm run format       # Auto-format code
npm run db:push      # Sync schema changes
npm run db:seed      # Reset & seed data
npm run db:studio    # Open Prisma Studio GUI
```

## 🐛 Troubleshooting

**Port 3000 in use?**
```bash
PORT=3002 npm run dev
```

**Database connection failed?**
```bash
# Check PostgreSQL is running
# Check DATABASE_URL is correct in .env.local
npm run db:push  # This validates the connection
```

**Node modules issues?**
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📚 Full Documentation

- 📖 [README.md](./README.md) - Complete project overview
- 🔧 [DEVELOPMENT.md](./DEVELOPMENT.md) - Detailed dev guide
- 📋 Implementation tracker (see: ecokuku_implementation_tracker.html)

---

**Status**: ✅ Foundation Complete (Monorepo, DB, UI, Basic Pages)  
**Next**: API Routes, Authentication, Payment Integration
