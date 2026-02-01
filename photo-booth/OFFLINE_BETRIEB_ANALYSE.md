# Offline-Betrieb für Gästefotos.com

**Erstellt:** 2026-01-29  
**Ziel:** Analyse der Möglichkeiten, das System offline oder lokal zu betreiben

---

## 1. Status Quo: Was haben wir bereits?

### Bereits implementiert ✅

| Feature | Datei | Beschreibung |
|---------|-------|--------------|
| **Offline Upload Queue** | `uploadQueue.ts` | IndexedDB-basierte Queue für Uploads bei Verbindungsverlust |
| **PWA Support** | `pwa-provider.tsx` | Service Worker, Install-Prompt, Online/Offline-Detection |
| **Offline Queue Indicator** | `OfflineQueueIndicator.tsx` | UI für wartende Uploads |

### Funktionsweise
```
Gast macht Foto → Offline? → IndexedDB Queue → Online? → Auto-Upload
                    ↓
              Weiter fotografieren (nicht blockiert)
```

**Limitation:** Die Queue funktioniert nur für **Uploads**. Das Anzeigen von Fotos benötigt weiterhin Server-Verbindung.

---

## 2. Anforderung: "Echtes" Offline-System

Für Events **ohne Internet** (z.B. Berghütte, Schiff, Keller) braucht man:

1. **Lokale Galerie-Anzeige** (ohne Server)
2. **Lokale Speicherung** der Fotos
3. **Lokales Backend** für API-Calls
4. **Optional:** Sync nach Event (wenn wieder online)

---

## 3. Lösungsoptionen

### Option A: Progressive Web App (PWA) - Erweitert

**Konzept:** Service Worker cached alles, IndexedDB speichert Fotos lokal

```
┌─────────────────────────────────────────┐
│           Browser (Chrome/Safari)        │
├─────────────────────────────────────────┤
│  Service Worker (Caching)               │
│  ├── Static Assets (HTML/CSS/JS)        │
│  ├── API Responses (Event-Daten)        │
│  └── Image Cache (Thumbnails)           │
├─────────────────────────────────────────┤
│  IndexedDB                              │
│  ├── Event-Metadaten                    │
│  ├── Fotos (Blob Storage)               │
│  └── Upload Queue                       │
└─────────────────────────────────────────┘
```

| Pro | Contra |
|-----|--------|
| Kein zusätzlicher Download | Browser-Speicher limitiert (~50MB-2GB) |
| Funktioniert auf allen Geräten | Kein echter "Server" |
| Bereits teilweise implementiert | Sync-Konflikte möglich |
| Keine Installation nötig | Kein Multi-Device Support offline |

**Aufwand:** 2-3 Wochen

**Geeignet für:** 
- Kurze Events mit begrenzten Fotos (~100-500)
- Einzelne Devices als "Kiosk"

---

### Option B: Lokaler Docker-Container

**Konzept:** Backend + Frontend + DB in einem Docker-Container auf Laptop

```
┌─────────────────────────────────────────┐
│            Docker Container              │
├─────────────────────────────────────────┤
│  nginx (Reverse Proxy)     :80          │
├─────────────────────────────────────────┤
│  Next.js Frontend          :3000        │
├─────────────────────────────────────────┤
│  Express Backend           :8000        │
├─────────────────────────────────────────┤
│  PostgreSQL                :5432        │
├─────────────────────────────────────────┤
│  MinIO (S3-Storage)        :9000        │
└─────────────────────────────────────────┘
         ↓
    Lokales WLAN (192.168.x.x)
         ↓
    Gäste-Handys verbinden sich
```

| Pro | Contra |
|-----|--------|
| Volle Funktionalität | Braucht Laptop + Docker |
| Unbegrenzter Speicher | Setup-Aufwand für Endkunden |
| Multi-Device Support | Keine Cloud-Sync automatisch |
| Echter Server | IT-Kenntnisse nötig |

**Aufwand:** 1-2 Wochen (Docker-Compose + Build-Scripts)

**Geeignet für:**
- Professionelle Event-Anbieter
- Große Events (1000+ Fotos)
- Firmen-Events mit IT-Support

---

### Option C: Electron Desktop-App

**Konzept:** Desktop-App die Backend + Frontend in sich trägt

```
┌─────────────────────────────────────────┐
│         Electron App (Windows/Mac)       │
├─────────────────────────────────────────┤
│  Chromium (Frontend)                     │
├─────────────────────────────────────────┤
│  Node.js (Backend)                       │
├─────────────────────────────────────────┤
│  SQLite / LevelDB (statt PostgreSQL)    │
├─────────────────────────────────────────┤
│  Lokales Filesystem (statt S3)          │
└─────────────────────────────────────────┘
```

| Pro | Contra |
|-----|--------|
| Ein-Klick-Installation | Große App-Größe (~200MB) |
| Kein Docker nötig | Nur Desktop (Win/Mac) |
| Eingebauter Server | Electron = Resource-hungry |
| Auto-Updates möglich | Braucht SQLite-Migrations |

**Aufwand:** 4-6 Wochen

**Geeignet für:**
- FiestaPics-ähnliches Modell
- "Fotobox-Betreiber" als Zielgruppe
- Verkauf als Software-Lizenz

---

### Option D: Tauri Desktop-App (Leichtgewichtig)

**Konzept:** Wie Electron, aber mit Rust-Backend statt Node.js

```
┌─────────────────────────────────────────┐
│         Tauri App (Win/Mac/Linux)        │
├─────────────────────────────────────────┤
│  WebView (System-Browser)                │
├─────────────────────────────────────────┤
│  Rust Backend (kompiliert)               │
├─────────────────────────────────────────┤
│  SQLite (eingebettet)                    │
└─────────────────────────────────────────┘
```

| Pro | Contra |
|-----|--------|
| Kleine App-Größe (~10MB) | Backend müsste in Rust neu | 
| Schnell & ressourcenschonend | Großer Entwicklungsaufwand |
| Native Look & Feel | Team muss Rust lernen |

**Aufwand:** 8-12 Wochen (Backend-Rewrite)

**Nicht empfohlen** für uns (zu viel Aufwand)

---

### Option E: "Kiosk-Modus" PWA + Lokaler Hotspot

**Konzept:** Ein Gerät (Tablet/Laptop) als "Server", andere verbinden sich per WLAN

```
┌─────────────────────────────────────────┐
│    "Host-Device" (Laptop mit Hotspot)    │
├─────────────────────────────────────────┤
│  Browser mit PWA (Offline-First)         │
│  ├── IndexedDB = Lokale Datenbank       │
│  ├── Service Worker = API-Simulation    │
│  └── WebRTC = Device-to-Device Sync     │
└─────────────────────────────────────────┘
         ↓ (lokales WLAN)
┌─────────────────────────────────────────┐
│    Gäste-Devices                         │
│    Browser öffnet: http://192.168.x.x   │
│    → Uploads gehen per WebRTC an Host   │
└─────────────────────────────────────────┘
```

| Pro | Contra |
|-----|--------|
| Keine Server-Software nötig | WebRTC komplex |
| Läuft auf jedem Gerät | Braucht stabiles lokales WLAN |
| Innovative Lösung | Experimentell |

**Aufwand:** 6-8 Wochen

**Geeignet für:**
- Tech-Demo / Innovation
- Kleine Events (<50 Gäste)

---

## 4. Empfohlene Lösung

### Für Gästefotos.com (SaaS-Modell): **Option A (PWA Erweitert)**

**Warum:**
- Passt zu unserem Self-Service Modell
- Kein zusätzlicher Download für Gäste
- Erweitert bestehende Infrastruktur
- Funktioniert für 90% der Use-Cases

### Für "Profi-Anbieter" (optional): **Option B (Docker)**

**Warum:**
- Für Event-Firmen mit IT-Kapazität
- "Enterprise"-Feature
- Kann als Premium-Add-On verkauft werden

---

## 5. Implementierungsplan: PWA Offline-Modus

### Phase 1: Offline-First Galerie (2 Wochen)

```typescript
// Service Worker: Cache-First für Bilder
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/photos/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open('photos-v1').then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        });
      })
    );
  }
});
```

**Tasks:**
- [ ] Service Worker für Image-Caching
- [ ] IndexedDB für Event-Metadaten
- [ ] "Offline verfügbar machen" Button
- [ ] Offline-Galerie-Ansicht

### Phase 2: Lokale Foto-Aufnahme (1 Woche)

```typescript
// Fotos lokal speichern + später synchen
async function captureAndStore(blob: Blob) {
  const id = crypto.randomUUID();
  await db.photos.put({ id, blob, synced: false, createdAt: Date.now() });
  
  // UI sofort aktualisieren
  dispatchEvent(new CustomEvent('photo-added', { detail: { id } }));
  
  // Background-Sync wenn online
  if (navigator.onLine) {
    syncPhoto(id);
  }
}
```

**Tasks:**
- [ ] Lokale Foto-Speicherung (IndexedDB Blobs)
- [ ] Lokale Thumbnail-Generierung
- [ ] Background Sync API
- [ ] Conflict Resolution

### Phase 3: Event-Daten Caching (1 Woche)

```typescript
// Event-Daten für Offline cachen
async function cacheEventForOffline(eventId: string) {
  const event = await api.get(`/events/${eventId}`);
  const photos = await api.get(`/events/${eventId}/photos`);
  
  await db.events.put(event);
  await db.eventPhotos.bulkPut(photos);
  
  // Thumbnails vorab laden
  for (const photo of photos) {
    await cacheImage(photo.thumbnailUrl);
  }
}
```

**Tasks:**
- [ ] "Offline speichern" Button im Event
- [ ] Automatisches Caching bei langem Besuch
- [ ] Storage-Quota Management
- [ ] Cache-Invalidierung bei Änderungen

---

## 6. Docker-Lösung (Enterprise)

### docker-compose.yml

```yaml
version: '3.8'
services:
  frontend:
    build: ./packages/frontend
    ports:
      - "80:3000"
    environment:
      - API_URL=http://backend:8000
    depends_on:
      - backend

  backend:
    build: ./packages/backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/gaestefotos
      - S3_ENDPOINT=http://minio:9000
    depends_on:
      - db
      - minio

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=gaestefotos

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin

volumes:
  pgdata:
  minio_data:
```

### Start-Script (für Endkunden)

```bash
#!/bin/bash
# gaestefotos-offline.sh

echo "🎉 Gästefotos Offline-Server startet..."

# Prüfe Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker nicht installiert. Bitte installiere Docker Desktop."
    exit 1
fi

# Starte Container
docker-compose up -d

# Warte auf Start
sleep 10

# Öffne Browser
echo "✅ Server läuft! Öffne: http://localhost"
xdg-open http://localhost 2>/dev/null || open http://localhost 2>/dev/null

echo ""
echo "📱 Gäste können sich verbinden unter:"
ip addr | grep 'inet ' | grep -v '127.0.0.1' | awk '{print "   http://"$2}' | cut -d'/' -f1
```

---

## 7. Kosten-/Aufwand-Vergleich

| Option | Entwicklung | Wartung | Für wen? |
|--------|-------------|---------|----------|
| **PWA Offline** | 3-4 Wochen | Niedrig | Alle Kunden |
| **Docker** | 1-2 Wochen | Mittel | Enterprise |
| **Electron** | 4-6 Wochen | Hoch | Nicht empfohlen |
| **Tauri** | 8-12 Wochen | Hoch | Nicht empfohlen |
| **WebRTC P2P** | 6-8 Wochen | Hoch | Experiment |

---

## 8. Empfehlung

### Kurzfristig (Q1 2026): PWA Offline-Modus

1. **Service Worker** für Asset-Caching ✅
2. **IndexedDB** für Foto-Storage ✅ (teilweise)
3. **"Offline speichern"** Button für Events
4. **Background Sync** für Uploads

**Vorteile:**
- Kein Download nötig
- Funktioniert auf ALLEN Geräten
- Erweitert unser SaaS-Modell sinnvoll

### Mittelfristig (Q2 2026): Docker für Enterprise

1. **docker-compose.yml** erstellen
2. **Setup-Script** für Windows/Mac/Linux
3. **Dokumentation** für IT-Admins
4. **Sync-Tool** für Nachsynchronisation

**Vorteile:**
- Premium-Feature für Firmenkunden
- "On-Premise" Option für datensensible Kunden
- Differenzierung von Wettbewerb

---

## 9. Fazit

**JA, eine Offline-Lösung ist machbar!**

- **Für 90% der Fälle:** PWA mit erweitertem Offline-Modus reicht
- **Für Enterprise:** Docker-Container als Premium-Feature
- **Desktop-App (Electron/Tauri):** Nicht empfohlen (zu viel Aufwand, falsches Modell)

Der größte Vorteil unseres Systems bleibt: **Web-basiert, kein Download, BYOD**. 
Eine PWA-Offline-Erweiterung erhält diesen Vorteil, während sie "echte" Offline-Fähigkeit hinzufügt.

---

**Autor:** Cascade AI  
**Letzte Aktualisierung:** 2026-01-29
