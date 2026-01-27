#!/bin/bash
# Beende ALLE hängenden Prozesse und starte Backend

echo "🛑 Beende alle Backend-Prozesse..."

# Finde und beende ALLE tsx/node Prozesse
pkill -9 -f "tsx watch"
pkill -9 -f "tsx.*index.ts"
pkill -9 -f "pnpm.*dev.*backend"
pkill -9 -f "node.*backend"

# Warte
sleep 3

echo "🧹 Cleanup..."
cd /root/gaestefotos-app-v2/packages/backend
rm -rf .tsx-cache dist

echo "🚀 Starte Backend..."
pnpm dev
