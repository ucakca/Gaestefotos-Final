#!/bin/bash
# Finale Fixes für analytics.ts und downloads.ts
# BITTE DATEIEN VORHER SCHLIESSEN!

cd /root/gaestefotos-app-v2/packages/backend

echo "🔧 Fixe downloads.ts..."

# 1. Entferne doppelte event Deklaration (Zeilen 30-37 löschen, aber nicht 38-45)
sed -i '30,37d' src/routes/downloads.ts

# 2. getStream gibt es nicht - nutze URL statt storagePath
sed -i 's/storageService\.getStream(photo\.storagePath)/storageService.getStream(photo.url)/g' src/routes/downloads.ts

# 3. Ersetze hasEventManageAccess in stats route
sed -i '185,188d' src/routes/downloads.ts
sed -i '184a\    const event = await prisma.event.findFirst({\
      where: { \
        id: eventId,\
        OR: [\
          { hostId: req.userId },\
          { members: { some: { userId: req.userId } } }\
        ]\
      }\
    });\
    \
    if (!event) {\
      return res.status(404).json({ error: '\''Event nicht gefunden'\'' });\
    }' src/routes/downloads.ts

echo "✅ downloads.ts gefixt"
echo ""
echo "🔍 Type-Check..."
cd /root/gaestefotos-app-v2
pnpm --filter @gaestefotos/backend exec tsc --noEmit 2>&1 | grep -E "analytics.ts|downloads.ts" | head -10 || echo "✅ Alle Errors behoben"
