#!/bin/bash
# Sauberer Backend-Start

cd /root/gaestefotos-app-v2/packages/backend

echo "🧹 Cleanup..."
# Cache löschen
rm -rf .tsx-cache dist

# Alte Prozesse killen
pkill -9 -f "tsx.*backend"
pkill -9 -f "schema-engine"

echo "⏳ Warte 2 Sekunden..."
sleep 2

echo "🚀 Starte Backend..."
pnpm dev
