#!/bin/bash
# Quick Fix für MIME-Type Problem
# Erstellt eine neue nginx Config für gästefotos.com

cat > /tmp/gaestefotos-nginx.conf << 'EOF'
server {
    listen 443 ssl http2;
    server_name app.gästefotos.com app.xn--gstefotos-v2a.com;

    # SSL Zertifikat (Pfade anpassen!)
    ssl_certificate /etc/letsencrypt/live/gaestefotos.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gaestefotos.com/privkey.pem;

    # Alle Requests zu Next.js proxyen (KEINE static file serving)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTP → HTTPS Redirect
server {
    listen 80;
    server_name app.gästefotos.com app.xn--gstefotos-v2a.com;
    return 301 https://$server_name$request_uri;
}
EOF

echo "✅ Config erstellt in /tmp/gaestefotos-nginx.conf"
echo ""
echo "NÄCHSTE SCHRITTE:"
echo "1. sudo cp /tmp/gaestefotos-nginx.conf /etc/nginx/conf.d/gaestefotos.conf"
echo "2. Passe SSL-Pfade an (wenn nötig)"
echo "3. sudo nginx -t"
echo "4. sudo systemctl reload nginx"
