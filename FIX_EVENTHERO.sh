#!/bin/bash
cd /root/gaestefotos-app-v2/packages/frontend/src/components/e3

# Start fresh from V0 original
cp /root/gaestefotos-app-v2/v0-event-guest-gallery-main/components/event/event-hero.tsx EventHero.tsx

# 1. Fix imports
sed -i 's|"use client";|'\''use client'\'';|' EventHero.tsx
sed -i 's|import Image from "next/image";||' EventHero.tsx
sed -i 's|import { cn } from "@/lib/utils";||' EventHero.tsx
sed -i '4a import { Event as EventType } from '\''@gaestefotos/shared'\'';' EventHero.tsx
sed -i 's|@/components/ui/button|@/components/ui/Button|' EventHero.tsx

# 2. Fix export
sed -i 's|export function EventHero|export default function EventHero|' EventHero.tsx

echo "✅ EventHero.tsx fixed!"
