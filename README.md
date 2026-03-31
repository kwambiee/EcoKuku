# 🐔 EcoKuku - Poultry Farm Platform

A comprehensive farm management and e-commerce platform for poultry farming in Kenya. Built with Next.js, Prisma, and Turbo.

**Status**: 🚀 Development in Progress

## 📋 Project Structure

```
ecokuku/
├── apps/
│   ├── web/          # Customer-facing e-commerce (Next.js)
│   └── admin/        # Farm management dashboard (Next.js)
├── packages/
│   ├── db/           # Prisma schema & database client
│   └── ui/           # Shared React components (shadcn/ui)
├── package.json      # Root workspace config
├── turbo.json        # Turbo build pipeline
└── .env.example      # Environment variables template
```

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Build System**: Turbo monorepo
- **Authentication**: NextAuth.js with role-based access
- **Payments**: M-PESA via Daraja API
- **SMS**: Africa's Talking

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 12+
- Accounts for: M-PESA Daraja API, Africa's Talking

### Installation

1. **Clone & Install Dependencies**
   ```bash
   cd /Users/joykwamboka/Desktop/EcoKuku
   npm install
   ```

2. **Setup Environment Variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Database Setup**
   ```bash
   # Create migrations
   npm run db:push

   # Seed with sample data
   npm run db:seed

   # Open Prisma Studio (optional)
   npm run db:studio
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

   Apps will be available at:
   - **Customer Site**: http://localhost:3000
   - **Admin Dashboard**: http://localhost:3001

## 📦 Workspace Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development |
| `npm run build` | Build all apps for production |
| `npm run lint` | Lint all apps |
| `npm run db:push` | Sync Prisma schema with database |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run format` | Format all code with Prettier |

## 🗂 Detailed Structure

### `packages/db` - Database Layer
- Prisma schema with 25+ models
- Models include Users, Products, Orders, Batches, Incubation, Feed, Health, Vaccinations, etc.
- Singleton Prisma client exported for all apps
- Seed script with realistic farm data

**Models Overview**:
- **Auth & Users**: User, Address, UserRole
- **Products & Inventory**: Product, ProductType, ProductCategory
- **Orders & Sales**: Order, OrderItem, OrderType, OrderStatus, Promo
- **Farm Management**: Batch, IncubationBatch, EggProduction, MortalityLog, GrowthLog
- **Logistics**: Driver, Delivery, DeliveryStatus
- **Health**: Vaccination, HealthEvent, VaccinationSchedule
- **Feed**: FeedType, FeedStock, FeedLog
- **Reviews**: Review model for product ratings

### `packages/ui` - Shared Components
- React component library with shadcn/ui
- Shared utilities and hooks
- Exported for use in both web and admin apps

### `apps/web` - Customer Website
- Homepage with hero, featured products, farm journey
- Shop with category filters and product cards
- Product detail pages
- Cart & checkout with M-PESA payment
- Order tracking
- Customer account & order history
- Referral system
- Reviews

**Pages**:
- `/` - Home
- `/shop` - Browse products
- `/shop/[slug]` - Product details
- `/checkout` - Payment & delivery
- `/journey` - Farm transparency timeline
- `/orders/[id]` - Order tracking
- `/auth/login` - Authentication
- `/referral` - Referral rewards

### `apps/admin` - Farm Dashboard
- Dashboard with metrics and charts
- **Incubation Management**: Temperature/humidity logs, hatch rate tracking
- **Batch Management**: Birth-to-market lifecycle tracking, mortality, growth, feed
- **Egg Production**: Daily collection logs, quality grading, trends
- **Feed Management**: Stock levels, consumption logs, cost tracking
- **Health & Vaccination**: Schedule calendars, disease logs, vaccination history
- **Orders & Sales**: Retail, wholesale, pre-order management
- **Logistics**: Delivery scheduling, driver assignment
- **Customers**: Customer list, referral tracking
- **Reports**: Production efficiency, profit margins, sales trends

**Pages**:
- `/dashboard` - Overview with metrics
- `/batches` - Batch grid and lifecycle
- `/incubation` - Hatchery management
- `/eggs` - Egg production logs
- `/feed` - Stock and consumption
- `/health` - Vaccination calendar
- `/orders` - Sales management
- `/logistics` - Delivery scheduling
- `/customers` - Customer management
- `/reports` - Analytics & reports

## 📊 Database Schema Highlights

### Core Models
- **User**: Supports CUSTOMER, ADMIN, STAFF roles
- **Product**: SKU tracking, wholesale pricing, inventory
- **Order**: Retail/Wholesale/Pre-order types with status tracking
- **Batch**: Chicken lifecycle from chick to market
- **IncubationBatch**: Egg incubation with temperature/humidity logs
- **EggProduction**: Daily collection with quality metrics
- **Vaccination**: Scheduled and logged, with veterinarian tracking
- **HealthEvent**: Disease, treatment, and vet visit logs
- **Driver & Delivery**: Route and delivery management
- **Promo**: Percentage and fixed-value discount codes

## 🔐 Authentication

- NextAuth.js with password-based credentials provider
- JWT tokens with role information
- Protected API routes with role-based access control
- Admin/Staff bypass for development

## 💳 M-PESA Integration

- Daraja API for STK Push (payment popup)
- Callback handler for payment confirmation
- Order status updates on successful payment
- Test mode support with configurable phone

## 📱 SMS Notifications

- Africa's Talking integration
- Order confirmations
- Delivery updates
- Promotional messages

## 🎯 Features Roadmap

### Phase 1 ✅
- [x] Monorepo setup
- [x] Database schema
- [x] Seed data

### Phase 2 (In Progress)
- [ ] Shared UI components
- [ ] Customer website
- [ ] Admin dashboard
- [ ] Authentication

### Phase 3
- [ ] API routes
- [ ] M-PESA payment
- [ ] SMS notifications
- [ ] Reports & analytics

## 🤝 Development Workflow

1. Create feature branch: `git checkout -b feature/feature-name`
2. Make changes across packages as needed
3. Run tests: `npm run lint`
4. Format code: `npm run format`
5. Commit & push
6. Open PR

## 📝 Environment Variables

See `.env.example` for the complete list. Key variables:

```env
DATABASE_URL=              # PostgreSQL connection
NEXTAUTH_SECRET=           # JWT secret (32+ chars)
NEXTAUTH_URL=              # Origin URL for auth
MPESA_CONSUMER_KEY=        # Daraja API credentials
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
AT_API_KEY=                # Africa's Talking SMS
AT_USERNAME=
```

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env.local
- Run `npx prisma db push` to validate schema

### Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Clean turbo cache: `npx turbo prune --scope=@ecokuku/web --docker`

### Port Conflicts
- Web app port: `PORT=3000`
- Admin app port: `PORT=3001`

## 📚 Additional Resources

- [Prisma Docs](https://www.prisma.io/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Turbo Monorepo](https://turbo.build/)
- [M-PESA API Docs](https://developer.safaricom.co.ke/)
- [Africa's Talking API](https://africastalking.com/)

## 📄 License

MIT

---

**Last Updated**: March 2024
**Maintained by**: EcoKuku Team
