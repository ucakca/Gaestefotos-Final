#!/bin/bash
# Automatischer MIME-Type Fix für nginx

echo "🔧 Fixe nginx Config..."

# Backup
sudo cp /etc/nginx/sites-available/gaestefotos-v2.conf /etc/nginx/sites-available/gaestefotos-v2.conf.backup.$(date +%Y%m%d_%H%M%S)

echo "✅ Backup erstellt"

# Zeige aktuelle Config
echo ""
echo "📄 Aktuelle Config (erste 50 Zeilen):"
sudo head -n 50 /etc/nginx/sites-available/gaestefotos-v2.conf

echo ""
echo "⚠️  MANUELL: Suche nach 'location /_next' und entferne den Block"
echo "   ODER führe aus:"
echo ""
echo "   sudo nano /etc/nginx/sites-available/gaestefotos-v2.conf"
echo ""
echo "   Dann:"
echo "   sudo nginx -t && sudo systemctl reload nginx"
