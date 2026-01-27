#!/bin/bash
# Deployment Commands - From Root Directory
# Run from: /root/gaestefotos-app-v2

echo "🚀 Deployment Script"
echo "===================="

# 1. Backend: Prisma Migration
echo ""
echo "📦 Step 1: Database Migration..."
cd /root/gaestefotos-app-v2/packages/backend
npx prisma migrate deploy
npx prisma generate

# 2. Backend: Build & Start
echo ""
echo "🔧 Step 2: Building Backend..."
cd /root/gaestefotos-app-v2/packages/backend
pnpm build

# 3. Frontend: Build (optional, already built)
echo ""
echo "🎨 Step 3: Frontend already built ✓"

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "📝 Next steps:"
echo "   - Backend service should be restarted to load new code"
echo "   - Frontend is already running on port 3000"
echo "   - Redis: Set REDIS_ENABLED=true in .env if desired"
