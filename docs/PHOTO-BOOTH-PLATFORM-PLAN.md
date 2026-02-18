# Photo Booth Platform — Architektur & Planung

> Stand: 18. Februar 2026
> Status: PLANUNGSPHASE — Noch keine Implementierung starten!

---

## 1. Vision

gästefotos.com wird zur **All-in-One Photo Booth Platform**:
- B2C Self-Service (Hosts buchen Pakete)
- B2B Partner/Franchise (Partner betreiben Hardware)
- Standalone Booth-Software (Electron auf Touch-Devices)
- AI-Features als Differenzierung (nicht als Kernprodukt)

---

## 2. IST-Stand (Was bereits existiert)

### 2.1 Booth App (`packages/booth-app`)
- **Electron + Next.js** (Port 3002)
- Kiosk-Modus, IPC für System-Info, Fullscreen
- `BoothSetup` — Event-Slug + Flow-Type Konfiguration
- `BoothRunner` — Workflow-Engine, auto-restart nach Session
- 6 Booth-Steps: Idle, Countdown, Capture, Selection, Result, Generic
- Workflow-Runtime (eigene Kopie der Types + Engine)
- Flow-Types: BOOTH, MIRROR_BOOTH, KI_BOOTH, MOSAIC, CUSTOM

### 2.2 Workflow Builder (Admin Dashboard)
- XState v5 Engine + Visual Editor (React Flow)
- 11 Seeded Workflows (Upload, Gästebuch, Face Search, Foto-Spaß, KI-Kunst, Mosaic Print, Kamera, 3× Hardware-Vorlagen, Leere Vorlage)
- Validation, Simulation, Undo/Redo, OCC, Multi-User Editing
- Sub-Workflows, Event Bus

### 2.3 AI Features
- Style Transfer (10 Stile)
- Drawbot (Edge Detection → G-Code → SVG)
- Highlight Reel (FFmpeg)
- AI Chat (Groq)
- AI Theme Generation
- 17 AI Features im Admin Dashboard registriert

### 2.4 Hardware-Infrastruktur
- `PartnerHardware` Model (type, name, serialNumber, status, assignedEventId)
- Hardware-Verwaltung im Admin Dashboard
- Hardware-Typen: MOSAIC_WALL, PHOTO_BOOTH, MIRROR_BOOTH, KI_BOOTH, DRAWBOT
- Partner-Subscription mit Device-Lizenzen (monatlich/jährlich)

### 2.5 Booth-Spiele (App-basiert)
- Workflow-getrieben über WorkflowRunner
- Foto-Spiele, KI-Kunst als Flows in der Guest App
- Challenges mit Leaderboard + Gamification

---

## 3. Was FEHLT (Gap-Analyse)

### 3.1 Hardware-Integration (Kritisch)
| Gap | Details | Aufwand |
|-----|---------|---------|
| **Kamera-Steuerung** | DSLR via gPhoto2 / USB, Webcam via WebRTC | Mittel |
| **Drucker-Integration** | DNP DS620/DS820, CUPS, Druckvorlagen | Groß |
| **Beleuchtung** | DMX/GPIO Steuerung für Blitz/Ring-Light | Klein |
| **Peripherie-Detection** | Auto-Erkennung angeschlossener Geräte | Mittel |
| **Offline-Modus** | Queue für Uploads wenn kein Internet | Mittel |

### 3.2 AI Features (Differenzierung)
| Feature | Priorität | Typ | API |
|---------|-----------|-----|-----|
| **AI Trading Cards** | HIGH | Foto-Spiel | Template + Prompt |
| **AI Fortune Teller** | HIGH | Foto-Spiel | LLM + Style Transfer |
| **Face Swap** | HIGH | Foto-Spiel | InsightFace/Replicate |
| **AI Video Booth** | MEDIUM | Premium | Kling/Replicate |
| **Oldify/Time Machine** | MEDIUM | KI-Kunst Style | Replicate |
| **AI Caricature** | MEDIUM | KI-Kunst Style | Replicate |
| **Magazine Cover** | LOW | Template-Overlay | Canvas |
| **Photo Strip** | LOW | Download-Layout | Canvas |

### 3.3 Booth-Typen (Hardware-Varianten)
| Typ | Hardware | Software-Anforderung |
|-----|----------|---------------------|
| **Photo Booth** | DSLR + Touch-Monitor + Drucker | Kamera-API, Print-Queue |
| **Mirror Booth** | Spiegel-Display + Kamera + Drucker | Vollbild-Selfie, Overlay |
| **KI Booth** | Touch-Monitor + Webcam | Style-Selection, AI Processing |
| **360° Spinner** | Motorisierte Plattform + Kameras | Video-Capture, Stitching |
| **Drawbot** | Plotter + Stifthalter | G-Code Generation (existiert!) |
| **Mosaic Print Station** | Tablet + Drucker + Board | Sticker-Druck (existiert!) |

### 3.4 Business-Logik
| Gap | Details |
|-----|---------|
| **Booth-Session Tracking** | Wer hat wann welche Session gemacht |
| **Print-Job Queue** | Zuverlässige Druckaufträge mit Retry |
| **Booth-Health-Monitoring** | Heartbeat, Papier-Level, Tinte, Kamera-Status |
| **Booth-Remote-Management** | Config-Push, Workflow-Update, Neustart |
| **Session-Metriken** | Fotos/Stunde, Wartezeit, Fehlerrate |

---

## 4. Architektur-Entscheidungen (OFFEN — Diskussion nötig)

### 4.1 Electron vs. PWA vs. Native
| Option | Pro | Contra |
|--------|-----|--------|
| **Electron (aktuell)** | USB-Zugriff, Kiosk, lokale Kamera | Groß, Chromium-Overhead |
| **PWA** | Kein Install, einfaches Update | Kein USB, kein Drucker-Zugriff |
| **Tauri** | Kleiner als Electron, Rust-Backend | Neues Framework lernen |
| **Native (Flutter)** | Cross-Platform, performant | Komplett neues Codebase |

**Empfehlung:** Electron beibehalten für Hardware-Booth (USB, Drucker), PWA für Tablet/iPad-Deployments ohne Hardware.

### 4.2 Kamera-Anbindung
| Option | Pro | Contra |
|--------|-----|--------|
| **WebRTC (Webcam)** | Einfach, kein Driver | Qualität begrenzt |
| **gPhoto2 (DSLR)** | Profi-Qualität, RAW | Nur Linux/Mac, nicht alle Kameras |
| **Canon SDK** | Offizielles SDK, volle Kontrolle | Windows/Mac only, Lizenz |
| **USB via Electron** | Flexibel | Komplex, Device-spezifisch |

**Empfehlung:** WebRTC als Default (Webcam), gPhoto2 via Node child_process für DSLR auf Linux.

### 4.3 Drucker-Integration
| Option | Pro | Contra |
|--------|-----|--------|
| **CUPS (Linux)** | Standard, alle Drucker | Nur Linux |
| **Electron Print API** | Cross-Platform | Wenig Kontrolle über Druckqualität |
| **Direkte USB (libusb)** | Volle Kontrolle | Komplex, treiberspezifisch |
| **DNP SDK** | Optimiert für DNP-Drucker | Nur DNP |

**Empfehlung:** CUPS als primäre Lösung (Linux-Booth), mit konfigurierbarem Preset-System für verschiedene Drucker.

### 4.4 Shared Code (Mono-Repo)
```
packages/
  shared/           ← Typen, Schemas, Utils (existiert)
  workflow-runtime/  ← Engine + Types (EXTRAHIEREN aus frontend + booth-app)
  booth-app/         ← Electron Shell + Booth UI
  frontend/          ← Guest + Host Web App
  backend/           ← API Server
  admin-dashboard/   ← Admin Panel
```

**Wichtig:** workflow-runtime sollte als separates Package extrahiert werden, statt in booth-app und frontend dupliziert.

---

## 5. Implementierungs-Phasen

### Phase 1: Foundation (2-3 Wochen)
- [ ] `packages/workflow-runtime/` als shared Package extrahieren
- [ ] Booth-App Workflow-Runtime auf shared Package umstellen
- [ ] Offline-Queue für Photo-Uploads (IndexedDB + Sync)
- [ ] Booth-Session Model in Prisma (Session-Tracking)
- [ ] Booth-Health-Heartbeat Endpoint (POST /api/booth/heartbeat)
- [ ] Admin: Booth-Status Dashboard (Online/Offline, letzte Session)

### Phase 2: Hardware-Integration (3-4 Wochen)
- [ ] WebRTC Kamera-Capture in BoothStepCapture (verbessert)
- [ ] gPhoto2 Integration für DSLR (Electron IPC)
- [ ] CUPS Print-Integration (Electron IPC → Node child_process)
- [ ] Druckvorlagen-System (Layouts: 4x6, 6x8, Photo Strip, etc.)
- [ ] Print-Job Queue im Backend (mit Status-Tracking)
- [ ] Peripherie-Detection (Kamera, Drucker, verfügbare Geräte)

### Phase 3: AI Features — Quick Wins (2-3 Wochen)
- [ ] AI Trading Cards (Template + Selfie → Card Design)
- [ ] AI Fortune Teller (Selfie → AI Text + stilisiertes Portrait)
- [ ] Oldify Effect (neuer Style im KI-Kunst Portfolio)
- [ ] Photo Strip Layout (4er-Streifen als Download-Option)
- [ ] Magazine Cover Overlay (Template-basiert)

### Phase 4: AI Features — Advanced (4-6 Wochen)
- [ ] Face Swap (InsightFace via Replicate)
- [ ] AI Caricature/Cartoon (neue Modell-Kategorie)
- [ ] AI Group Theme (Multi-Face Processing)
- [ ] AI Video Booth (Kling/Replicate)

### Phase 5: 360° Spinner & Drawbot Hardware (4-6 Wochen)
- [ ] 360° Spinner: Motor-Steuerung via GPIO/USB
- [ ] 360° Spinner: Multi-Camera Sync + Video-Stitching
- [ ] Drawbot: Hardware-Steuerung (Plotter via Serial/USB)
- [ ] Drawbot: Live-Preview auf Screen während Zeichnung

### Phase 6: Remote Management & Analytics (2-3 Wochen)
- [ ] Remote Config Push (Workflow-Update ohne Neustart)
- [ ] Booth Firmware/Software Update-Mechanismus
- [ ] Session-Analytics (Fotos/Stunde, Wartezeit, Errors)
- [ ] Drucker-Status Monitoring (Papier, Tinte, Fehler)
- [ ] Partner Dashboard: Booth-Fleet-Übersicht

---

## 6. Datenmodell-Erweiterungen (Prisma)

```prisma
// Booth Session Tracking
model BoothSession {
  id            String    @id @default(uuid())
  boothId       String    // PartnerHardware.id
  eventId       String
  workflowId    String?
  flowType      String
  startedAt     DateTime  @default(now())
  completedAt   DateTime?
  status        String    @default("STARTED") // STARTED, COMPLETED, ABORTED, ERROR
  photosCount   Int       @default(0)
  printCount    Int       @default(0)
  duration      Int?      // Sekunden
  metadata      Json?     // Device-Info, Errors, etc.
  
  event         Event     @relation(fields: [eventId], references: [id])
  booth         PartnerHardware @relation(fields: [boothId], references: [id])
  
  @@index([eventId])
  @@index([boothId])
  @@map("booth_sessions")
}

// Booth Heartbeat (Health Monitoring)
model BoothHeartbeat {
  id            String    @id @default(uuid())
  boothId       String
  timestamp     DateTime  @default(now())
  status        String    // ONLINE, IDLE, BUSY, ERROR
  systemInfo    Json?     // CPU, RAM, Disk, Camera, Printer
  currentEvent  String?
  sessionCount  Int       @default(0)
  
  booth         PartnerHardware @relation(fields: [boothId], references: [id])
  
  @@index([boothId])
  @@map("booth_heartbeats")
}

// Print Job Queue
model PrintJob {
  id            String    @id @default(uuid())
  boothId       String?
  eventId       String
  photoId       String?
  template      String    // Layout-Template Name
  copies        Int       @default(1)
  status        String    @default("QUEUED") // QUEUED, PRINTING, DONE, FAILED
  retries       Int       @default(0)
  error         String?
  createdAt     DateTime  @default(now())
  printedAt     DateTime?
  
  event         Event     @relation(fields: [eventId], references: [id])
  
  @@index([eventId])
  @@index([status])
  @@map("print_jobs")
}
```

---

## 7. Offene Fragen (VOR Implementierung klären!)

1. **Welche Hardware zuerst?** Photo Booth oder Mirror Booth? Oder nur Software-Booth (Webcam)?
2. **DSLR-Modell?** Canon EOS R / Nikon Z? Bestimmt die SDK-Wahl.
3. **Drucker-Modell?** DNP DS620 ist Favorit — bestätigen + Testgerät beschaffen.
4. **iPad/Tablet-Support?** PWA ausreichend oder native App nötig?
5. **Offline-Fähigkeit?** Wie viele Fotos soll der Booth offline zwischenspeichern?
6. **AI Processing:** On-Device (Edge AI) oder Cloud (Replicate)? Latenz-Budget?
7. **360° Spinner:** Welche Plattform/Motor? Gibt es bereits Hardware?
8. **White-Label Booth:** Eigenes Branding auf Booth-Screen + Drucke?
9. **Booth-Miete vs. Kauf:** Wie wird Hardware an Partner/Hosts ausgeliefert?
10. **Update-Mechanismus:** Auto-Update via Electron oder manuelles Image-Flash?

---

## 8. Kosten-Schätzung (Entwicklung)

| Phase | Aufwand | Priorität |
|-------|---------|-----------|
| Phase 1: Foundation | ~80h | SOFORT |
| Phase 2: Hardware | ~120h | HOCH |
| Phase 3: AI Quick Wins | ~60h | HOCH |
| Phase 4: AI Advanced | ~120h | MITTEL |
| Phase 5: 360° + Drawbot | ~120h | NIEDRIG |
| Phase 6: Remote Mgmt | ~60h | MITTEL |
| **Gesamt** | **~560h** | |

---

## 9. Nächste Schritte

1. **Offene Fragen klären** (Abschnitt 7)
2. **Hardware beschaffen** (Kamera, Drucker, Touch-Monitor für Prototyp)
3. **Phase 1 starten** (workflow-runtime extrahieren, Session-Tracking)
4. **Erst Software-Booth** (Webcam-only) als MVP, dann Hardware hinzufügen
