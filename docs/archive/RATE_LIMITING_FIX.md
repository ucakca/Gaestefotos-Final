# Rate-Limiting Fix - 14.12.2025

## ✅ BEHOBENE PROBLEME

### 1. **429 Fehler (Too Many Requests)**
**Problem:** Zu viele API-Requests führten zu 429 Fehlern.

**Fixes:**
- **Rate-Limiting erhöht:** Von 500 auf 2000 Requests pro 15 Minuten
- **File-Requests ausgenommen:** `/file` und `/photo/` Requests werden nicht limitiert (werden über Proxy gecacht)
- **Debouncing:** `loadPhotos()` wird jetzt mit 500ms Delay aufgerufen, um mehrere Events zu bündeln
- **Loading-Flag:** Verhindert gleichzeitige `loadPhotos()` Calls

**Dateien:**
- `packages/backend/src/middleware/rateLimit.ts` (Zeile 4-21)
- `packages/frontend/src/app/e/[slug]/page.tsx` (Zeile 105-106, 111-114, 260-275, 240-245)

---

### 2. **WebSocket-Verbindungsprobleme**
**Problem:** WebSocket-Verbindungen wurden zu früh geschlossen.

**Status:** WebSocket-Konfiguration wurde bereits in vorherigen Fixes optimiert. Die Rate-Limiting-Fixes sollten auch hier helfen, da weniger Requests = weniger Verbindungsprobleme.

---

## 🔧 IMPLEMENTIERTE OPTIMIERUNGEN

### Debouncing für `photoUploaded` Events
```typescript
const handlePhotoUploaded = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadPhotos();
  }, 500);
};
```

### Loading-Flag für `loadPhotos()`
```typescript
const loadingRef = useRef(false);

const loadPhotos = async () => {
  if (loadingRef.current) {
    console.log('loadPhotos already in progress, skipping...');
    return;
  }
  loadingRef.current = true;
  try {
    // ... load photos ...
  } finally {
    loadingRef.current = false;
  }
};
```

---

## 📋 NÄCHSTE SCHRITTE

1. ✅ Rate-Limiting erhöht
2. ✅ Debouncing implementiert
3. ✅ Loading-Flag hinzugefügt
4. ⚠️ **Zu beobachten:** Ob 429 Fehler weiterhin auftreten (könnte auch von Cloudflare kommen)

---

## 🚀 DEPLOYMENT

**Status:** ✅ Alle Fixes implementiert und Services neu gestartet

**Bitte testen:**
1. Mehrere Fotos schnell hintereinander hochladen → Sollte keine 429 Fehler mehr geben
2. Feed mehrmals neu laden → Sollte keine 429 Fehler mehr geben
3. WebSocket-Verbindung prüfen → Sollte stabiler sein

