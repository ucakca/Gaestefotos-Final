# Photo File Rate-Limiting Fix - 14.12.2025

## ✅ BEHOBENES PROBLEM

### **429 Fehler bei Photo-File-Requests**
**Problem:** `/api/photos/{id}/file` Requests wurden mit `uploadLimiter` limitiert, was zu 429 Fehlern führte.

**Root Cause:**
- `app.use('/api/photos', uploadLimiter, photoRoutes)` in `index.ts` hat den `uploadLimiter` auf ALLE `/api/photos/*` Routen angewendet
- Das betraf auch die `/file` Route, die eigentlich nicht limitiert werden sollte

**Fixes:**
1. **uploadLimiter von `/api/photos` Route entfernt:**
   - `app.use('/api/photos', uploadLimiter, photoRoutes)` → `app.use('/api/photos', photoRoutes)`
   - File-Requests werden jetzt nicht mehr limitiert

2. **uploadLimiter nur auf Upload-Route angewendet:**
   - `router.post('/:eventId/photos/upload', uploadLimiter, upload.single('file'), ...)`
   - Nur die tatsächliche Upload-Route wird jetzt limitiert

3. **uploadLimiter erhöht:**
   - Von 50 auf 200 Uploads pro Stunde
   - `trustProxy: true` hinzugefügt für Cloudflare

**Dateien:**
- `packages/backend/src/index.ts` (Zeile 236)
- `packages/backend/src/routes/photos.ts` (Zeile 1-12, 102-104)
- `packages/backend/src/middleware/rateLimit.ts` (Zeile 31-38)

---

## 🔧 TECHNISCHE DETAILS

### Vorher:
```typescript
// index.ts
app.use('/api/photos', uploadLimiter, photoRoutes); // ❌ Limitiert ALLE /api/photos/* Routen

// photos.ts
router.post('/:eventId/photos/upload', upload.single('file'), ...); // Kein Limiter
```

### Nachher:
```typescript
// index.ts
app.use('/api/photos', photoRoutes); // ✅ Kein globaler Limiter

// photos.ts
import { uploadLimiter } from '../middleware/rateLimit';
router.post('/:eventId/photos/upload', uploadLimiter, upload.single('file'), ...); // ✅ Nur Upload limitiert
```

---

## 📋 WICHTIGE HINWEISE

1. **File-Requests werden nicht limitiert:**
   - `/api/photos/{id}/file` - Kein Rate-Limiting
   - `/api/photos/{id}/download` - Kein Rate-Limiting
   - Diese Requests werden über Nginx/Cloudflare gecacht

2. **Upload-Route wird limitiert:**
   - `/api/events/{eventId}/photos/upload` - 200 Uploads/Stunde
   - Das verhindert Missbrauch, ist aber großzügig genug für normale Nutzung

3. **Rate-Limiting für andere Routen:**
   - `/api/photos/{id}/like` - Kein spezieller Limiter (verwendet apiLimiter falls aktiv)
   - `/api/photos/{id}/comments` - Kein spezieller Limiter (verwendet apiLimiter falls aktiv)

---

## 🚀 DEPLOYMENT

**Status:** ✅ Backend neu gestartet

**Bitte testen:**
1. Photo-File-Requests sollten keine 429 Fehler mehr geben
2. Uploads sollten weiterhin funktionieren (200 Uploads/Stunde Limit)
3. Feed sollte alle Fotos korrekt laden können

