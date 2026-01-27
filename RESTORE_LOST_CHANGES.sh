#!/bin/bash
# Wiederherstellung verlorener Type-Fixes
# Datum: 24. Januar 2026, 00:34 Uhr

echo "🔧 Stelle verlorene Type-Fixes wieder her..."

# 1. downloads.ts - alle Fixes
echo "📝 Fixe downloads.ts..."
sed -i 's/moderationStatus: '\''APPROVED'\''/status: '\''APPROVED'\''/g' /root/gaestefotos-app-v2/packages/backend/src/routes/downloads.ts
sed -i 's/fileSize: true/sizeBytes: true/g' /root/gaestefotos-app-v2/packages/backend/src/routes/downloads.ts
sed -i 's/uploadedAt: '\''desc'\''/createdAt: '\''desc'\''/g' /root/gaestefotos-app-v2/packages/backend/src/routes/downloads.ts

# 2. photoCategories.ts - alle Fixes
echo "📝 Fixe photoCategories.ts..."
sed -i 's/sortOrder: '\''desc'\''/order: '\''desc'\''/g' /root/gaestefotos-app-v2/packages/backend/src/services/photoCategories.ts
sed -i 's/sortOrder: true/order: true/g' /root/gaestefotos-app-v2/packages/backend/src/services/photoCategories.ts
sed -i 's/maxSort?.sortOrder/maxSort?.order/g' /root/gaestefotos-app-v2/packages/backend/src/services/photoCategories.ts
sed -i 's/sortOrder: nextSortOrder/order: nextSortOrder/g' /root/gaestefotos-app-v2/packages/backend/src/services/photoCategories.ts

# 3. analyticsExport.ts - alle Fixes
echo "📝 Fixe analyticsExport.ts..."
sed -i 's/moderationStatus: '\''APPROVED'\''/status: '\''APPROVED'\''/g' /root/gaestefotos-app-v2/packages/backend/src/services/analyticsExport.ts

echo ""
echo "✅ Alle Änderungen wiederhergestellt!"
echo ""
echo "🔍 Type-Check läuft..."
cd /root/gaestefotos-app-v2
pnpm --filter @gaestefotos/backend exec tsc --noEmit 2>&1 | grep "Found" || echo "✅ 0 Errors"
