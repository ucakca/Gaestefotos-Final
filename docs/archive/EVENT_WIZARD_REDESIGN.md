# Event-Wizard Redesign: Finaler Fahrplan

**Erstellt:** 27.01.2026  
**Status:** Genehmigt, bereit zur Implementierung

---

## 🎯 Ziel

Ein **Mobile-First** Event-Erstellungs-Wizard mit:
- Geführter Meilenstein-Journey
- KI-Assistent (Groq API, kostenlos)
- Motivierenden Animationen
- Checklisten-UI (wie Screenshot-Vorlage)

---

## 📱 Design-Prinzipien

1. **Mobile-First** – Optimiert für Smartphone
2. **Meilensteine** – Kleine Erfolge feiern
3. **Keine Modi** – Ein geführter Flow für alle
4. **KI-Innovation** – Sichtbar als Feature ("✨ KI-Assistent")
5. **Unterbrechbar** – Progress wird gespeichert

---

## 🗺️ User-Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  START: /events/new                                             │
│    ↓                                                            │
│  ══════════════════════════════════════════════════════════    │
│  PHASE 1: EVENT-GRUNDLAGEN (Pflicht)                           │
│  ══════════════════════════════════════════════════════════    │
│    ↓                                                            │
│  [1.1 Eventtyp wählen]                                         │
│    ↓ → KI lädt passende Vorlagen                               │
│  [1.2 Titel eingeben]                                          │
│    ↓ → KI schlägt Beschreibung vor                             │
│  [1.3 Datum & Ort]                                             │
│    ↓                                                            │
│  🎉 MEILENSTEIN 1: "Dein Event ist angelegt!"                  │
│     - Konfetti-Animation                                        │
│     - Event-Link generiert                                      │
│     - [Event ansehen] [Weiter einrichten]                      │
│    ↓                                                            │
│  ══════════════════════════════════════════════════════════    │
│  PHASE 2: DESIGN & BRANDING (Empfohlen)                        │
│  ══════════════════════════════════════════════════════════    │
│    ↓                                                            │
│  [2.1 Cover-Bild hochladen]                                    │
│    ↓ → KI extrahiert Farben                                    │
│  [2.2 Farbschema wählen]                                       │
│    ↓                                                            │
│  🎨 MEILENSTEIN 2: "Sieht fantastisch aus!"                    │
│     - Vorschau der Event-Seite                                  │
│     - [Weiter] [Zum Event]                                     │
│    ↓                                                            │
│  ══════════════════════════════════════════════════════════    │
│  PHASE 3: QR-CODE & TEILEN (Optional)                          │
│  ══════════════════════════════════════════════════════════    │
│    ↓                                                            │
│  [3.1 QR-Code erstellen]                                       │
│    ↓ → KI generiert Einladungstext                             │
│  [3.2 Event teilen]                                            │
│    ↓                                                            │
│  📤 MEILENSTEIN 3: "Bereit zum Teilen!"                        │
│     - Share-Buttons                                             │
│     - [Weiter] [Fertig]                                        │
│    ↓                                                            │
│  ══════════════════════════════════════════════════════════    │
│  PHASE 4: ERWEITERTE FEATURES (Optional)                       │
│  ══════════════════════════════════════════════════════════    │
│    ↓                                                            │
│  [4.1 Alben einrichten] → KI schlägt Namen vor                 │
│  [4.2 Challenges aktivieren] → KI schlägt Ideen vor            │
│  [4.3 Gästebuch einrichten] → KI generiert Willkommenstext     │
│  [4.4 Co-Hosts einladen]                                       │
│    ↓                                                            │
│  ⭐ MEILENSTEIN 4: "Pro-Setup komplett!"                       │
│     - Achievement-Badge                                         │
│     - [Zum Dashboard]                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 KI-Integration (Groq API)

### Provider-Details

| Aspekt | Wert |
|--------|------|
| **Provider** | Groq |
| **Modell** | Llama 3 70B |
| **Kosten** | Kostenlos |
| **Latenz** | ~200ms |
| **Limits** | 30 Req/Min, 14.400 Req/Tag |

### KI-Aufrufe pro Wizard

| Aufruf | Tokens | Trigger |
|--------|--------|---------|
| Album-Vorschläge | ~250 | Nach Eventtyp-Auswahl |
| Beschreibung | ~180 | Button "✨ KI-Vorschlag" |
| Einladungstext | ~250 | Im QR-Schritt |
| Challenge-Ideen | ~300 | Im Challenge-Schritt |
| Gästebuch-Text | ~160 | Im Gästebuch-Schritt |

**Gesamt: ~1.140 Tokens pro Durchlauf**

### Kapazität

| Events/Tag | Status | Kosten |
|------------|--------|--------|
| 100 | ✅ OK | 0 € |
| 500 | ✅ OK | 0 € |
| 2.000 | ✅ OK | 0 € |

### Optimierungen

1. **Caching** – Gleiche Eventtypen → gecachte Vorschläge
2. **Lazy Loading** – KI nur bei explizitem Klick
3. **Fallback** – Vordefinierte Templates wenn API ausfällt

---

## 🎨 UI-Komponenten

### Hauptansicht (Checkliste)

```
┌────────────────────────────────────┐
│  🎉 Event einrichten         60%  │
│  ████████████░░░░░░░░             │
├────────────────────────────────────┤
│  ▶ Nächster Schritt               │
│    Design anpassen            >   │
├────────────────────────────────────┤
│  Alle Schritte                    │
│  3/5 abgeschlossen                │
│                                    │
│  ✅ Eventtyp wählen               │
│  ✅ Titel & Datum                 │
│  ✅ Ort hinzufügen                │
│  🟠 Design anpassen           >   │
│  ⚪ QR-Code erstellen             │
│  ⚪ Event teilen                  │
└────────────────────────────────────┘
```

### KI-Vorschlag Card

```
┌────────────────────────────────────┐
│  ✨ KI-Assistent                  │
│  ──────────────────────────────── │
│  "Für deine Hochzeit schlage     │
│   ich folgende Alben vor:"        │
│                                    │
│  • Getting Ready                  │
│  • Trauung                        │
│  • Sektempfang                    │
│  • Hochzeitstorte                 │
│  • Party & Tanz                   │
│                                    │
│  [✓ Übernehmen]  [Anpassen]      │
│                                    │
│              ⚡ Powered by KI     │
└────────────────────────────────────┘
```

### Meilenstein-Modal

```
┌────────────────────────────────────┐
│                                    │
│           🎉                       │
│                                    │
│    Dein Event ist angelegt!       │
│                                    │
│    "Hochzeit Anna & Max"          │
│    ist jetzt unter                │
│    gästefotos.com/e/anna-max      │
│    erreichbar.                    │
│                                    │
│  [Event ansehen]                  │
│  [Weiter einrichten →]            │
│                                    │
└────────────────────────────────────┘
```

---

## 🎬 Animationen

| Moment | Animation | Library |
|--------|-----------|---------|
| Schritt erledigt | Checkmark morpht (grün) | Framer Motion |
| Phase komplett | Konfetti | canvas-confetti |
| KI generiert | Typing-Effekt | CSS |
| Neuer Schritt | Slide-in | Framer Motion |
| Progress-Update | Smooth width | CSS transition |

---

## 🗂️ Dateistruktur (Neu)

```
packages/frontend/src/
├── app/events/new/
│   └── page.tsx                    → Lädt SetupWizard
│
├── components/setup-wizard/
│   ├── SetupWizard.tsx             → Hauptkomponente
│   ├── SetupProgress.tsx           → Progress-Header
│   ├── SetupChecklist.tsx          → Checklisten-Ansicht
│   ├── SetupStep.tsx               → Einzelner Schritt
│   ├── MilestoneModal.tsx          → Gratulations-Overlay
│   ├── AIAssistantCard.tsx         → KI-Vorschlag Card
│   │
│   ├── steps/
│   │   ├── EventTypeStep.tsx
│   │   ├── BasicInfoStep.tsx
│   │   ├── DesignStep.tsx
│   │   ├── QRCodeStep.tsx
│   │   ├── AlbumsStep.tsx
│   │   ├── ChallengesStep.tsx
│   │   └── GuestbookStep.tsx
│   │
│   └── hooks/
│       ├── useSetupProgress.ts     → Progress-State
│       └── useAISuggestions.ts     → KI-Integration
│
├── lib/
│   └── groq.ts                     → Groq API Client
│
packages/backend/src/
├── routes/
│   └── ai.ts                       → KI-Endpoints
```

---

## 📡 API-Endpoints (Backend)

```
POST /api/ai/suggest-albums
  Body: { eventType: "wedding", title: "Hochzeit Anna & Max" }
  Response: { albums: ["Getting Ready", "Trauung", ...] }

POST /api/ai/suggest-description
  Body: { eventType: "wedding", title: "...", date: "..." }
  Response: { description: "Feiert mit uns..." }

POST /api/ai/suggest-invitation
  Body: { eventType: "wedding", title: "...", date: "..." }
  Response: { text: "Haltet unsere schönsten Momente fest!" }

POST /api/ai/suggest-challenges
  Body: { eventType: "wedding" }
  Response: { challenges: ["Selfie mit Brautpaar", ...] }
```

---

## ✅ Implementierungs-Reihenfolge

### Sprint 1: Grundgerüst
1. `SetupWizard.tsx` – Hauptcontainer
2. `SetupProgress.tsx` – Progress-Header
3. `SetupChecklist.tsx` – Checklisten-UI
4. `SetupStep.tsx` – Wiederverwendbare Step-Komponente
5. Phase 1 Steps (Eventtyp, Titel, Datum)

### Sprint 2: Meilensteine & Design
6. `MilestoneModal.tsx` – Gratulations-Overlays
7. Phase 2 Steps (Cover, Farbschema)
8. Animationen einbauen

### Sprint 3: KI-Integration
9. Groq API Setup (Backend)
10. `AIAssistantCard.tsx`
11. `useAISuggestions.ts` Hook
12. KI in alle Steps integrieren

### Sprint 4: Erweiterte Features
13. Phase 3 & 4 Steps
14. Caching implementieren
15. Fallback-Templates
16. Testing & Polish

---

## 📊 Zusammenfassung

| Aspekt | Entscheidung |
|--------|--------------|
| **Design** | Mobile-First, Checklisten-UI |
| **Flow** | 4 Phasen mit Meilensteinen |
| **KI-Provider** | Groq (kostenlos, ~200ms) |
| **KI-Branding** | "✨ KI-Assistent", klar sichtbar |
| **Animationen** | Framer Motion + canvas-confetti |
| **Persistenz** | localStorage für Fortschritt |

---

**Nächster Schritt:** Implementierung Sprint 1 (Grundgerüst)
