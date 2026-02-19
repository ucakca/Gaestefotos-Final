# AI Feature Gating — Architektur-Empfehlung

> Erstellt: 19. Februar 2026  
> Status: ENTWURF — Diskussionsgrundlage

---

## 1. IST-ZUSTAND (Probleme)

### Problem 1: Feature-Flags sind zu grob
Die `PackageDefinition` hat aktuell nur **3 AI-bezogene Boolean-Flags**:
- `allowBoothGames` (default: true)
- `allowAiEffects` (default: false)
- `allowAiFaceSwitch` (default: false)
- `allowAiBgRemoval` (default: false)

Aber wir haben **33 AI-Features** (14 Effekte + 14 Spiele + 5 Tools). Ein einzelnes `allowAiEffects = true` schaltet ALLE 14 Effekte frei — kein feingranulares Gating möglich.

### Problem 2: Kein Geräte-Kontext
Das System weiß nicht, **von welchem Gerät** ein Request kommt:
- **app.gästefotos.com** (Gast-Handy) — alle LLM-Spiele + einige Effekte
- **Photo Booth** (Electron, Standgerät) — nur Booth-relevante Effekte
- **Mirror Booth** (Electron, Standgerät) — Spiegel-Effekte + Compliment Mirror
- **KI Booth** (Electron, Standgerät) — ALLE Effekte
- **Admin Dashboard** (dash.gästefotos.com) — Host-Tools (Chat, Suggest, etc.)

### Problem 3: Feature-Matrix ≠ Feature-Flags
Es gibt zwei separate Systeme die dasselbe tun wollen:
- `featureGate.ts` → 23 FeatureKeys (Boolean-Flags in PackageDefinition)
- `aiFeatureRegistry.ts` → 33 AiFeature-Definitionen (creditCost, category, providerType)

Diese sind **nicht verbunden**. Ein AI-Feature hat keine Referenz zum Feature-Gate.

### Problem 4: Kein Event-Level AI-Konfiguration
Der Host kann nicht steuern, welche AI-Features bei SEINEM Event aktiv sein sollen. Alles wird global über das Paket gesteuert.

---

## 2. SOLL-ARCHITEKTUR (Empfehlung)

### Grundprinzip: **3 Ebenen der Kontrolle**

```
┌──────────────────────────────────────────────────────┐
│  Ebene 1: PAKET (Was ist bezahlt?)                   │
│  → PackageDefinition.allowAiEffects = true           │
│  → PackageDefinition.maxAiCreditsPerEvent = 500      │
│  → Grobe Kategorien, nicht einzelne Features          │
├──────────────────────────────────────────────────────┤
│  Ebene 2: EVENT-KONFIGURATION (Was will der Host?)   │
│  → EventAiConfig: Host schaltet Features an/aus      │
│  → Pro Event individuell konfigurierbar               │
│  → QR-Code lädt Event-Preset auf Booth-Geräte        │
├──────────────────────────────────────────────────────┤
│  Ebene 3: GERÄTE-KONTEXT (Wo läuft es?)             │
│  → device_type: 'guest_app' | 'photo_booth' | ...   │
│  → Jedes Feature hat erlaubte Geräte-Typen            │
│  → Backend prüft: Paket ∩ Event-Config ∩ Gerät        │
└──────────────────────────────────────────────────────┘
```

### Ergebnis: Feature ist aktiv wenn ALLE 3 Ebenen "ja" sagen:
```
Paket erlaubt Kategorie? ✅  
  → Host hat Feature für Event aktiviert? ✅  
    → Gerätetyp ist kompatibel? ✅  
      → Feature ist verfügbar! 🟢
```

---

## 3. KONKRETE UMSETZUNG

### 3.1 Paket-Ebene: AI-Kategorien statt Einzel-Features

**NICHT 33 Boolean-Flags**, sondern **6 Kategorie-Flags**:

| Paket-Flag | Beschreibung | Betroffene Features |
|------------|-------------|---------------------|
| `allowAiGames` | LLM-basierte Spiele | 14 Games (Compliment, Roast, DJ, ...) |
| `allowAiImageEffects` | Bild-Effekte (img2img) | 8 Style-Effects (Oldify, Cartoon, ...) |
| `allowAiGifVideo` | GIF + Video | GIF Morph, Aging GIF, AI Video |
| `allowAiAdvanced` | Premium-Features | Face Swap, BG Removal, Trading Card |
| `allowAiHostTools` | Host-KI-Tools | Chat, Suggest, Categorize |
| `allowAiStyleTransfer` | 24 Kunststile | Style Transfer Modal |

Plus **Limits**:
| Limit | Beschreibung |
|-------|-------------|
| `maxAiCreditsPerEvent` | Gesamtes AI-Budget pro Event |
| `maxAiPlaysPerGuest` | Spiele pro Gast pro Tag (Fair-Use) |

### Paket-Matrix (Beispiel):

| Feature | Free | Basic (49€) | Smart (99€) | Premium (199€) |
|---------|------|-------------|-------------|----------------|
| `allowAiGames` | ✅ (3/Tag) | ✅ (10/Tag) | ✅ (∞) | ✅ (∞) |
| `allowAiImageEffects` | ❌ | ✅ (5 Credits) | ✅ (50 Credits) | ✅ (∞) |
| `allowAiGifVideo` | ❌ | ❌ | ✅ | ✅ |
| `allowAiAdvanced` | ❌ | ❌ | ❌ | ✅ |
| `allowAiHostTools` | ✅ (Chat) | ✅ | ✅ | ✅ |
| `allowAiStyleTransfer` | ❌ | ✅ | ✅ | ✅ |

**Warum Kategorien statt Einzel-Features?**
- Host versteht "KI-Effekte" aber nicht "ai_cartoon vs ai_style_pop"
- Neue Features in Sprint 7, 8, 9... sind automatisch eingeordnet
- Pricing-Seite bleibt übersichtlich
- Admin muss nicht 33 Checkboxen setzen

### 3.2 Event-Konfiguration: Host steuert pro Event

Neues Modell `EventAiConfig` (oder JSON-Feld auf Event):

```prisma
model EventAiConfig {
  id        String   @id @default(uuid())
  eventId   String   @unique
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  // Granulare An/Aus-Schalter (Host kann Features deaktivieren)
  disabledFeatures  String[]  @default([])  // z.B. ["ai_roast", "ai_couple_match"]
  
  // Booth-Presets (welche Features auf welchem Gerät)
  boothPreset       Json?     // { "photo_booth": ["ai_oldify", "ai_cartoon"], "ki_booth": ["all"] }
  
  // Custom Messages
  welcomeMessage    String?   // "Willkommen bei Lisa & Toms Hochzeit!"
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Host-Dashboard UI** (dash.gästefotos.com):
```
┌─────────────────────────────────────────┐
│ 🤖 KI-Features für "Lisa & Tom"        │
│                                         │
│ 📱 Gäste-App                            │
│   ✅ KI-Spiele (14/14 aktiv)    [⚙️]   │
│   ✅ Bild-Effekte (8/8 aktiv)   [⚙️]   │
│   ✅ Style Transfer              [⚙️]   │
│   ❌ AI Roast  (Host deaktiviert)       │
│                                         │
│ 📷 Photo Booth (Gerät: "Booth-1")      │
│   ✅ Oldify, Cartoon, Pet Me     [⚙️]   │
│   ✅ Compliment Mirror           [⚙️]   │
│                                         │
│ 🪞 Mirror Booth (Gerät: "Mirror-1")    │
│   ✅ Compliment Mirror           [⚙️]   │
│   ✅ Yearbook                    [⚙️]   │
│                                         │
│ [QR-Code generieren für Booth-Setup]    │
└─────────────────────────────────────────┘
```

### 3.3 Geräte-Kontext: Feature-Kompatibilität

Erweitere `AiFeatureDefinition`:

```typescript
interface AiFeatureDefinition {
  key: AiFeature;
  label: string;
  description: string;
  category: 'text' | 'game' | 'image' | 'video' | 'recognition';
  providerType: 'LLM' | 'IMAGE_GEN' | 'VIDEO_GEN' | 'FACE_RECOGNITION';
  creditCost: number;
  isWorkflow: boolean;
  
  // NEU: Geräte-Kompatibilität
  allowedDevices: DeviceType[];
  
  // NEU: Paket-Kategorie-Zuordnung
  packageCategory: 'games' | 'imageEffects' | 'gifVideo' | 'advanced' | 'hostTools' | 'styleTransfer';
}

type DeviceType = 'guest_app' | 'photo_booth' | 'mirror_booth' | 'ki_booth' | 'admin_dashboard';
```

**Zuordnungs-Matrix:**

| Feature | guest_app | photo_booth | mirror_booth | ki_booth | admin |
|---------|-----------|-------------|--------------|----------|-------|
| LLM Games (14) | ✅ | ❌ | ✅* | ✅ | ❌ |
| Style Effects (8) | ✅ | ✅ | ❌ | ✅ | ❌ |
| GIF/Video | ✅ | ✅ | ❌ | ✅ | ❌ |
| Face Swap/BG | ✅ | ✅ | ✅ | ✅ | ❌ |
| Host Tools | ❌ | ❌ | ❌ | ❌ | ✅ |
| Style Transfer | ✅ | ❌ | ❌ | ✅ | ❌ |

\* Mirror Booth: nur Compliment Mirror + Yearbook (Spiegel-passend)

### 3.4 QR-Code Event-Preloading für Booth-Geräte

Der QR-Code auf dem Booth-Gerät enthält:
```
https://app.gästefotos.com/booth/setup?token=HMAC_SIGNED_TOKEN
```

Der Token enthält:
```json
{
  "eventId": "abc-123",
  "deviceType": "photo_booth",
  "deviceId": "booth-1",
  "features": ["ai_oldify", "ai_cartoon", "compliment_mirror"],
  "exp": 1740000000
}
```

**Flow:**
1. Partner scannt QR-Code auf Booth-Gerät
2. Booth-App lädt Event-Konfiguration
3. Zeigt nur die erlaubten Features an
4. Booth sendet `X-Device-Type: photo_booth` Header bei API-Calls
5. Backend prüft: Paket ∩ EventAiConfig ∩ DeviceType

---

## 4. MIGRATIONS-PLAN

### Phase 1: Backend vorbereiten (Sprint 7)
1. `AiFeatureDefinition` erweitern: `allowedDevices` + `packageCategory`
2. Neue `aiFeatureGate()` Funktion die alle 3 Ebenen prüft
3. `X-Device-Type` Header-Auswertung in Middleware

### Phase 2: Event-Konfiguration (Sprint 8)
1. `EventAiConfig` Prisma-Modell erstellen
2. API: GET/PUT `/events/:id/ai-config`
3. Host-Dashboard: KI-Features-Seite

### Phase 3: Frontend-Gating (Sprint 9)
1. `AiEffectsModal` + `AiGamesModal` laden erlaubte Features vom Backend
2. Nicht-erlaubte Features: Grau + Lock-Icon + "UPGRADE" Badge
3. Booth-App: Nur erlaubte Features anzeigen

### Phase 4: QR-Setup (Sprint 10)
1. QR-Code-Generator im Host-Dashboard
2. Booth-App: QR-Scanner + Event-Preloading
3. Device-Registration + Feature-Sync

---

## 5. WARUM NICHT Feature-Matrix + Feature-Flags TRENNEN?

**Meine Empfehlung: ZUSAMMENFÜHREN, nicht trennen.**

Das Problem ist nicht "zu viele Systeme" sondern "die Systeme reden nicht miteinander". Die Lösung:

- `PackageDefinition` → **6 AI-Kategorie-Flags** (statt 33 Einzel-Flags)
- `AiFeatureRegistry` → Jedes Feature kennt seine **packageCategory**
- `featureGate.ts` → Prüft `PackageDefinition[packageCategory]` statt Einzel-Flags
- **Ergebnis**: Eine Quelle der Wahrheit, keine doppelten Definitionen

```
PackageDefinition.allowAiGames = true
  ↓
AiFeatureRegistry[ai_roast].packageCategory = 'games'
  ↓
featureGate: allowAiGames === true → ai_roast ist erlaubt ✅
```

**Kein separates Feature-Flag-System für AI nötig!** Die `AiFeatureRegistry` IST bereits das Feature-Register — wir müssen es nur mit dem Paket-System verbinden.

---

## 6. ZUSAMMENFASSUNG

| Frage | Antwort |
|-------|---------|
| Pro Gerät pro Event? | **Ja**, über `EventAiConfig.boothPreset` |
| Im Dashboard trennen? | **Ja**, eigene "KI-Features"-Seite pro Event |
| Pakete und Features trennen? | **Nein** — zusammenführen über `packageCategory` |
| Feature-Matrix vs Feature-Flags? | **Zusammenführen** — Registry kennt Kategorie → Paket prüft Kategorie |
| QR-Code Preloading? | **Ja**, HMAC-signierter Token mit Event-ID + Feature-List |
| Wann? | Phase 1 (Backend) in Sprint 7, Frontend-Gating in Sprint 8-9 |

---

> *Lies das in Ruhe durch und sag mir was du ändern willst. Ich starte parallel Sprint 7 mit der Backend-Vorbereitung (Phase 1).*
