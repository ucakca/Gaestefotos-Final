#!/bin/bash

# Gästefotos V2 - Service Restart Script
# Führt alle Services neu, um morgen weiterarbeiten zu können

echo "🚀 Starte Gästefotos V2 Services..."

echo "📦 Starte lokale Services..."
bash /root/gaestefotos-app-v2/start-local-services.sh

# 3. Warten und testen
sleep 3

echo ""
echo "🧪 Teste Services..."
echo "   Backend:"
curl -s http://localhost:8002/api/health | head -1 || echo "      ❌ Backend nicht erreichbar"

echo "   Frontend:"
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3002 && echo "" || echo "      ❌ Frontend nicht erreichbar"

echo ""
echo "✅ Services gestartet!"
echo ""
echo "📊 Service-Status prüfen:"
echo "   ps aux | grep pnpm"
echo ""
echo "📋 Logs ansehen:"
echo "   tail -f /tmp/backend-local.log"
echo "   tail -f /tmp/frontend-local.log"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:3002"
echo "   Backend API: http://localhost:8002/api"
echo "   Production: https://app.xn--gstefotos-v2a.com"

