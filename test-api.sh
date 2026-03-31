#!/bin/bash

# EcoKuku API Testing Script
# This script tests the admin API endpoints to verify they're working

echo "🧪 EcoKuku API Testing Suite"
echo "============================\n"

BASE_URL="http://localhost:3001"
WEB_URL="http://localhost:3000"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Testing Basic Connectivity${NC}"
echo "Testing Admin App: $BASE_URL"
curl -s -o /dev/null -w "Status: %{http_code}\n" $BASE_URL
echo ""

echo -e "${YELLOW}🔐 Testing Authentication${NC}"
echo "Test 1: Check if /api/batches requires authentication"
curl -s -w "Status: %{http_code}\n" -X GET "$BASE_URL/api/batches"
echo ""

echo -e "${YELLOW}📦 Testing Product API (Web)${NC}"
echo "Status: "
curl -s -o /dev/null -w "%{http_code}\n" $WEB_URL

echo ""
echo -e "${YELLOW}✅ Database Status${NC}"
echo "Checking Prisma connection..."
cd /Users/joykwamboka/Desktop/EcoKuku/packages/db
npx prisma db execute --stdin < /dev/null 2>&1 && echo "✅ Database Connected" || echo "❌ Database Connection Failed"

echo ""
echo -e "${YELLOW}🔑 Admin Credentials${NC}"
echo "Email: admin@ecokuku.local"
echo "Password: admin123"
echo ""
echo -e "${YELLOW}📝 Staff Credentials${NC}"
echo "Email: staff@ecokuku.local"  
echo "Password: staff123"
echo ""

echo -e "${GREEN}✨ Setup Complete!${NC}"
echo ""
echo "Next Steps:"
echo "1. Open http://localhost:3001 in your browser"
echo "2. Login with admin@ecokuku.local / admin123"
echo "3. Navigate to different pages to test functionality"
echo "4. Check browser console for errors"
echo ""
