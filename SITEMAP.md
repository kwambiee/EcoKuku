# 📍 EcoKuku Sitemap & Feature Roadmap

## 🛒 Customer Website (apps/web)

### Main Pages
- **`/`** - Homepage ✅
  - Hero section with CTA
  - Why Choose Us cards
  - Featured products slider
  - Discount promotion
  
- **`/shop`** - Shop ✅
  - Product grid with filters
  - Category sidebar
  - Order type filter (Retail/Wholesale)
  - Search capability (TODO)

- **`/shop/[slug]`** - Product Detail ✅
  - Product images gallery
  - Description & farm story
  - Availability status
  - Stock quantity
  - Add to cart / Pre-order buttons
  - Customer reviews section
  - Related products

- **`/journey`** - Farm Transparency ✅
  - 6-stage timeline
  - Stage descriptions & icons
  - Commitment checklist
  - Videos/farm images (TODO)

- **`/about`** - About Us ⏳
  - Farm history
  - Sustainability practices
  - Team introduction
  - Farm location map
  - Contact information

- **`/checkout`** - Checkout ✅
  - Order summary
  - Delivery details form
  - Promo code input
  - M-PESA payment button ✅
  - Order review

- **`/cart`** - Shopping Cart ✅
  - Cart items with images
  - Quantity editor
  - Remove item button
  - Cart totals
  - Continue shopping / Checkout buttons
  - Promo code application

- **`/orders/[id]`** - Order Tracking ⏳
  - Order status stepper
  - Item list
  - Delivery address
  - Driver info & contact
  - Real-time delivery location (TODO)
  - Order timeline

- **`/orders`** - Order History ⏳
  - List of customer's orders
  - Filter by status
  - Quick reorder button
  - Download invoice (TODO)

- **`/auth/login`** - Customer Login ✅
  - Email/phone input
  - Password input
  - Remember me option
  - Forgot password link (TODO)
  - Sign up redirect

- **`/auth/register`** - Sign Up ✅
  - Email input
  - Phone input
  - Name field
  - Password with strength meter ✅
  - Terms & conditions
  - Login redirect

- **`/account`** - Customer Account ✅
  - Profile information
  - Saved addresses (TODO)
  - Saved payment methods (TODO)
  - Order history quick access ✅
  - Referral code display (TODO)
  - Account settings (TODO)

- **`/referral`** - Referral Program ⏳
  - User's referral code
  - Share buttons (WhatsApp, Email, Copy)
  - Referral reward status
  - Referral history table
  - Reward redemption options

- **`/contact`** - Contact & Support ⏳
  - Contact form
  - Contact Info (phone, email, address)
  - Support tickets (TODO)
  - FAQs accordion

- **`/privacy`** - Privacy Policy ⏳
- **`/terms`** - Terms of Service ⏳
- **404** - Not Found (TODO)

---

## 👨‍💼 Admin Dashboard (apps/admin)

### Navigation Menu (Sidebar)
1. Dashboard
2. Incubation
3. Batches
4. Egg Production
5. Feed
6. Health
7. Inventory
8. Orders
9. Logistics
10. Customers
11. Reports
12. Settings

### Pages Built

- **`/dashboard`** - Overview ✅
  - 4 metric cards (Chickens, Eggs, Mortality, Orders)
  - Revenue card
  - Feed consumption card
  - Recent orders table
  - Quick stats widgets

### Pages to Build

#### Farm Management
- **`/batches`** - Batch List ✅
  - Batch grid with cards ✅
  - Status filter ✅
  - Quick actions (edit, view details) ✅
  - Create batch button ✅

- **`/batches/[id]`** - Batch Detail ⏳
  - Batch info card
  - Growth chart
  - Mortality log table
  - Feed consumption log
  - Health status section
  - Edit batch modal

- **`/batches/new`** - Create Batch ⏳
  - Batch type selection
  - Start date picker
  - Quantity input
  - Notes field

- **`/incubation`** - Incubation Management ⏳
  - Incubation batch list
  - Temperature log chart
  - Humidity log chart
  - Hatch rate progress
  - Create new batch button

- **`/incubation/[id]`** - Incubation Detail ⏳
  - Temperature graph (7-day)
  - Humidity graph (7-day)
  - Hatch progress tracker
  - Manual log entry form
  - Expected hatch date

#### Production
- **`/eggs`** - Egg Production ⏳
  - Daily collection form
  - Production logs table
  - 7-day trend chart
  - Weekly totals
  - Quality breakdown

- **`/eggs/reports`** - Egg Reports ⏳
  - Weekly/monthly charts
  - Defect rate trends
  - Production per batch
  - Export to PDF/CSV

#### Operations
- **`/feed`** - Feed Management ⏳
  - Stock level cards
  - Low stock alerts
  - Consumption log table
  - Add stock form
  - Cost tracking

- **`/feed/stock`** - Feed Stock ⏳
  - Feed inventory
  - Purchase history
  - Stock adjustments
  - Supplier info

- **`/health`** - Health & Vaccination ⏳
  - Vaccination calendar
  - Scheduled vaccinations table
  - Disease log section
  - Vet visit notes
  - Mark vaccination complete

- **`/inventory`** - Inventory ⏳
  - Eggs ready for sale
  - Chickens ready for market
  - Feed stock levels
  - Low stock alerts
  - Inventory value

#### Sales & Customers
- **`/orders`** - Order Management ✅
  - All orders table ✅
  - Filter by type (Retail/Wholesale/Pre-order) ✅
  - Filter by status ✅
  - Date range picker (TODO)
  - Quick actions (view, fulfill, cancel) ✅

- **`/orders/[id]`** - Order Detail ⏳
  - Customer info
  - Items list
  - Payment status
  - Delivery address
  - Driver assignment dropdown
  - Status update buttons
  - Order notes

- **`/logistics`** - Delivery Management ⏳
  - Delivery calendar
  - Today's deliveries list
  - Driver list
  - Active delivery map (TODO)
  - Delivery status updates

- **`/customers`** - Customer Management ✅
  - Customer list table ✅
  - Search by name/phone ✅
  - Order count column ✅
  - Total spend column ✅
  - Quick view button ✅

- **`/customers/[id]`** - Customer Profile ⏳
  - Customer info
  - Order history
  - Contact details
  - Referral info
  - Saved addresses
  - Notes

#### Analytics
- **`/reports`** - Reports & Analytics ⏳
  - Revenue chart (daily/monthly)
  - Sales by product type
  - Top products table
  - Customer acquisition
  - Export options

- **`/reports/production`** - Production Efficiency ⏳
  - Egg yield per batch
  - Mortality rate trend
  - Feed conversion ratio (FCR)
  - Growth rate chart
  - Batch comparison

#### Settings
- **`/settings`** - Settings ⏳
  - Delivery areas & fees
  - Promo code management
  - User account settings
  - Password change
  - API integrations (M-PESA, SMS)
  - Backup options

---

## 🎯 Feature Matrix

### E-Commerce Features
| Feature | Status | Priority |
|---------|--------|----------|
| Product browsing | ✅ | P1 |
| Shopping cart | ✅ | P1 |
| Checkout flow | ✅ | P1 |
| Payment (M-PESA) | ✅ | P1 |
| Order tracking | ⏳ | P1 |
| Product reviews | ✅ | P2 |
| Referral system | ⏳ | P2 |
| Wishlist | ⏳ | P3 |
| User authentication | ✅ | P1 |

### Admin Features
| Feature | Status | Priority |
|---------|--------|----------|
| Batch lifecycle | ✅ | P1 |
| Egg production logs | ⏳ | P1 |
| Order fulfillment | ✅ | P1 |
| Delivery assignment | ⏳ | P1 |
| Reports & analytics | ⏳ | P1 |
| Health tracking | ⏳ | P2 |
| Feed optimization | ⏳ | P2 |
| Customer management | ✅ | P2 |

### Backend & Integration Features
| Feature | Status | Priority |
|---------|--------|----------|
| Product API | ✅ | P1 |
| Order API | ✅ | P1 |
| M-PESA integration | ✅ | P1 |
| SMS notifications | ✅ | P1 |
| Email notifications | ✅ | P1 |
| Admin APIs | ✅ | P1 |
| Image upload | ⏳ | P2 |
| Batch/Feed APIs | ✅ | P1 |

---

## 📈 Implementation Progress

```
🏗️  FOUNDATION PHASE      ████████████████████ 100%
   ├─ Monorepo setup        ✅
   ├─ Database schema       ✅
   ├─ UI components         ✅
   └─ Project structure     ✅

📘 DEVELOPMENT PHASE      ███████████████░░░░░  75%
   ├─ API routes           [████████████████████ 100%] ✅
   ├─ Authentication       [████████████████████ 100%] ✅
   ├─ Customer pages       [████████████░░░░░░░░ 65%]
   └─ Admin pages          [████████░░░░░░░░░░░░ 40%]

🚀 INTEGRATION PHASE      ██████████░░░░░░░░░░  50%
   ├─ M-PESA payment       [████████████████████ 100%] ✅
   ├─ SMS notifications    [████████████████████ 100%] ✅
   └─ Email system         [████████████████████ 100%] ✅

🎯 OPTIMIZATION PHASE     ░░░░░░░░░░░░░░░░░░░░   0%
   ├─ Performance tuning   [░░░░░░░░░░░░░░░░░░░░  0%]
   ├─ SEO optimization     [░░░░░░░░░░░░░░░░░░░░  0%]
   └─ Testing & QA         [░░░░░░░░░░░░░░░░░░░░  0%]
```

---

**Legend**: ✅ Done | ⏳ Planned | [████░░░░░░░░] Progress

---

**Last Updated**: March 20, 2026  
**Current Milestone**: Build remaining customer & admin pages (20 pages)  
**Completion Target**: 95% by end of next session
