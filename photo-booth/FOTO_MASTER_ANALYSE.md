# Foto Master Software - Detailanalyse & Nachbau-Machbarkeit

**Erstellt:** 2026-01-29  
**Ziel:** Analyse der Foto Master Software, Preisstruktur und Machbarkeit eines eigenen Nachbaus

---

## 1. Was ist Foto Master?

**Foto Master** ist ein israelisches Unternehmen, das sich auf Photo Booth Hardware und Software spezialisiert hat. Sie bieten:

- **Hardware:** Photo Booths, Magic Mirrors, 360° Booths, etc.
- **Software:** FMX (Photo Booth Software für Windows/iPad)
- **Cloud-Plattform:** Foto Master Cloud mit AI-Features
- **Services:** 24/7 Support, Lead Distribution, Content-Bibliothek

### Technologie-Stack (Cloud-Plattform)
```
Frontend:     Next.js (React)
Backend:      Node.js (vermutlich)
Hosting:      Vercel / AWS
AI-Services:  Eigene Modelle + Cloud-APIs
Auth:         JWT + ReCaptcha Enterprise
Analytics:    Google Tag Manager, Clarity
i18n:         Lingui (Multi-Language)
```

---

## 2. Preisstruktur (Stand: Januar 2026)

### Software-Lizenzen (monatlich, jährlich abgerechnet)

| Software | Preis/Monat/Gerät |
|----------|-------------------|
| **FMX For Windows** | $33 |
| **FMX For iPad** | $32 |
| **DMBot (MacOS)** | $59 |
| **AGWall (Air Graffiti)** | $79 |
| **Photo Mosaic Wall** | $99 |
| **Selfie Wi-Fi** | $29 |
| **Slideshow** | Kostenlos (in Cloud enthalten) |

### Cloud-Pläne

| Plan | Preis/Monat | Features |
|------|-------------|----------|
| **Basic** | $39/Firma | 5GB Storage, Public Galleries, Standard AI-Preise |
| **Pro** | $79/Firma | 10GB Storage, Private Galleries, White-Label, 50% AI-Rabatt |

### AI-Feature Kosten (Pay-per-Use)

| Feature | Basic-Preis | Pro-Preis |
|---------|-------------|-----------|
| AI Background Removal | $0.07 | $0.03 |
| AI Headshot | $0.15 | $0.07 |
| AI Face Swap | $0.15 | $0.07 |
| AI Cartoons | $0.10 | $0.05 |
| AI StylePop | $0.15 | $0.09 |
| AI Draw Me | $0.14 | $0.07 |
| AI Line 2 Life | $0.14 | $0.07 |
| AI Group Headshot | $0.17 | $0.09 |
| AI Sharpener | $0.10 | $0.05 |
| AI Face Cutout | $0.07 | $0.03 |
| AI Age Detection | Kostenlos | Kostenlos |
| AI Gender Detection | Kostenlos | Kostenlos |
| AI Image Creation | $0.25 | $0.25 |
| AI Video Creation | $2.00 | $2.00 |
| AI Voice Creation | $0.10 | $0.10 |
| AI Palm Reading | $0.14 | $0.07 |
| AI Modify (GPT-Image) | $0.16-$0.35 | $0.08-$0.25 |

### Zusätzliche Kosten

| Service | Preis |
|---------|-------|
| **24/7 Support** | $27/Monat/Lizenz |
| **Extra Storage** | $2/GB (Basic) / $1/GB (Pro) |
| **SMS (Cloud)** | Pay-per-Use + Carrier Fees |

### Beispiel: Gesamtkosten für FiestaPics (geschätzt)

```
1x FMX Windows Lizenz:     $33/Monat
1x Cloud Basic:            $39/Monat (1x pro Firma)
1x 24/7 Support:           $27/Monat
AI-Credits (geschätzt):    ~$50-100/Monat
────────────────────────────────────────
MINIMUM pro Booth:         ~$150-200/Monat = €140-185/Monat
```

**Bei 5 Booths:** ~$750-1000/Monat = **€700-930/Monat**

---

## 3. Feature-Übersicht FMX Software

### Core Features
- **Photo/Video Capture:** DSLR, Webcam, iPad Kamera
- **Experiences:** Stills, Strips, GIF, Boomerang, Video, Green Screen
- **Workflow Builder:** No-Code Builder für Event-Flows
- **Layout Builder:** Overlay/Template Designer
- **Video Builder:** Video-Effekte und Outputs

### Sharing
- **Print:** Thermosublimation-Drucker (DNP, HiTi, etc.)
- **Email:** Via Cloud (Templates, Branding)
- **SMS:** Via Cloud (Virtual Numbers, Inbound)
- **QR-Code:** Instant-Sharing
- **Online Gallery:** Mit White-Label Option

### AI-Features (Cloud)
- Background Removal (ohne Greenscreen)
- Face Swap
- Headshot / Group Headshot
- StylePop (Cartoon-Effekte)
- Draw Me (Zeichnung)
- Line 2 Life (Zeichnung animieren)
- Age/Gender Detection
- AI Overlay Creator
- AI Workflow Generator
- AI Animation Builder

### Profi-Tools
- Access Codes (Event-Schutz)
- Disclaimers (DSGVO)
- Surveys & Data Capture
- Pay-Per-Play (Münzeinwurf)
- Live Analytics

---

## 4. Machbarkeit eines Nachbaus

### 4.1 Was kann nachgebaut werden?

| Feature | Machbarkeit | Aufwand | Kommentar |
|---------|-------------|---------|-----------|
| **Photo Capture (Web)** | ✅ Einfach | 1-2 Tage | WebRTC/getUserMedia |
| **Video Capture** | ✅ Einfach | 1-2 Tage | MediaRecorder API |
| **GIF/Boomerang** | ✅ Mittel | 1 Woche | Canvas + gif.js |
| **Overlay/Templates** | ✅ Mittel | 1-2 Wochen | Canvas/SVG Compositing |
| **Layout Builder** | ⚠️ Komplex | 3-4 Wochen | Drag-Drop Editor |
| **Workflow Builder** | ⚠️ Komplex | 4-6 Wochen | State Machine + UI |
| **Online Gallery** | ✅ Haben wir | - | Bereits implementiert |
| **QR-Code Sharing** | ✅ Haben wir | - | Bereits implementiert |
| **Email Sharing** | ✅ Haben wir | - | Bereits implementiert |
| **SMS Sharing** | ⚠️ Mittel | 1-2 Wochen | Twilio/MessageBird |
| **Print Support** | ❌ Hardware | N/A | Braucht lokale Software |
| **AI Background Removal** | ✅ Einfach | 1-2 Tage | remove.bg API / Replicate |
| **AI Face Swap** | ⚠️ Mittel | 1 Woche | Replicate / InsightFace |
| **AI Headshot** | ⚠️ Mittel | 1 Woche | Replicate / Photoroom |
| **AI StylePop/Cartoon** | ⚠️ Mittel | 1 Woche | Replicate / Stable Diffusion |
| **AI Draw Me** | ⚠️ Mittel | 1-2 Wochen | Stable Diffusion + ControlNet |
| **White-Label** | ✅ Mittel | 1-2 Wochen | Custom Domains + Branding |
| **Pay-Per-Play** | ❌ Hardware | N/A | Nayax/Intercard Integration |

### 4.2 Was NICHT sinnvoll nachzubauen ist

1. **Windows Desktop-Software** - Wir sind Web-basiert, das ist unser Vorteil
2. **Hardware-Integration** (Drucker, DSLR, Münzeinwurf) - Nicht unser Modell
3. **iPad-App** - Könnte als PWA funktionieren, aber Desktop-App nicht sinnvoll

### 4.3 Empfohlene Nachbau-Strategie

**Fokus auf Web-First AI-Features für Self-Service:**

```
PHASE 1 (2-4 Wochen): AI-Grundlagen
├── AI Background Removal (remove.bg oder Replicate)
├── AI Face Detection (bereits haben wir!)
└── Integration in Upload-Flow

PHASE 2 (4-6 Wochen): AI-Effekte
├── AI StylePop (Cartoon/Art Styles)
├── AI Headshot Enhancement
├── AI Filter-Galerie
└── Live-Preview vor Upload

PHASE 3 (6-8 Wochen): Advanced
├── Face Swap (optional, komplex)
├── GIF/Boomerang Capture
├── Video-Aufnahme
└── AI Overlay Generator
```

---

## 5. Kosten-Vergleich: Kaufen vs. Bauen

### Option A: Foto Master Lizenz kaufen

| Position | Monat | Jahr |
|----------|-------|------|
| 1x FMX Windows | $33 | $396 |
| Cloud Basic | $39 | $468 |
| 24/7 Support | $27 | $324 |
| AI Credits (~50 Events) | ~$100 | ~$1.200 |
| **GESAMT** | **~$199** | **~$2.388** |

**Pro Booth, pro Jahr: ~€2.200**

### Option B: Eigene AI-Features bauen

| Position | Einmalig | Monat |
|----------|----------|-------|
| Entwicklungszeit (~8 Wochen) | ~€8.000-12.000 | - |
| AI-API Kosten (Replicate/remove.bg) | - | ~€50-100 |
| Server/Hosting (bereits haben wir) | - | €0 |
| **GESAMT Jahr 1** | | **~€8.600-13.200** |
| **GESAMT ab Jahr 2** | | **~€600-1.200** |

### Fazit: Break-Even

- **Bei 1 Booth:** Foto Master günstiger (wir brauchen keine Desktop-Software)
- **Bei 5+ Booths:** Eigene Lösung rechnet sich ab Jahr 2
- **Für SaaS-Modell:** Eigene AI-Features sind Pflicht für Wettbewerbsfähigkeit

---

## 6. Technische Implementierung (AI-Features)

### 6.1 AI Background Removal

**Option 1: remove.bg API**
```typescript
// Preis: $0.09-0.20 pro Bild (je nach Volumen)
const response = await fetch('https://api.remove.bg/v1.0/removebg', {
  method: 'POST',
  headers: { 'X-Api-Key': process.env.REMOVE_BG_API_KEY },
  body: formData
});
```

**Option 2: Replicate (rembg)**
```typescript
// Preis: ~$0.002-0.01 pro Bild
import Replicate from 'replicate';
const replicate = new Replicate();
const output = await replicate.run(
  "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
  { input: { image: imageUrl } }
);
```

**Option 3: Self-Hosted (u2net)**
```typescript
// Kostenlos, aber GPU-Server nötig (~$50-100/Monat)
// Oder: CPU-Variante (langsamer, ~5-10s pro Bild)
```

### 6.2 AI StylePop (Cartoon-Effekte)

**Replicate (Stable Diffusion + ControlNet)**
```typescript
const output = await replicate.run(
  "jagilley/controlnet-canny:aff48af9c68d162388d230a2ab003f68d2638d88307bdaf1c2f1ac95079c9613",
  {
    input: {
      image: imageUrl,
      prompt: "cartoon style portrait, vibrant colors, pixar style",
      a_prompt: "best quality, high resolution",
      n_prompt: "blur, low quality"
    }
  }
);
// Preis: ~$0.02-0.05 pro Bild
```

### 6.3 AI Headshot Enhancement

**Replicate (GFPGAN/CodeFormer)**
```typescript
const output = await replicate.run(
  "tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3",
  { input: { img: imageUrl, version: "v1.4", scale: 2 } }
);
// Preis: ~$0.01 pro Bild
```

### 6.4 GIF/Boomerang (Client-Side)

```typescript
// Keine API-Kosten - Client-Side Processing
import GIF from 'gif.js';

const gif = new GIF({
  workers: 2,
  quality: 10,
  width: 640,
  height: 480
});

frames.forEach(frame => gif.addFrame(frame, { delay: 100 }));
gif.on('finished', blob => {
  // Upload to server
});
gif.render();
```

---

## 7. Empfehlung

### Für FiestaPics (Hardware-Modell)
Wenn FiestaPics weiterhin Hardware-Booths vermietet, ist Foto Master sinnvoll:
- Professionelle Desktop-Software
- Drucker-Integration
- Etabliertes Ökosystem

### Für Gästefotos.com (SaaS-Modell)
Wir sollten **eigene AI-Features bauen**:
1. **Kein Lock-in** zu teurer Drittanbieter-Software
2. **Günstigere Skalierung** (Pay-per-Use APIs)
3. **USP:** Self-Service + AI = Einzigartig am Markt
4. **Kontrolle** über Preisgestaltung

### Konkrete nächste Schritte

1. **Replicate Account** einrichten (€10 Startguthaben)
2. **AI Background Removal** als erstes Feature
3. **AI Effect Selector** im Upload-Flow
4. **Preismodell** für AI-Features definieren (z.B. €0.10/Effekt oder Premium-Paket)

---

## 8. Risiken

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| AI-API-Kosten explodieren | Mittel | Rate-Limiting, Caching |
| Qualität schlechter als Foto Master | Niedrig | Gleiche APIs verfügbar |
| Entwicklungszeit unterschätzt | Mittel | MVP-First Approach |
| Rechtliche Fragen (Face Swap) | Hoch | Nur mit Consent, DSGVO-konform |

---

## 9. Zusammenfassung

**Foto Master ist teuer** (~€2.200/Jahr/Booth), bietet aber ein ausgereiftes Ökosystem.

**Für uns (Gästefotos.com) lohnt sich der Nachbau der AI-Features:**
- Wir brauchen keine Desktop-Software
- Web-APIs (Replicate, remove.bg) sind verfügbar
- Break-Even nach ~1 Jahr Entwicklung
- Langfristiger Wettbewerbsvorteil

**Empfehlung:** AI-Features in Phasen nachbauen, beginnend mit Background Removal und StylePop.

---

## 10. Versteckte/Erweiterte Features (nicht prominent auf Website)

Diese Features wurden aus Changelogs, Blog-Posts und Support-Dokumenten extrahiert:

### 10.1 AI-Modelle (Details)

| Modell | Preis (Basic) | Preis (Pro) | Speed | Max Faces | Use Case |
|--------|---------------|-------------|-------|-----------|----------|
| **Nano Banana** | $0.16 | $0.08 | ~12s | 3 | Schnelle kleine Edits |
| **Nano Banana Enhanced** | $0.22 | $0.14 | ~25s | 10 | Gruppen mit Face Fusion |
| **Nano Banana Pro** | $0.28 | $0.20 | ~25s | 3 | Kreative Transformationen |
| **Nano Banana Pro Enhanced** | $0.35 | $0.25 | ~35s | 10 | Große Gruppen-Themes |
| **GPT-Image 1.5** | $0.16 | $0.08 | ~30s | 3 | Strikte Anweisungen |
| **GPT-Image 1.5 Enhanced** | $0.22 | $0.14 | ~40s | 10 | Komplexe Gruppenszenen |

**"Enhanced" = Foto Master's proprietäre Face Fusion Technologie**
→ Gesichter werden nach AI-Generierung zurück-fusioniert für bessere Ähnlichkeit

### 10.2 Spezial-Features (nicht auf Hauptseite)

| Feature | Beschreibung | Nachbaubar? |
|---------|--------------|-------------|
| **Aura Booth** | Aura-Fotografie Trend (farbige Energie-Wolken) | ✅ Ja (Overlay + AI) |
| **Fortuna AI** | Hologramm-Wahrsagerin mit Palm Reading | ⚠️ Komplex (Hardware) |
| **Draw Me Bot** | Roboter-Arm zeichnet Portrait live | ❌ Hardware |
| **Dancing Robots** | Roboter tanzen wenn idle | ❌ Hardware |
| **AI Palm Reading** | Handflächen-Scan → Fortune generieren | ✅ Ja (GPT + Bild-Analyse) |
| **User Generated Prompts** | Gäste tippen eigene AI-Prompts | ✅ Einfach |
| **Survey Personalization** | Antworten fließen ins Artwork ein | ✅ Mittel |
| **Virtual Mirror** | Spiegel-Effekt ohne echten Spiegel | ✅ Einfach (CSS Transform) |
| **Green Screen Live View** | Echtzeit-Hintergrund während Aufnahme | ✅ Mittel (WebGL) |
| **Screen Recording** | Bildschirm aufnehmen | ✅ Einfach (MediaRecorder) |
| **Hands-Free Sharing** | QR-Code → automatisch teilen | ✅ Haben wir! |
| **Access Codes** | Events mit Code schützen | ✅ Haben wir! |
| **Pay Per Play** | Münzeinwurf (Nayax/Intercard/Embed) | ❌ Hardware |
| **LED Ring Control** | LED-Ring Steuerung | ❌ Hardware |
| **KeyFob Trigger** | Fernauslöser | ❌ Hardware |
| **Phigit Integration** | Phigit Plattform | ❌ Drittanbieter |
| **Non-Linear Workflows** | State-Machine für komplexe Flows | ✅ Komplex |
| **Augmented Reality Props** | AR-Filter live auf Gesicht | ✅ Mittel (face-api.js) |
| **Multi-Preset Selection** | Gast wählt aus mehreren Themes | ✅ Einfach |
| **White-Label Galleries** | Eigene Domain für Galerien | ✅ Haben wir (teilweise) |
| **SMS Virtual Numbers** | Eigene SMS-Nummer | ✅ Twilio |
| **Inbound SMS** | Antworten auf SMS empfangen | ✅ Twilio Webhooks |
| **CSV Export** | E-Mail/SMS Logs exportieren | ✅ Einfach |
| **Per-Session Analytics** | Detaillierte Session-Auswertung | ✅ Haben wir (teilweise) |
| **FLV Video Support** | Flash Video Format | ❌ Veraltet |
| **Burst Video Drawing** | Auf Video-Bursts zeichnen | ⚠️ Komplex |

### 10.3 Workflow-Features (V11+)

- **Timeout-Counter** auf E-Mail/SMS States
- **Nested Multi-Presets** mit Timeout
- **Sort by Name** für Multi-Presets
- **Auto-Start aus Pay-Per-Play**
- **Alert wenn Foto nicht gespeichert**
- **Live View läuft im Hintergrund weiter**
- **"Stop Live View" kann versteckt statt gestoppt werden**

### 10.4 AI Workflow Generator

```
Beschreibung: "Hochzeit im Vintage-Stil mit Blumen-Overlays"
     ↓
AI generiert kompletten Workflow:
- Begrüßungs-Animation
- Countdown
- Foto-Capture
- AI StylePop (Vintage)
- Overlay-Auswahl (Blumen)
- Druck/Share
```

→ **Nachbaubar mit GPT-4 + eigener Workflow-Engine**

### 10.5 AI Overlay Creator

```
Prompt: "Eleganter goldener Rahmen mit Rosen"
     ↓
AI generiert PNG-Overlay (transparent)
```

→ **Nachbaubar mit DALL-E / Stable Diffusion**

---

## 11. Prioritäten für Nachbau

### Sofort umsetzbar (bereits geplant)
1. ✅ AI Background Removal
2. ✅ AI StylePop/Cartoons
3. ✅ AI Headshot Enhancement

### Mittelfristig (2-4 Wochen)
4. 🔶 Aura Booth Effect
5. 🔶 AI Overlay Generator
6. 🔶 User Generated Prompts
7. 🔶 AR Props (face-api.js)

### Langfristig (Optional)
8. 🔷 AI Workflow Generator
9. 🔷 AI Palm Reading (Fun-Feature)
10. 🔷 Non-Linear Workflow Builder

### NICHT nachbauen (Hardware/irrelevant)
- ❌ Draw Me Bot (Roboter)
- ❌ Pay Per Play (Münzeinwurf)
- ❌ LED Ring / KeyFob
- ❌ Fortuna Hologramm

---

**Autor:** Cascade AI  
**Letzte Aktualisierung:** 2026-01-29
