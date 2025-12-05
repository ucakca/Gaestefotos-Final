#!/bin/bash

# Gästefotos V2 - Service Restart Script
# Führt alle Services neu, um morgen weiterarbeiten zu können

echo "🚀 Starte Gästefotos V2 Services..."

# 1. Backend starten
echo "📦 Starte Backend..."
cd /root/gaestefotos-app-v2/packages/backend
nohup pnpm dev > /tmp/backend.log 2>&1 &
echo "   ✅ Backend gestartet (PID: $!)"
echo "   📋 Logs: tail -f /tmp/backend.log"

# 2. Frontend starten
echo "🎨 Starte Frontend..."
cd /root/gaestefotos-app-v2/packages/frontend
nohup pnpm dev > /tmp/frontend.log 2>&1 &
echo "   ✅ Frontend gestartet (PID: $!)"
echo "   📋 Logs: tail -f /tmp/frontend.log"

# 3. Warten und testen
sleep 3

echo ""
echo "🧪 Teste Services..."
echo "   Backend:"
curl -s http://localhost:8001/api | head -1 || echo "      ❌ Backend nicht erreichbar"

echo "   Frontend:"
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3000 && echo "" || echo "      ❌ Frontend nicht erreichbar"

echo ""
echo "✅ Services gestartet!"
echo ""
echo "📊 Service-Status prüfen:"
echo "   ps aux | grep pnpm"
echo ""
echo "📋 Logs ansehen:"
echo "   tail -f /tmp/backend.log"
echo "   tail -f /tmp/frontend.log"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8001/api"
echo "   Production: https://app.xn--gstefotos-v2a.com"

