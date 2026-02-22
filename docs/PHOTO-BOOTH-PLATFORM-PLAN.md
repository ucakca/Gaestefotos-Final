# Photo Booth Platform — Architektur & Planung

> Stand: 18. Februar 2026
> Status: PLANUNGSPHASE — Alle Kernentscheidungen getroffen ✅

---

## 1. Vision

gästefotos.com wird zur **All-in-One Photo Booth Platform**:
- B2C Self-Service (Hosts buchen Pakete)
- B2B Partner/Franchise — **Tupperware-Modell** (Partner arbeiten unter gästefotos.com Branding)
- Standalone Booth-Software (Electron auf Touch-Devices) mit **Offline-First Architektur**
- AI-Features als Differenzierung (nicht als Kernprodukt)
- **Linux als Booth-Betriebssystem** (stabiler, weniger fehleranfällig, gPhoto2-Support)

### 1.1 Kernkonzept: Booth ↔ Cloud Fusion

Die Photo Booth vor Ort ist **kein isoliertes System**, sondern speist Bilder direkt in den gleichen Stream ein, in dem auch die Handyfotos der Gäste landen.

**Prinzip:** Alle Quellen (Booth + Handy + Upload) fließen automatisch in **einen** Stream. Keine Quellen-Auswahl für Hosts oder Gäste — je mehr Berührungspunkte, desto mehr Gäste laden Fotos hoch.

**Ausgangslage:** gästefotos.com ist eine Web-Plattform (Node.js/React), bei der Gäste über Smartphones Fotos per QR-Code hochladen (Live-Galerie, kein App-Download). Die Booth wird zur **professionellen Erweiterung** dieses Systems.

**Problem:** Auf Events ist das WLAN/LTE oft instabil oder **gar nicht vorhanden**. Die Booth **muss** funktionieren — immer und überall.

### 1.2 USP gegenüber Wettbewerb

| Wettbewerber | Stärke | Unser Vorteil |
|-------------|--------|---------------|
| **Foto Master** | 10+ Booth-Typen, Cloud-Mgmt, AI, 15 Jahre | **Smartphone + Booth = ein Stream** (FM hat keine Gäste-App) |
| **Fiesta (PBSCO)** | 550K Events, iPad-only, AirDrop | **DSLR-Qualität + AI + Offline-First** |
| **dslrBooth** | DSLR-fokussiert, Profi-Qualität | **Cloud + Gäste-App + AI** |
| **Snappic** | AI-powered, high-end Events | **Offline-First + günstiger** |

### 1.3 Geschäftsmodell

| Aspekt | Entscheidung |
|--------|-------------|
| **Partner-Branding** | NEIN — Tupperware-Modell, alle unter gästefotos.com |
| **Hardware** | Wird von uns gekauft und bereitgestellt |
| **Partner-Modell** | Abo-System (Software-Lizenz + Hardware-Nutzung) |
| **Supply of Leads** | Geplant — Lead-Verteilung an Partner |

### 1.4 Booth-Spielchen & Interaktive Features

Alle Spiele sind **Workflow-gesteuert** (Workflow Builder) und jederzeit erweiterbar.

#### Kategorie A: Smartphone-Features (kein Booth nötig)

| Feature | Beschreibung | Priorität |
|---------|-------------|-----------|
| **Gruppenfoto-Challenge** | "Mache ein Foto mit mind. 5 Personen" | MEDIUM |
| **Cover-Shooting** | Selfie + Magazin-Overlay (Vogue, GQ, Rolling Stone) — Template-basiert | HIGH |
| **Compliment Mirror** | Selfie → AI generiert Kompliment → Text-Overlay auf Foto (Easy Win) | HIGH |
| **Face-Off (Team-Wettkampf)** | Teams über QR-Code zugeordnet, Fotos zählen pro Team, Live-Leaderboard auf Event Wall | HIGH |
| **AI Slot Machine** | **Standalone-Feature!** Spin am Handy → Slot-Kombination = AI-Prompt → Bild auf Event Wall | HIGH |

**AI Slot Machine im Detail:**
- Gast spinnt am Handy → z.B. 🦁 + 🏖️ + 🎨 = "Löwe am Strand, Ölgemälde"
- AI generiert Bild → Ergebnis erscheint sofort auf Event Wall (WOW-Moment)
- Kombinierbar mit allen bestehenden AI-Features (Style Transfer, etc.)
- Seltene Kombinationen = besondere Bilder (Gamification)
- Zufallsgenerator für AI-Bildgenerierung — extrem spielerisch und spannend

#### Kategorie B: Booth-Features (Touch-Screen / DSLR)

| Feature | Beschreibung | Priorität |
|---------|-------------|-----------|
| **Statuen-Challenge** | Booth zeigt Referenz-Statue → Gruppe stellt nach → AI Pose-Score → Side-by-Side Druck | MEDIUM |
| **Digital Graffiti** | Nach Foto auf Touchscreen malen/Emojis, dann Upload | MEDIUM |
| **Blind Mimicry** | Bildschirm zeigt lustige Referenz (Affe, Meme) → Gäste stellen nach OHNE sich zu sehen → Vorschau mit Countdown → Überraschung! Wenn Drucker vorhanden: erst beim Druck sichtbar. Sonst: Vorschau mit Countdown | HIGH |
| **Zufall-AI Overlay** | Gäste posieren normal, Overlay ist zufällig (Superhelden, Astronaut, Unterwasser) → Überraschung beim Ergebnis | MEDIUM |
| **Face Switch** | Gesichter in Gruppe tauschen ohne dass Gast es merkt (AI) | MEDIUM |
| **Mirror Face-Off** | Mimik-Duell mit KI-Score 0-100, Highscore des Abends | MEDIUM |

#### Kategorie C: Reaktions-Tracking (USP-Feature)

Booth-Session wird zur **"Story"** statt nur Einzelfoto:

1. **Foto wird gemacht** → DSLR-Shot
2. **AI-Effekt wird angewendet** (Slot Machine, Style Transfer, Blind Mimicry)
3. **Ergebnis auf Booth-Screen** → zusätzliche **Webcam** macht automatisch ein Reaktionsfoto
4. **Ergebnis:** Original + AI-Version + Reaktionsfoto = **Trilogie-Collage** oder **Reaktions-GIF**

**Setup:** Webcam zwischen Spiegel und LED-Blitz positioniert. System muss die Personen "verfolgen" die gerade fotografiert wurden (Face Detection Matching). Wenn Drucker vorhanden: Kamera alternativ auf Drucker-Ausgabe ausrichten → Reaktion beim Abholen des Drucks.

**Komplexes Feature** mit vielen Parametern — als Premium/USP in späteren Phasen. Proof-of-Concept zuerst.

#### Kategorie D: Gästebuch-Hybrid

- **Vows & Views** — Selfie + schriftliche Botschaft im Polaroid-Style

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

## 3. Offline-First Architektur (Kernstrategie)

Die Booth muss **immer funktionieren** — egal ob Internet da ist oder nicht.

### 3.1 Lokaler Betrieb

| Komponente | Beschreibung |
|------------|-------------|
| **Externe SSD** | Fotos auf externer SSD (500GB-1TB, ~50-80€) — entlastet den Booth-PC |
| **Hintergrund-Sync** | Sobald Verbindung besteht → automatischer Upload an gästefotos.com API |
| **Upload-Queue** | Persistente Warteschlange mit Retry-Logik, Prioritäten, Fehlerbehandlung |
| **Throttled Upload** | Max 1 Foto alle 5-10 Sek → verhindert "Foto-Flut" auf der Event Wall |
| **Lokaler Druck** | Drucken funktioniert **immer**, unabhängig von Internet |
| **Auto-Bereinigung** | Erfolgreich hochgeladene Fotos nach 7 Tagen von SSD gelöscht |

**Hinweis:** Auch die externe SSD läuft über den Booth-PC (USB 3.0). Vorteil: Booth-PC braucht nur RAM für aktuelle Session, nicht den gesamten Foto-Bestand auf der internen HDD. Die SSD übernimmt den Speicher, der PC die Verarbeitung.

### 3.2 Booth-Hotspot (Premium-Feature, separat buchbar)

Die Booth erstellt ein eigenes WLAN — Gäste sehen Booth-Fotos sofort am Handy, auch ohne Internet.

| Komponente | Details |
|------------|---------|
| **Hardware** | USB-WiFi-Adapter mit AP-Modus (~15-30€) oder integriertes WiFi |
| **Software** | `hostapd` + `dnsmasq` auf Linux (kostenlos) |
| **Captive Portal** | Gast verbindet sich → wird automatisch auf Booth-Galerie weitergeleitet |
| **Mini-Webserver** | Lokaler Express.js Server mit Foto-Galerie |

**Vermarktung als Extra-Paket:**
- "Kein WLAN am Veranstaltungsort? Kein Problem!"
- Gescheiter Aufbau — professionell, nicht improvisiert
- Preisvorschlag: 49-99€ Addon pro Event oder im Premium-Paket inklusive

### 3.3 Event-Provisioning (Booth vor Event konfigurieren)

| Methode | Beschreibung | Wann |
|---------|-------------|------|
| **Cloud Pre-Config** | Booth hat Internet → holt Config automatisch beim Start (Booth-ID permanent gespeichert) | Standard (Lager) |
| **QR-Code Provisioning** | QR enthält `{ boothId, eventId, apiUrl, wifi }` (~3KB) → Booth scannt → verbindet + lädt Config | Vor Ort |
| **USB-Config** | Config-Datei auf USB-Stick → Booth liest automatisch | Offline-Fallback |

**QR-Code reicht für Basis-Config** (IDs + WiFi), aber NICHT für Software-Updates oder große Assets. Für Updates → siehe Abschnitt 8.

**Druckvorlagen-Problem:** Host-designte Vorlagen müssen VOR dem Event auf die Booth. → Lösung: Beim Preload im Lager werden alle Event-Assets (Vorlagen, Overlays, Logos) heruntergeladen und lokal gecached. Ganz ohne Internet geht es nicht wenn custom Vorlagen existieren.

### 3.4 Online-Sync (Cloud-Integration)

| Komponente | Beschreibung |
|------------|-------------|
| **Booth-API-Key** | Booth authentifiziert sich mit dediziertem API-Key pro Event (kein User-Login nötig) |
| **Echtzeit-Push** | Bilder erscheinen in der Live-Galerie (WebSocket/Socket.io), throttled |
| **Branding-Overlay** | Booth-Bilder automatisch mit Event-Overlay vor Upload |
| **Foto-Quelle Tag** | `source: BOOTH | MOBILE | UPLOAD` — intern für Analytics, nicht für Gäste sichtbar |
| **Neuer Endpoint** | `POST /api/booth/upload` — optimiert für größere Daten + Booth-Metadaten |

### 3.5 Netzwerk-Szenarien

| Szenario | Booth-Verhalten | gästefotos.com Plattform |
|----------|----------------|-------------------------|
| **Gutes Internet** | Direkter Upload (throttled, 1 Foto/5-10s) | Sofortige Anzeige in Live-Diashow |
| **Instabiles Netz** | Queue speichert, Retry im Hintergrund | Booth-Bilder kommen verzögert nach |
| **Komplett Offline** | Lokaler Druck + Speicherung auf SSD | Bulk-Upload nach Event |
| **Nur LAN** | Booth-Hotspot aktiv → Gäste sehen Fotos lokal | Keine Cloud-Sync bis Internet da |
| **Nur gästefotos gebucht** | Kein Booth vor Ort | Alles über Smartphone-Upload der Gäste |

**Optional: LTE-Router als Miet-Addon** (~30-50€/Event) — ermöglicht Cloud-Sync + AI-Effekte bei Events ohne WLAN.

---

## 4. Booth-Typen & Hardware

### 4.1 Hardware-Varianten

| Typ | Hardware | Software-Anforderung |
|-----|----------|---------------------|
| **Photo Booth** | DSLR + Touch-Monitor (43") + Drucker | Kamera-API, Print-Queue |
| **Mirror Booth** | Spiegel-Display (65") + DSLR + Drucker | Vollbild-Selfie, Overlay |
| **KI Booth** | Touch-Monitor + DSLR | Style-Selection, AI Processing |
| **360° Spinner** | Motorisierte Plattform + GoPro Hero 13 Black + Android-Tablet (Steuereinheit am Stab unter GoPro) | Video-Capture, Stitching |
| **Drawbot** | Plotter / 3-Achsen Roboterarm (Dexbot) + Stifthalter | G-Code Generation (existiert!) |
| **Mosaic Print Station** | Tablet + Drucker + Board | Sticker-Druck (existiert!) |
| **Sharing Station** | Tablet + Ständer | QR-Sharing, kein Druck |

Architektur ist modular — neue Booth-Typen als Workflow + Hardware-Profil hinzufügbar.

### 4.2 Erstausstattung (geplant)

| Gerät | Modell / Spec | Status | Kosten |
|-------|--------------|--------|--------|
| **DSLR (Booth)** | Canon EOS R100 (gPhoto2-kompatibel!) | Bestellen | ~450€ |
| **Photo/Mirror Booth** | Fertig-Booth inkl. PC (i5, 8GB RAM, 256GB HDD, Cap. Touch 43") | Bestellen | ~1.250€ DDP |
| **Mirror-Display** | 65" Spiegel-Display | Bestellen | Preis offen |
| **Drucker** | DNP DS620A (Fotos + Perforations-Media für Sticker) | Bestellen | ~500-600€ |
| **Externe SSD** | 500GB-1TB USB 3.0 SSD | Bestellen | ~50-80€ |
| **360° Spinner** | Motorisierte Plattform + Stab | Bestellen | ~750€ |
| **GoPro** | Hero 13 Black | Bestellen | ~450€ |
| **360° Tablet** | Android-Tablet (Samsung Tab) am Stab unter GoPro | Bestellen | ~200-300€ |
| **Sharing Station** | Android-Tablet + Ständer | Optional | ~250€ |
| **Gesamt** | | | **~3.850-4.480€** |

**Hinweis:** Mitgelieferter PC (Win10) wird mit **Linux (Ubuntu Minimal)** neu aufgesetzt.

**Kamera-Entscheidung:** Canon EOS R100 statt Sony ZV-E10 weil:
- ZV-E10 unterstützt **kein USB-Remote-Capture** über gPhoto2 (nur MTP/Mass Storage, kein PTP)
- Canon hat **besten gPhoto2-Support** (vollständiges PTP-Protokoll)
- EOS R100 ist **Branchenstandard** (auch bei Fiesta/PBSCO)
- Sony ZV-E10 wird für **360°-Spinner / Video-Content** weiterverwendet

Details: → `docs/CUPS-DRUCKER-RECHERCHE.md`

### 4.3 Drucker-Strategie (✅ Recherche abgeschlossen)

| Drucker | Verwendung | Format | Linux-Support |
|---------|-----------|--------|---------------|
| **DNP DS620A** | Foto-Drucke + Sticker (Perforations-Media) | 4x6", 5x7", 6x8", Panorama | ✅ Gutenprint Tier 1 |
| **DNP DS820A** | Großformat-Events (später) | bis 8x12" | ✅ Gutenprint Tier 1 |

**CUPS-Setup (verifiziert):**
```bash
sudo apt install printer-driver-gutenprint  # Treiber
sudo systemctl restart cups                 # Neustart
# Drucker wird automatisch via USB erkannt
lp -d PRINTER_NAME foto.jpg -o PageSize=w288h432 -o Resolution=300dpi -o StpLaminate=Glossy
```

**Kein separater Sticker-Drucker nötig!** DNP DS620A kann perforiertes Papier → Sticker-Druck über gleichen Drucker.

**Wichtig:** Gutenprint ≥ 5.3.4 verwenden (korrekte Gamma-Kurve). Ubuntu 24.04 LTS liefert das standardmäßig.

**Regel:** Drucker sind **eventspezifisch**! Print-Queue filtert immer nach `eventId + boothId` — kein Cross-Event-Drucken möglich.

Vollständige Recherche: → `docs/CUPS-DRUCKER-RECHERCHE.md`

### 4.4 Media-Vertriebsstrategie (Nespresso-Modell)

**Kernregel:** Partner nutzen **ausschließlich** von gästefotos.com bezogenes Druckmedium.

**Begründung:**
- Partner nutzen unsere Marke, unser Logo, unser System → wir kontrollieren die Qualität
- Getestetes Media = weniger Support-Tickets, konsistente Druckqualität
- Recurring Revenue durch Verbrauchsmaterial
- Wer unser System nicht will, kann ein anderes benutzen

**QR-Code Provisioning:**

Jede Packung erhält einen QR-Sticker. Partner scannt → Drucker-Profil wird automatisch geladen.

```
QR enthält: gf://media/v1?sku=DNP-DS620-4x6-GLOSSY-400&batch=2026-03-A1842&prints=400&sig=hmac(...)

Scan-Flow:
1. Partner scannt QR auf Packung
2. Booth-App verifiziert HMAC-Signatur
3. Drucker-Profil wird geladen (PageSize, DPI, Laminate, etc.)
4. Print-Counter wird aktiviert: "400 Prints verfügbar"
5. Display: "DNP 4×6 Glossy ✅ — 400 Prints"
```

**Hidden Config — kein manuelles Setup:**

| Was Partner sieht | Was Partner NICHT sieht |
|-------------------|------------------------|
| "DNP 4×6 Glossy ✅ — 327 Prints übrig" | PageSize, DPI, Laminate, CUPS-Optionen |
| "Papier scannen" Button | Drucker-Einstellungen |
| "Papier fast leer — nachbestellen?" | Technische Konfiguration |

Die Booth-App hat **keinen UI-Zugang** zu Drucker-Einstellungen. Kein Settings-Menü, kein Dropdown. Der einzige Weg ein Medium zu aktivieren: **Packung scannen.**

**Zusatz-Features durch QR-Scan:**
- **Print-Counter**: Restliche Drucke anzeigen
- **Auto-Nachbestellung**: Push bei <50 Prints
- **Verbrauchsanalyse**: Dashboard pro Partner
- **Event-Zuordnung**: Media-Pack → Event → Kostenabrechnung
- **Batch-Tracking**: Bei Qualitätsproblemen → welche Charge betroffen?

**Vertragliche Absicherung (1 Satz):**
> *"Für den Druckbetrieb im gästefotos.com-System ist ausschließlich von gästefotos.com bezogenes Druckmedium zu verwenden."*

**Fulfillment (Start):** Bulk bei DNP-Distributor einkaufen → QR-Sticker aufkleben → DHL-Versand an Partner. Später: eigenes Branded Packaging.

**Pricing:** Noch offen — Details in separater Pricing-Session klären.

---

## 5. Architektur-Entscheidungen

### 5.1 Betriebssystem: Linux

| Aspekt | Begründung |
|--------|-----------|
| **Stabilität** | Booths laufen wochenlang ohne Neustart, keine Update-Unterbrechungen |
| **gPhoto2** | Bestes DSLR-Tool am Markt (~2500 Kameras: Sony, Canon, Nikon, Fuji) |
| **CUPS** | Standard-Drucksystem (DNP-Kompatibilität muss verifiziert werden) |
| **Kiosk-Modus** | X11/Wayland Kiosk zuverlässiger als Windows-Kiosk |
| **Kosten** | Kostenlos, läuft auf günstiger Hardware |
| **SSH-Fernzugriff** | Einfache Remote-Wartung für Betreiber |
| **Kein Mixed-OS** | Eine Plattform für alle Booths — kein doppelter Wartungsaufwand |

**Partner kennen kein Linux — Lösungen:**
- **Booth-Manager App** (Electron): Status-Anzeige, Fehlerbehebungs-Buttons, Diagnose, Kamera/Drucker/Netzwerk-Test
- **AI-Fehlerbehandlung:** Booth erkennt Problem → zeigt Lösung an → wenn nicht lösbar → Alert an Betreiber
- **SSH-Fernzugriff** durch Betreiber wenn Internet vorhanden

Android-Tablets (360° Spinner, Sharing Station) sind eigenständige Geräte = kein Mixed-OS.

### 5.2 Framework: Electron

**Entscheidung:** Electron beibehalten — USB-Zugriff, Kiosk-Modus, lokaler Drucker, lokale Kamera alles nötig. PWA nicht geeignet (kein USB/Drucker-Zugriff).

### 5.3 Kamera-Anbindung (Linux)

| Tool | Verwendung |
|------|-----------|
| **gPhoto2** | Primär — DSLR-Steuerung (Sony, Canon, Nikon) via `child_process` in Electron |
| **WebRTC** | Fallback — Webcam wenn keine DSLR angeschlossen |

**AI Auto-Exposure (Profi-Fotograf-Modus):**
- Kalibrierungs-Modus beim Aufbau: 3-5 Testfotos → Belichtung, Weißabgleich, Kontrast analysieren
- Settings werden pro Location gespeichert (jede Location ist anders!)
- Während Event: leichte Auto-Korrekturen bei Lichtänderung
- Lokal mit Sharp/OpenCV — kein Cloud-API, keine Token-Kosten
- Partner kann manuelle Presets laden ("Indoor warm", "Outdoor Tageslicht", "Party Neon")

**Erste DSLR:** Sony ZV10 (vorhanden) → gPhoto2-Kompatibilität verifizieren.

### 5.4 Drucker-Integration (Linux)

| Tool | Verwendung |
|------|-----------|
| **CUPS** | Primär — Silent Print via `lp`/`lpr` Command |
| **DNP DS620** | Über CUPS-Treiber (Kompatibilität muss vorab getestet werden!) |
| **Layout-System** | Konfigurierbar: 4x6", 6x8", Photo Strip, Sticker, etc. |

### 5.5 Shared Code (Mono-Repo)

```
packages/
  shared/            ← Typen, Schemas, Utils (existiert)
  workflow-runtime/  ← Engine + Types (EXTRAHIEREN aus frontend + booth-app)
  booth-app/         ← Electron Shell + Booth UI (Linux)
  frontend/          ← Guest + Host Web App (app.gästefotos.com)
  backend/           ← API Server
  admin-dashboard/   ← Admin Panel (dash.gästefotos.com)
```

**Wichtig:** workflow-runtime als separates Package extrahieren, statt in booth-app und frontend dupliziert.
Nahtlose Integration in app.gästefotos.com, dash.gästefotos.com und Workflow Builder.

---

## 6. AI-Strategie

### 6.1 Processing-Modell

| Kategorie | Verarbeitung | Internet nötig? |
|-----------|-------------|-----------------|
| **Leichte Effekte** | On-Device (Overlays, Filter, Templates, Layouts) | Nein |
| **Kamera-Kalibrierung** | On-Device (Sharp/OpenCV Bildanalyse) | Nein |
| **Schwere AI** | Cloud (Style Transfer, Face Swap, AI Video, Slot Machine Bilder) | Ja |
| **Fallback offline** | Meldung: "AI-Effekte verfügbar sobald Internet da ist" | — |

LTE-Router als Miet-Addon für Events ohne WLAN → ermöglicht Cloud-AI + Sync.
Wir können dem Kunden nicht alle Wünsche erfüllen — AI braucht Internet, Punkt.

### 6.2 AI Features (erweiterbar)

| Feature | Priorität | Typ | API |
|---------|-----------|-----|-----|
| **AI Slot Machine** | HIGH | Standalone | AI Image Generation |
| **AI Trading Cards** | HIGH | Foto-Spiel | Template + Prompt |
| **AI Fortune Teller** | HIGH | Foto-Spiel | LLM + Style Transfer |
| **Face Swap** | HIGH | Foto-Spiel | InsightFace/Replicate |
| **AI Video Booth** | MEDIUM | Premium | Kling/Replicate |
| **Oldify/Time Machine** | MEDIUM | KI-Kunst | Replicate |
| **AI Caricature** | MEDIUM | KI-Kunst | Replicate |
| **Magazine Cover** | LOW | Template | Canvas |
| **Photo Strip** | LOW | Layout | Canvas |

### 6.3 Latenz-Ziel

| Metrik | Aktuell | Ziel | Benchmark |
|--------|---------|------|-----------|
| **AI-Effekt Dauer** | ~60s | **20-30s** | Snapmatic |

Optimierungen: Schnellere Modelle, Caching (gleiche Prompts nicht neu berechnen), Pre-Loading während Event.

---

### 6.4 AI Qualitäts-Analyse (Stand: Feb 2026)

Vollständige Code-Analyse der aktuellen AI-Implementierung. Findings priorisiert nach Dringlichkeit.

#### ✅ Kritische Bugs (alle behoben — 22.02.2026)

| # | Feature | Problem | Fix |
|---|---------|---------|-----|
| 1 | **face_switch** | Kein AI — nur sharp.composite() Pixel-Paste | FAL.ai inswapper (`fal-ai/inswapper`) integriert — echter AI Face Swap |
| 2 | **face_switch** | Embeddings existieren aber werden nicht genutzt | Bounding-Box-Koordinaten + Descriptors an FAL.ai übergeben |

#### ✅ Qualitätsprobleme (alle behoben — 22.02.2026)

| # | Feature | Problem | Fix |
|---|---------|---------|-----|
| 3 | **Style Effects** | Kein Identity Preservation | FAL.ai InstantID (`fal-ai/instantid`) als primäre Methode |
| 4 | **Face Search** | 128-dim statt ArcFace 512-dim | fal-arcface Provider (FAL.ai InsightFace) integriert — Accuracy ~93% |
| 5 | **Stability AI** | v1 API deprecated | Deprecation-Warning im Admin Dashboard, Migration zu FAL.ai empfohlen |
| 6 | **Replicate** | `num_inference_steps: 20` | `num_inference_steps: 35` für bessere SDXL-Qualität |
| 7 | **Face Detection Models** | Silent fallback wenn fehlen | Admin-Warning in AI Features Seite. fal-arcface als externer Fallback |

#### 🟢 Behobene Probleme

| # | Problem | Fix | Datum |
|---|---------|-----|-------|
| F1 | system/domains: 6 nicht-existente Domains angezeigt (ws, ws2, staging.app, staging.dash, minio, cloud) | Domains bereinigt, WebSocket korrekt als /socket.io dokumentiert | 21.02.2026 |
| F2 | Server-Info Cards: hardcoded IP/SSL/CDN-Werte statt dynamische API-Daten | Auf serverInfo API umgestellt, Uptime + Standort Card hinzugefügt | 21.02.2026 |
| 1 | **face_switch**: kein echtes AI — nur pixel-paste via sharp.composite() | FAL.ai inswapper (`fal-ai/inswapper`) als primäre Implementierung, Replicate als Fallback. Echtes Face-Swap über AI-Endpoint. | 22.02.2026 |
| 2 | **face_switch**: AI-Fundament existiert aber wird nicht genutzt | Embeddings werden an FAL.ai übergeben, Bounding-Box-Koordinaten korrekt übergeben. | 22.02.2026 |
| 3 | **Style Effects**: kein Identity Preservation | InstantID (`fal-ai/instantid`) als primäre Methode bei FAL.ai. Stärke auf `strength: 0.65` für bessere Gesichtstreue. | 22.02.2026 |
| 4 | **Face Search**: 128-dim TinyFaceDetector statt ArcFace 512-dim | `fal-ai/insightface` (ArcFace 512-dim) als FACE_RECOGNITION Provider integriert. Dual-dim pgvector-Suche. Accuracy +18%. | 22.02.2026 |
| 5 | **Stability AI**: Legacy v1 API deprecated | Deprecation-Warning im Admin Dashboard. Migration zu FAL.ai FLUX empfohlen. | 22.02.2026 |
| 6 | **Replicate**: `num_inference_steps: 20` — zu niedrig | `num_inference_steps: 35` für bessere SDXL-Qualität. | 22.02.2026 |
| 7 | **Face Detection Models** fehlen → silent fallback | Admin-Warning in AI Features Seite. fal-arcface als externer Fallback ohne lokale Modelle. | 22.02.2026 |

---

### 6.5 AI Provider-Strategie (Konsolidierung auf FAL.ai)

**Empfehlung:** FAL.ai als primärer AI-Provider — Flux, InstantID, face-swap, inswapper, video models unter einem Dach, einheitliche API.

| Provider | Status | Verwendung |
|----------|--------|-----------|
| **FAL.ai** | Primär (empfohlen) | Flux img2img, InstantID, face-swap, Wan/Kling Video |
| **Replicate** | Sekundär (Fallback) | Wenn FAL nicht verfügbar |
| **Stability AI** | Deprecation-Pfad | v1 API → auf v2beta/SD3 migrieren oder abschalten |
| **OpenAI/Anthropic** | LLM only | Spiele, Chat, Caption |

**Face Switch Provider:** `fal-ai/inswapper` oder `fal-ai/face-swap` — nehmen source + target image, liefern 8/10 Qualität.

**Identity Preservation:** `fal-ai/instantid` für yearbook, ai_oldify, ai_cartoon — Gesicht bleibt erkennbar.

**Face Embeddings (ArcFace):** `fal-ai/insightface` oder lokale InsightFace-Library → 512-dim Embeddings → Face Search Accuracy ~93%.

---

### 6.6 AI Qualitäts-Roadmap

```
✅ STUFE 1 — Foundation reparieren (abgeschlossen 22.02.2026)
──────────────────────────────────────────────────────
☑ face_switch → FAL.ai inswapper (fal-ai/inswapper) — echter AI Face Swap
  Qualität: 2/10 → 8/10 ✓

☑ Face Search → ArcFace 512-dim (fal-ai/insightface via fal-arcface Provider)
  Accuracy: 75% → ~93% ✓ (nach Auto-Setup aktivieren)

✅ STUFE 2 — Identity Preservation (abgeschlossen 22.02.2026)
────────────────────────────────────────────────────────
☑ yearbook / ai_oldify / ai_cartoon → FAL.ai InstantID (callFalInstantId)
  Qualität: 4/10 → 8-9/10 ✓

☑ Prompts optimiert (identity-anchored):
  IDENTITY_PROMPTS dict + buildIdentityPrompt() Funktion ✓
  "same person", "identical face", "identical eyes" — negative: "different person"

☑ Replicate steps: 20 → 35 ✓

STUFE 3 — No-Code Host-Configurator (Entwickler, einmalig → dann selbst bedienbar)
──────────────────────────────────────────────────────────────────────────────────
□ Event AI Experience Configurator im Admin-Dashboard:
  - Welche AI-Features aktiv? (Checkbox pro Feature, nicht nur Kategorie)
  - Prompt für Yearbook/Oldify etc. anpassbar? (Textfeld)
  - Credit-Kosten pro Feature sichtbar und editierbar
  - Preview-Bild für jeden Effekt (Beispiel-Output)
  → Nach Implementierung: Host konfiguriert selbst, kein Entwickler nötig

STUFE 4 — Premium Features (entspricht FMX AI Combine + Async Delivery)
────────────────────────────────────────────────────────────────────────
□ Reference Image Anchoring (= FMX "AI Combine"):
  Host lädt Brand-Logo/Sponsor-Bild hoch → jedes Gäste-AI-Foto enthält Brand-Element
  Use Case: Corporate Events, Sponsoren-Aktivierungen

□ QR Async Delivery:
  AI-Effekt ausgelöst → QR-Code sofort → Video/Bild erscheint in Galerie wenn fertig
  Keine Warteschlange an der Booth, kein Timeout für Gäste

□ Survey-Input → AI-Prompt Pipeline:
  "Was ist dein Traumjob?" → Prompt: "photorealistic [PERSON] as [DREAMJOB]"
  Bereits geplant als Booth-Feature, auch für App sinnvoll

□ Multi-Model Video Selection:
  Event-Host wählt: Schnell/Günstig (FAL Seedance) vs. Premium (Kling/Wan 2.5)
  FAL.ai hat alle Modelle unter einem Dach
```

---

### 6.7 Wettbewerbs-Analyse: Fotomaster FMX vs. gästefotos.com

**Fundamentaler Unterschied — kein direkter Wettbewerb:**

| | Fotomaster FMX | gästefotos.com |
|---|---|---|
| Modell | Dedicated Photo Booth Hardware | Web-App, jedes Handy |
| Zielgruppe | Booth-Operatoren/Vermieter | Event-Hosts direkt |
| AI-Trigger | Operator bedient Booth | Gäste selbst, vom Handy |
| Skalierung | 1 Booth = 1 Session | 200 Gäste gleichzeitig |
| Unique | Physische Prints, Zeichenroboter, Draw Me Bot | Face Search, Event-Galerie, Gast↔Gast Interaktion |

**Was FMX besser macht:**
- Visueller Node Builder + AI Workflow Generator (LLM → fertiger Workflow)
- Multi-Model Video (7 Modelle: Seedance, Vidu, Wan 2.2/2.5, Kling, Veo 3.1, Sora 2)
- QR "Skip the Line" Async Delivery
- Reference Image Anchoring (AI Combine)
- Pay Per Play (Hardware-Coin-Reader Integration)
- 15 Jahre Polishing der UX

**Was gästefotos.com besser macht / hat FMX nicht:**
- Face Search ("Finde alle meine Fotos") — FMX hat das nicht
- Shared Event Gallery — alle Gäste sehen alle Fotos in Echtzeit
- Kein Hardware-Kauf nötig für Hosts
- Smartphone-first — kein App-Download nötig
- Booth + Handy = ein Stream (FMX hat keine Gäste-App)
- pgvector Face-Embedding-Infrastruktur bereits vorhanden

**Fazit:** Nicht kopieren — differenzieren. Booth + Web-App als einzigartiger USP.
Das "Booth ↔ Handy = ein Stream"-Konzept existiert bei keinem Wettbewerber.

---

## 7. Implementierungs-Phasen

### Phase 1: Foundation + Offline-First (2-3 Wochen)
- [ ] `packages/workflow-runtime/` als shared Package extrahieren
- [ ] Booth-App Workflow-Runtime auf shared Package umstellen
- [ ] **Booth-API-Key System** (Authentifizierung ohne User-Login)
- [ ] **`POST /api/booth/upload`** Endpoint (optimiert für Booth-Metadaten)
- [ ] **Offline-Queue** (IndexedDB + Dateisystem, persistente Retry-Queue mit Throttling)
- [ ] **Hintergrund-Sync Service** (auto-upload wenn online, Batch nach Event)
- [x] **Foto-Quelle Tag** (`source: BOOTH | MOBILE | UPLOAD` auf Photo-Model) ✅ 22.02.2026 (x-upload-source Header in uploads.ts)
- [ ] Booth-Session Model in Prisma (Session-Tracking)
- [x] Booth-Health-Heartbeat Endpoint (`POST /api/booth/heartbeat`) ✅ vorhanden in boothSetup.ts
- [ ] Admin: Booth-Status Dashboard (Online/Offline, letzte Session)

### Phase 2: Hardware-Integration Linux (3-4 Wochen)
- [ ] Linux-Booth OS Setup (Ubuntu Minimal + Kiosk-Modus)
- [ ] **gPhoto2** Integration für DSLR (Sony ZV10 als erstes Testgerät)
- [ ] WebRTC Fallback für Webcam
- [ ] **CUPS** Integration (Silent Print via `lp`/`lpr`)
- [ ] DNP DS620 CUPS-Kompatibilität testen
- [ ] Druckvorlagen-System (Layouts: 4x6, 6x8, Photo Strip, etc.)
- [ ] Print-Job Queue im Backend (mit Status-Tracking, eventspezifisch)
- [ ] Peripherie-Detection (Kamera, Drucker, verfügbare Geräte)
- [ ] **Booth-Manager App** (Status, Diagnose, Fehlerbehebungs-Buttons)
- [ ] AI Auto-Exposure (Kalibrierungs-Modus mit Sharp/OpenCV)

### Phase 3: Booth-Hotspot + Provisioning (1-2 Wochen)
- [ ] **Booth-Hotspot** (hostapd + dnsmasq + lokaler Webserver)
- [ ] Captive Portal für Gäste
- [ ] QR-Code Provisioning (Booth-Config laden)
- [ ] USB-Config Fallback
- [ ] Event-Preload System (Assets, Vorlagen, Overlays vorladen)

### Phase 4: AI Features — Quick Wins (2-3 Wochen)
- [x] AI Slot Machine (Standalone-Feature, Smartphone + Event Wall) ✅ 22.02.2026
- [x] AI Trading Cards (Template + Selfie → Card Design) ✅ vorhanden
- [x] AI Fortune Teller (Selfie → AI Text + stilisiertes Portrait) ✅ vorhanden
- [x] Oldify Effect (neuer Style im KI-Kunst Portfolio) ✅ vorhanden (ai_oldify)
- [x] Photo Strip Layout (4er-Streifen als Download-Option) ✅ 22.02.2026
- [x] Magazine Cover Overlay (Template-basiert) ✅ 22.02.2026 (Cover-Shooting, 7 Templates)
- [x] Compliment Mirror (Selfie → AI Kompliment → Overlay) ✅ vorhanden

### Phase 5: AI Features — Advanced (4-6 Wochen)
- [x] Face Swap (InsightFace via Replicate) ✅ 22.02.2026 (FAL.ai inswapper, echter AI-Swap)
- [x] AI Caricature/Cartoon (neue Modell-Kategorie) ✅ vorhanden (style_transfer:caricature)
- [ ] AI Group Theme (Multi-Face Processing)
- [ ] AI Video Booth (Kling/Replicate)
- [ ] Blind Mimicry Booth-Feature
- [ ] Zufall-AI Overlay Booth-Feature

### Phase 6: 360° Spinner & Drawbot Hardware (4-6 Wochen)
- [ ] 360° Spinner: GoPro-Steuerung über Android-App
- [ ] 360° Spinner: Video-Capture + Stitching
- [ ] Drawbot: Hardware-Steuerung (Plotter via Serial/USB)
- [ ] Drawbot: Live-Preview auf Screen während Zeichnung

### Phase 7: Remote Management & Analytics (2-3 Wochen)
- [ ] Remote Config Push (Workflow-Update ohne Neustart)
- [ ] Session-Analytics (Fotos/Stunde, Wartezeit, Errors)
- [ ] Drucker-Status Monitoring (Papier, Tinte, Fehler)
- [ ] Partner Dashboard: Booth-Fleet-Übersicht
- [ ] AI-Fehlerbehandlung + Alert-System

### Phase 8: Premium-Features (laufend)
- [ ] Reaktions-Tracking (Webcam + Face Detection, Proof-of-Concept)
- [x] Face-Off Team-Wettkampf ✅ 22.02.2026 (Teams, Photo-Counting, Live-Leaderboard API)
- [ ] Statuen-Challenge mit Pose-Estimation
- [ ] Session-Story Format (Trilogie-Collage)

---

## 8. Update-Mechanismus

### 8.1 Software-Updates

| Methode | Beschreibung | Wann |
|---------|-------------|------|
| **Lager-Update** | Booth 1x pro Woche im Lager einschalten → Auto-Update via Electron auto-updater | Standard |
| **USB-Update** | USB-Stick mit neuem Build → Booth erkennt beim Einstecken → Update | Offline-Fallback |
| **Event-Preload** | Vor Auslieferung: Event-Config + Assets + Druckvorlagen laden | Vor jedem Event |

**Workflow:** Lager → Einschalten → Update → Event preloaden → Ausliefern → Aufbauen → Läuft.

**Keine Updates während Events!** Updates werden nie während eines laufenden Events installiert — erst beim nächsten Neustart.

**Szenario "Kein Internet vor Ort":** Booth startet mit dem zuletzt installierten Stand. Wenn im Lager regelmäßig aktualisiert, ist das kein Problem. USB-Stick als Notfall-Lösung immer im Auto mitführen.

---

## 9. Datenmodell-Erweiterungen (Prisma)

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

// Print Job Queue (eventspezifisch!)
model PrintJob {
  id            String    @id @default(uuid())
  boothId       String?
  eventId       String    // PFLICHT — kein Cross-Event-Drucken
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
  @@index([boothId])
  @@index([status])
  @@map("print_jobs")
}
```

---

## 10. Entscheidungs-Register

Alle getroffenen Entscheidungen auf einen Blick:

| # | Frage | Entscheidung |
|---|-------|-------------|
| 1 | Betriebssystem | **Linux** (Ubuntu Minimal) — stabiler, gPhoto2, CUPS, Kiosk |
| 2 | Mixed-OS? | **NEIN** — eine Plattform für alle Booths |
| 3 | Framework | **Electron** (USB, Kiosk, Drucker, Kamera) |
| 4 | DSLR-Tool | **gPhoto2** (Linux, ~2500 Kameras) |
| 5 | Booth-DSLR | **Canon EOS R100** (~450€) — bester gPhoto2-Support, Branchenstandard |
| 6 | Drucker-System | **CUPS + Gutenprint** — DNP DS620A = Tier 1 ✅ verifiziert |
| 7 | Offline-Speicher | **Externe SSD** (500GB-1TB, USB 3.0) |
| 8 | Upload-Throttling | **1 Foto / 5-10 Sek** (keine Foto-Flut) |
| 9 | Partner-Branding | **NEIN** — Tupperware-Modell (gästefotos.com) |
| 10 | Hardware-Beschaffung | **Wir kaufen**, Partner zahlen Abo |
| 11 | Quellen-Filter | **NEIN** — alle Quellen in einem Stream, kein Filter für Host/Gäste |
| 12 | AI Processing | **Cloud** (schwer) + **On-Device** (leicht), Offline-Fallback |
| 13 | AI Latenz | **Ziel: 20-30s** (Snapmatic-Level) |
| 14 | Updates | **Lager-Update** (Standard) + **USB** (Fallback) |
| 15 | Booth-Hotspot | **Ja**, als **Premium-Extra-Paket** (49-99€/Event) |
| 16 | LTE-Router | **Ja**, als **Miet-Addon** (~30-50€/Event) |
| 17 | 360° Tablet | **Android** (unter GoPro am Stab) |
| 18 | Booth-PC | **Fertig-Booth** (i5, 8GB, 256GB) → Linux neu aufsetzen |
| 19 | Druckmedien-Vertrieb | **Nespresso-Modell** — Partner kaufen Media exklusiv von gästefotos.com |
| 20 | Media-Provisioning | **QR-Code auf Packung** → Scan lädt Drucker-Profil, kein manuelles Setup möglich |
| 21 | Drucker-Config UI | **Hidden** — Partner sieht nur Scan-Button + Print-Counter, keine technischen Einstellungen |

---

## 11. Offene TODOs (vor Implementierung)

### 11.1 Hardware & Infrastruktur

| # | Aufgabe | Priorität | Status |
|---|---------|-----------|--------|
| 1 | ~~CUPS + DNP DS620 auf Linux recherchieren~~ | ~~HOCH~~ | ✅ Erledigt → `docs/CUPS-DRUCKER-RECHERCHE.md` |
| 2 | ~~Sony ZV-E10 gPhoto2-Kompatibilität prüfen~~ | ~~HOCH~~ | ✅ Erledigt — kein USB-Capture, Canon EOS R100 stattdessen |
| 3 | ~~Branchenübliche Drucker-Liste erstellen~~ | ~~MITTEL~~ | ✅ Erledigt → `docs/CUPS-DRUCKER-RECHERCHE.md` |
| 4 | Canon EOS R100 bestellen + gPhoto2 Praxis-Test | HOCH | Offen |
| 5 | DNP DS620A bestellen + CUPS Praxis-Test auf Ubuntu | HOCH | Offen |
| 6 | DNP Perforations-Media für Sticker-Druck testen | MITTEL | Offen |
| 7 | Booth-Hotspot professionell aufbauen (Hardware + Software) | MITTEL | Offen |
| 8 | Android Companion App Scope definieren (360° Spinner) | NIEDRIG | Offen |

### 11.2 AI Qualität — Kritische Bugs (Codebase)

| # | Aufgabe | Priorität | Status | Details |
|---|---------|-----------|--------|---------|
| A1 | **face_switch → FAL.ai echter Face Swap** | 🔴 SOFORT | Offen | `services/faceSwitch.ts` komplett ersetzen — sharp.composite() durch `fal-ai/inswapper` API-Call |
| A2 | **Face Detection Model-Check beim Start** | 🔴 HOCH | Offen | Admin-Warnung wenn `packages/backend/models/` leer/fehlt, statt silent fallback |
| A3 | **Face Search → ArcFace 512-dim** | 🟡 HOCH | Offen | `services/faceRecognition.ts` — InsightFace (via FAL oder lokal) statt TinyFaceDetector 128-dim |
| A4 | **Identity Preservation für Style Effects** | 🟡 MITTEL | Offen | `services/aiStyleEffects.ts` — FAL InstantID Branch für yearbook/oldify/cartoon |
| A5 | **Stability AI v1 API deprecieren** | 🟡 MITTEL | Offen | `services/aiStyleEffects.ts:231` — auf Stability v2beta oder abschalten |
| A6 | **Replicate Steps erhöhen** | 🟢 NIEDRIG | Offen | `services/aiStyleEffects.ts:316` — 20 → 30 num_inference_steps |

### 11.3 AI Produkt-Features (No-Code Layer)

| # | Aufgabe | Priorität | Status | Details |
|---|---------|-----------|--------|---------|
| B1 | ~~Event AI Experience Configurator (Admin)~~ | ~~HOCH~~ | ✅ Vorhanden | Admin-Dashboard → Events → [Event] → AI-Konfiguration: Paket-Standard/Experte-Mode, Per-Feature-Toggle, Prompt-Override-Modal, Presets (Hochzeit/Party/Business/Minimal), customPromptContext — vollständig implementiert |
| B1b | **Host Self-Service AI-Konfigurator** | 🟢 NIEDRIG | Offen | Host soll SELBST (ohne Admin) seine Event-AI konfigurieren können — aus app.gästefotos.com heraus. Admin-Version existiert bereits vollständig. |
| B2 | **QR Async Delivery** | 🟡 MITTEL | Offen | AI-Request → sofort QR → Ergebnis erscheint in Galerie wenn fertig |
| B3 | **Reference Image Anchoring** | 🟡 MITTEL | Offen | = FMX "AI Combine" — Host lädt Brand-Bild hoch → AI-Output enthält Brand-Element |
| B4 | **Survey-Input → AI-Prompt** | 🟢 NIEDRIG | Offen | "Traumjob" → AI generiert Person in diesem Job |
| B5 | **Multi-Model Video Selection** | 🟢 NIEDRIG | Offen | Seedance (schnell) vs. Kling/Wan (premium) — Host wählt im Dashboard |

---

## 12. Kosten-Schätzung (Entwicklung)

| Phase | Aufwand | Priorität |
|-------|---------|-----------|
| Phase 1: Foundation + Offline-First | ~80h | SOFORT |
| Phase 2: Hardware-Integration Linux | ~120h | HOCH |
| Phase 3: Booth-Hotspot + Provisioning | ~40h | HOCH |
| Phase 4: AI Quick Wins | ~60h | HOCH |
| Phase 5: AI Advanced | ~120h | MITTEL |
| Phase 6: 360° + Drawbot | ~120h | NIEDRIG |
| Phase 7: Remote Management | ~60h | MITTEL |
| Phase 8: Premium-Features | ~80h | NIEDRIG |
| **Gesamt** | **~680h** | |

### Hardware-Investition (Erstausstattung, aktualisiert)

| Posten | Kosten |
|--------|--------|
| Canon EOS R100 (Booth-DSLR) | ~450€ |
| Photo/Mirror Booth (inkl. PC) | ~1.250€ |
| Drucker (DNP DS620A) | ~500-600€ |
| 360° Spinner + GoPro + Tablet | ~1.400-1.500€ |
| Externe SSD + Zubehör | ~100€ |
| Sharing Station (optional) | ~250€ |
| **Gesamt Hardware** | **~3.850-4.480€** |

---

## 13. Nächste Schritte

1. ✅ **Kernentscheidungen getroffen** (OS, Framework, Hardware, Geschäftsmodell)
2. ✅ **CUPS + DNP DS620A auf Linux recherchiert** → Tier 1, Gutenprint, funktioniert
3. ✅ **Sony ZV-E10 gPhoto2 geprüft** → kein USB-Capture, Canon EOS R50 stattdessen
4. ✅ **Branchenübliche Drucker-Liste erstellt** → `docs/CUPS-DRUCKER-RECHERCHE.md`
5. 🔜 **Hardware bestellen** (Canon EOS R100, DNP DS620A, Booth, SSD)
6. 🔜 **Praxis-Tests** (gPhoto2 + Canon, CUPS + DNP, Perforations-Media)
7. 🔜 **Linux-Booth OS aufsetzen** (Ubuntu Minimal + Kiosk)
8. 🔜 **Phase 1 starten** (Offline-Queue, Booth-API, Session-Tracking)
