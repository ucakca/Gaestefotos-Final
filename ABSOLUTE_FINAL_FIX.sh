#!/bin/bash
set -e
cd /root/gaestefotos-app-v2/packages/frontend/src/components/e3

# Fresh start
cp /root/gaestefotos-app-v2/v0-event-guest-gallery-main/components/event/event-hero.tsx EventHero.tsx

# Line-by-line fixes
sed -i "1s/.*/'use client';/" EventHero.tsx
sed -i '/^import Image from/d' EventHero.tsx
sed -i '/^import { cn }/d' EventHero.tsx
sed -i '5i import { Event as EventType } from '"'"'@gaestefotos/shared'"'"';' EventHero.tsx
sed -i 's|ui/button|ui/Button|g' EventHero.tsx
sed -i 's/^interface EventHeroProps/export interface EventHeroProps/' EventHero.tsx
sed -i '/^export interface EventHeroProps {/a\  event: EventType;' EventHero.tsx
sed -i 's/^export function EventHero/export default function EventHero/' EventHero.tsx

echo "✅ Done"
