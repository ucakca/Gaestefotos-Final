#!/bin/bash
set -e

echo "🔧 Starting FINAL EventHero fix..."

cd /root/gaestefotos-app-v2/packages/frontend/src/components/e3

# 1. Fresh copy from V0
cp /root/gaestefotos-app-v2/v0-event-guest-gallery-main/components/event/event-hero.tsx EventHero.tsx

# 2. Fix imports (line by line to avoid errors)
sed -i "1s/.*/'\''use client'\'';/" EventHero.tsx
sed -i '/import Image from "next\/image";/d' EventHero.tsx
sed -i '/import { cn } from/d' EventHero.tsx
sed -i '4a import { Event as EventType } from '\''@gaestefotos/shared'\'';' EventHero.tsx
sed -i 's|@/components/ui/button|@/components/ui/Button|g' EventHero.tsx

# 3. Change interface name to export
sed -i 's/^interface EventHeroProps/export interface EventHeroProps/' EventHero.tsx

# 4. Extend interface with API props
sed -i '/^export interface EventHeroProps {/a\  event: EventType;' EventHero.tsx

# 5. Change export function to default
sed -i 's/^export function EventHero/export default function EventHero/' EventHero.tsx

echo "✅ EventHero.tsx fixed successfully!"
echo "📝 Now building..."

cd /root/gaestefotos-app-v2/packages/frontend
NODE_ENV=production pnpm build 2>&1 | tail -n 15
