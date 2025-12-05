# ✅ Punycode Domain Fix

## 🔧 Was wurde geändert:

### Problem:
Die Domain `app.gästefotos.com` enthält ein Sonderzeichen (ä), das in URLs manchmal Probleme verursacht. Nginx verwendet bereits Punycode `app.xn--gstefotos-v2a.com`.

### Lösung:
Alle Domain-Referenzen wurden auf Punycode umgestellt:

1. **Backend .env**:
   - ❌ `FRONTEND_URL=https://app.gästefotos.com,...`
   - ✅ `FRONTEND_URL=https://app.xn--gstefotos-v2a.com,...`

2. **Frontend .env.local**:
   - ❌ `NEXT_PUBLIC_API_URL=https://app.gästefotos.com/api`
   - ✅ `NEXT_PUBLIC_API_URL=https://app.xn--gstefotos-v2a.com/api`
   - ❌ `NEXT_PUBLIC_WS_URL=https://app.gästefotos.com`
   - ✅ `NEXT_PUBLIC_WS_URL=https://app.xn--gstefotos-v2a.com`

3. **Backend index.ts** (CORS):
   - ❌ `'https://app.gaestefotos.com'`
   - ✅ `'https://app.xn--gstefotos-v2a.com'`

---

## 📝 Punycode:

- **Normale Domain**: `app.gästefotos.com`
- **Punycode**: `app.xn--gstefotos-v2a.com`

Beide funktionieren im Browser gleich, aber für Server-Konfigurationen ist Punycode oft sicherer.

---

## ✅ Status:

- ✅ Backend .env aktualisiert
- ✅ Frontend .env.local aktualisiert
- ✅ CORS Konfiguration aktualisiert
- ⚠️ Backend muss neu gestartet werden

**Die App sollte jetzt mit Punycode funktionieren!** 🎯

