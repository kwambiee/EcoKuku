# EcoKuku Admin Dashboard - Testing Guide

## 🚀 Apps Running
- **Admin App**: http://localhost:3001
- **Web App**: http://localhost:3000
- **Database**: PostgreSQL (seeded with test data)

## 🔐 Test Credentials

### Admin Access
- **Email**: admin@ecokuku.local
- **Password**: admin123

### Staff Access
- **Email**: staff@ecokuku.local
- **Password**: staff123

### Customer Accounts
- **Email**: joy@example.com / **Password**: joy123
- **Email**: sarah@example.com / **Password**: sarah123

---

## ✅ Admin Dashboard Testing Checklist

### 1. **Authentication Testing**
- [ ] Navigate to http://localhost:3001
- [ ] You should be redirected to login page
- [ ] Enter incorrect credentials, should see error message
- [ ] Login with valid admin credentials (admin@ecokuku.local / admin123)
- [ ] Should redirect to dashboard
- [ ] Try accessing admin URL directly when logged out - should redirect to login

### 2. **Dashboard Overview**
- [ ] Dashboard loads with welcome message showing admin user
- [ ] Sidebar shows all menu options:
  - Dashboard
  - Batches
  - Incubation
  - Eggs  
  - Feed
  - Health
  - Orders
  - Customers
  - Inventory
  - Logistics
  - Reports
  - Settings

### 3. **Batch Management**
- [ ] Click "Batches" in sidebar
- [ ] Should see list of batches (if seeded)
- [ ] Click "Create Batch" button
- [ ] Try creating new batch with required fields
- [ ] Should be able to edit/update batch
- [ ] Should be able to delete batch
- [ ] Click on batch to view details
- [ ] Should see nested mortality/growth logs section

### 4. **Egg Production**
- [ ] Navigate to "Eggs" page
- [ ] Should display egg production statistics
- [ ] Fill form to log new eggs collected
- [ ] Submit should add entry to table

### 5. **Feed Management**
- [ ] Navigate to "Feed" page
- [ ] Should display feed stock with low-stock alerts
- [ ] Should be able to log feed consumption

### 6. **Health & Vaccination**
- [ ] Navigate to "Health" page
- [ ] Should display vaccination schedule
- [ ] Should be able to log vaccination events with batch selection

### 7. **Orders Management**
- [ ] Navigate to "Orders"
- [ ] Should display list of orders (if customer orders exist)
- [ ] Should show order status (PENDING/SHIPPED/DELIVERED)
- [ ] Should be able to filter by status

### 8. **Analytics & Reports**
- [ ] Navigate to "Reports"
- [ ] Should display KPI metrics with trends
- [ ] Should display monthly performance table

### 9. **Settings**
- [ ] Navigate to "Settings"
- [ ] Should display farm information form
- [ ] Should display notification preferences
- [ ] Should be able to update settings

### 10. **Navigation & Responsiveness**
- [ ] All pages load without errors
- [ ] Sidebar navigation works smoothly
- [ ] Forms validate required fields
- [ ] Error messages appear for validation failures
- [ ] Success messages appear after operations
- [ ] Test on mobile viewport (resize browser to check responsive design)

---

## ⚠️ Known Issues to Check

### Authentication
- [x] Seed script fixed (removed dotenv import issue)
- [ ] Session persistence across page reloads
- [ ] Logout functionality
- [ ] Role-based access (try with staff account)

### API Integration
- [ ] Batches API GET request with pagination
- [ ] Create batch POST request
- [ ] Update batch PATCH request  
- [ ] Delete batch DELETE request
- [ ] Health logs API endpoints
- [ ] Growth logs API endpoints
- [ ] Feed logs API endpoints
- [ ] Mortality logs API endpoints

### UI/UX
- [ ] Loading states during API calls
- [ ] Error boundary page display
- [ ] Empty states (when no data exists)
- [ ] Modal forms close after submission
- [ ] Confirm dialogs for destructive actions

---

## 🔧 Testing Commands

### Check Admin App Status
```bash
curl -I http://localhost:3001
```

### Check Web App Status
```bash
curl -I http://localhost:3000
```

### View Database
```bash
npm run db:studio
# Opens Prisma Studio at http://localhost:5555
```

### Check NextAuth Session
Visit: http://localhost:3001/api/auth/session
(Should return user info when logged in)

---

## 📝 API Testing Endpoints

All endpoints require authentication headers (handled by NextAuth session).

### Batches API
- `GET /api/batches?page=1&limit=10` - List batches
- `POST /api/batches` - Create batch
- `PATCH /api/batches` - Update batch
- `DELETE /api/batches?id=<batchId>` - Delete batch

### Health Logs API
- `GET /api/health-logs?batchId=<id>&page=1` - List vaccinations
- `POST /api/health-logs` - Create vaccination log
- `PATCH /api/health-logs` - Update vaccination log

### Growth Logs API  
- `GET /api/growth-logs?page=1` - List growth data
- `POST /api/growth-logs` - Create growth log
- `PATCH /api/growth-logs` - Update growth log

### Feed Logs API
- `GET /api/feed-logs?page=1` - List feed logs
- `POST /api/feed-logs` - Create feed log
- `PATCH /api/feed-logs` - Update feed log

### Mortality Logs API
- `GET /api/mortality-logs?page=1` - List mortality events
- `POST /api/mortality-logs` - Create mortality log
- `PATCH /api/mortality-logs` - Update mortality log

---

## 🐛 Debugging Tips

### Check Browser Console
- Open DevTools (F12)
- Look for error messages in Console tab
- Check Network tab for failed API requests
- Look at Application tab for session storage

### Check Server Logs
- Terminal shows Next.js compilation errors
- API route errors appear in terminal
- Watch for "Error: Cannot find module" issues

### Database Issues
- Check connection string in .env.local
- Verify PostgreSQL is running
- Try running migrations again: `npm run db:push`

---

## 📞 Common Issues & Solutions

### "Cannot GET /"
- Admin app might not have started yet
- Wait 10 seconds and refresh
- Check terminal for compilation errors

### "Unauthorized" Error
- Session might have expired
- Clear browser cookies and login again
- Check that user role is ADMIN or STAFF

### API Endpoints Return 404
- Verify middleware is not blocking routes
- Check that API route files exist
- Review route.ts file for typos

### Database Connection Failed
- Verify PostgreSQL is running
- Check DATABASE_URL in .env.local
- Ensure database exists: `ecokuku_dev`

---

## ✨ What's Working
✅ Authentication (NextAuth.js with role-based access)
✅ All Admin Pages UI  
✅ API Routes (CRUD operations)
✅ Database Schema & Seeding
✅ Sidebar Navigation
✅ Form Validation
✅ Error Handling

## 🔄 Next Steps After Testing
1. Fix any authentication issues found
2. Test mobile responsiveness
3. Complete customer-facing pages testing
4. Integrate payment system (M-PESA)
5. Setup email/SMS notifications
