# Guestbook Photo URL Fix - 14.12.2025

## ✅ BEHOBENES PROBLEM

### **ERR_NAME_NOT_RESOLVED für Guestbook-Photos**
**Problem:** URLs für Guestbook-Photos wurden falsch generiert:
```
https://app.xn--gstefotos-v2a.com,http//localhost:3000,https://app.g%C3%A4stefotos.com,...
```

**Root Cause:**
- `process.env.FRONTEND_URL` enthält eine komma-separierte Liste von URLs
- Der Code verwendete die gesamte Variable direkt als `baseUrl`
- Das führte zu ungültigen URLs mit der gesamten Liste als Hostname

**Fix:**
- **Relative URLs verwenden:** Statt absolute URLs mit `baseUrl` werden jetzt relative Pfade (`/api/...`) verwendet
- **Nginx-kompatibel:** Relative URLs funktionieren perfekt mit Nginx-Proxy
- **Keine Environment-Variable nötig:** Keine Abhängigkeit von `FRONTEND_URL` mehr

**Geänderte Routen:**
1. `GET /:eventId/guestbook` - Zeile 87-108
2. `GET /:eventId/feed` - Zeile 148-169
3. `POST /:eventId/guestbook` - Zeile 209-215
4. `POST /:eventId/guestbook/upload-photo` - Zeile 350-351

**Vorher:**
```typescript
const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
photoUrl = `${baseUrl}/api/events/${eventId}/guestbook/photo/${encodeURIComponent(entry.photoStoragePath)}`;
// Ergebnis: https://app.xn--gstefotos-v2a.com,http//localhost:3000,.../api/...
```

**Nachher:**
```typescript
photoUrl = `/api/events/${eventId}/guestbook/photo/${encodeURIComponent(entry.photoStoragePath)}`;
// Ergebnis: /api/events/.../guestbook/photo/...
```

---

## 🔧 TECHNISCHE DETAILS

### Warum relative URLs?
1. **Nginx-Proxy:** Relative URLs werden automatisch korrekt aufgelöst
2. **Keine Environment-Abhängigkeit:** Funktioniert unabhängig von `FRONTEND_URL`
3. **Einfacher:** Weniger Code, weniger Fehlerquellen
4. **Konsistent:** Gleiche Logik wie bei normalen Photo-URLs (`/api/photos/{id}/file`)

---

## 📋 GETESTET

**API-Test:**
```bash
curl "http://localhost:8001/api/events/.../feed" | jq '.entries[0].photoUrl'
# Ergebnis: "/api/events/.../guestbook/photo/..."
```

✅ Relative URL wird korrekt generiert

---

## 🚀 DEPLOYMENT

**Status:** ✅ Backend neu gestartet

**Bitte testen:**
1. Guestbook-Photos sollten jetzt korrekt geladen werden
2. Keine `ERR_NAME_NOT_RESOLVED` Fehler mehr
3. Feed sollte alle Guestbook-Photos anzeigen

