# Workflow Builder Redesign — Analyse & Umsetzungs-Plan

> Stand: 1. März 2026
> Zweck: Vollständige Analyse, Architektur-Entscheidungen und Schritt-für-Schritt-Umsetzungsplan
> Regel: **Nichts Bestehendes brechen.** Altes bleibt funktionsfähig bis Neues getestet ist.

---

## 1. IST-Zustand (Was existiert)

### 1.1 Backend

| Komponente | Datei | Status |
|-----------|-------|--------|
| Prisma Model | `schema.prisma` → `BoothWorkflow` | ✅ Stabil |
| API Routes | `routes/workflows.ts` | ✅ CRUD + Backup + Lock + Analytics |
| Executor | `services/workflowExecutor.ts` | ✅ 12 ausführbare Steps |
| Seeds | `prisma/seeds/workflows.ts` | ✅ 11 vordefinierte Workflows |
| Timer Worker | `services/workflowTimerWorker.ts` | ✅ Cron-basierte Trigger |

**Ausführbare Step-Types (Executor):**

| Step | Funktion | Kategorie |
|------|----------|-----------|
| `AI_CATEGORIZE_PHOTO` | KI-Kategorisierung | Server |
| `AI_MODIFY` | Style Transfer | Server |
| `AI_BG_REMOVAL` | Hintergrund entfernen | Server |
| `QUALITY_GATE` | Qualitäts-Check | Server |
| `ADD_TAG` | Tags hinzufügen | Server |
| `MOVE_TO_ALBUM` | In Album verschieben | Server |
| `SEND_EMAIL` | Email senden | Server |
| `SEND_NOTIFICATION` | Push-Benachrichtigung | Server |
| `WEBHOOK` | Externe URL aufrufen | Server |
| `PRINT_JOB` | Druckauftrag erstellen | Server |
| `DELAY` | Warten (max 5min) | Server |
| `CONDITION` | Wenn/Dann/Sonst mit Branching | Server |

**Graph-Traversal:** BFS mit CONDITION-Branching über `sourceHandle` (then/else).

### 1.2 Frontend

| Komponente | Datei | Zeilen |
|-----------|-------|--------|
| Editor Page | `manage/workflows/page.tsx` | ~1125 |
| Types + Registry | `workflow-builder/types.ts` | ~1119 |
| Presets | `workflow-builder/presets.ts` | ~212 |
| Step Palette | `workflow-builder/StepPalette.tsx` | Kategorie-Tabs |
| Config Panel | `workflow-builder/ConfigPanel.tsx` | Step-Konfiguration |
| Validation | `workflow-builder/validation.ts` | Graph-Validierung |
| Simulation | `workflow-builder/SimulationPanel.tsx` | Step-für-Step Simulation |
| Node Component | `workflow-builder/WorkflowNode.tsx` | ReactFlow Custom Node |
| Condition Helper | `workflow-builder/ConditionSuggestions.tsx` | Bedingungsvorschläge |

**Step-Type Registry (38+ Steps in 7 Kategorien):**

| Kategorie | Steps | Ausführbar? |
|-----------|-------|------------|
| **Trigger** (5) | TRIGGER_PHOTO_UPLOAD, TRIGGER_QR_SCAN, TRIGGER_TIMER, TRIGGER_MANUAL, TRIGGER_EVENT_STATE | ⚡ Trigger-Erkennung |
| **Logic** (5) | CONDITION, SWITCH, DELAY, LOOP, PARALLEL | ⚡ CONDITION + DELAY |
| **Animation** (5) | TOUCH_TO_START, BEFORE_COUNTDOWN, COUNTDOWN, COMPLIMENT, AFTER_SHARE | ❌ Nur Booth-App |
| **Feature** (7) | LED_RING, TAKE_PHOTO, SELECTION_SCREEN, FOTO_SPIEL, DIGITAL_GRAFFITI, ADD_TAG, MOVE_TO_ALBUM | ⚡ ADD_TAG + MOVE_TO_ALBUM |
| **AI** (8) | AI_MODIFY, AI_FACE_SWITCH, AI_BG_REMOVAL, AI_OLDIFY, AI_CARTOON, AI_STYLE_POP, AI_CATEGORIZE, QUALITY_GATE | ⚡ 4 von 8 |
| **Cloud** (12) | SMS_SHARE, EMAIL_SHARE, QR_CODE, FACE_SEARCH, GALLERY_EMBED, SLIDESHOW, ZIP_DOWNLOAD, LEAD_COLLECTION, EMAIL_INVITE, EMAIL_REMINDER, EMAIL_THANK_YOU, EMAIL_STORAGE_EXPIRY, WEBHOOK | ⚡ EMAIL + WEBHOOK |
| **Hardware** (2) | PRINT, BOOTH_DISPLAY | ⚡ PRINT_JOB |

**Presets (5):** Standard Photo Booth, KI-Kunst Booth, Foto-Spiel, Print Terminal, Face Search

### 1.3 Seed-Workflows (DB)

11 vordefinierte System-Workflows für: BOOTH, MIRROR_BOOTH, KI_BOOTH, KI_KUNST, FOTO_SPIEL, UPLOAD, FACE_SEARCH, MOSAIC, GUESTBOOK, SPINNER, DRAWBOT

---

## 2. Probleme (Warum der Rebuild nötig ist)

### Problem 1: Zu viele nicht-ausführbare Steps
Von 38+ Steps sind nur **16 ausführbar**. Der Rest ist Booth-App-Dokumentation. Das verwirrt, weil der User denkt alles funktioniert.

### Problem 2: Zwei völlig verschiedene Use-Cases vermischt
- **Server-Automationen**: "Foto hochgeladen → Quality Gate → Tag → Email" (läuft JETZT)
- **Booth-App-Flows**: "Touch → Countdown → Foto → Filter → Drucken" (braucht Electron-App, existiert NICHT)

### Problem 3: ReactFlow ist Overkill für lineare Pipelines
90% der Automationen sind linear (A → B → C). Der Graph-Editor mit freiem Drag&Drop ist dafür unnötig komplex.

### Problem 4: Kein Execution-Log
Man sieht nirgends ob/wann ein Workflow ausgeführt wurde und was passiert ist.

### Problem 5: Seed-Workflows sind veraltet
Die DB-Seeds beschreiben idealisierte Flows die nie ausgeführt werden.

---

## 3. SOLL-Zustand (Ziel-Architektur)

### 3.1 Zwei getrennte Bereiche

```
┌─────────────────────────────────────────────┐
│  Admin Dashboard → /manage/workflows        │
│                                             │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │ AUTOMATIONEN │  │ BOOTH-FLOWS        │   │
│  │ (Tab 1)      │  │ (Tab 2)            │   │
│  │              │  │                    │   │
│  │ Lineare      │  │ Visueller Editor   │   │
│  │ Pipeline     │  │ (ReactFlow)        │   │
│  │ Builder      │  │                    │   │
│  │              │  │ → Für Booth-App    │   │
│  │ → Läuft JETZT│  │ → Zukunft          │   │
│  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 3.2 Tab 1: Automationen (Pipeline Builder)

**Konzept:** Einfache, lineare Wenn→Dann-Ketten die sofort auf dem Server laufen.

```
┌─────────┐    ┌─────────────┐    ┌──────────┐    ┌──────────────┐
│ TRIGGER  │ →  │ BEDINGUNG   │ →  │ AKTION 1 │ →  │ AKTION 2     │
│ Foto     │    │ Qualität OK?│    │ Auto-Tag │    │ Email an Host│
│ Upload   │    │ Ja / Nein   │    │          │    │              │
└─────────┘    └─────────────┘    └──────────┘    └──────────────┘
```

**Nur ausführbare Steps anzeigen:**
- Trigger: Foto Upload, Timer, Event-Status, Manuell
- Bedingungen: CONDITION (mit Branching)
- Aktionen: AI_MODIFY, AI_BG_REMOVAL, AI_CATEGORIZE, QUALITY_GATE, ADD_TAG, MOVE_TO_ALBUM, SEND_EMAIL, SEND_NOTIFICATION, WEBHOOK, PRINT_JOB, DELAY

**Vorlagen (klick-fertig):**
1. "Foto-Upload Standard" → Upload → Quality Gate → Auto-Tag → Email
2. "KI-Verarbeitung" → Upload → Style Transfer → In Album
3. "Event-Ende Recap" → Event endet → Email mit Galerie-Link
4. "Webhook-Integration" → Upload → Webhook an externes System
5. "Moderiertes Event" → Upload → Quality Gate → Wenn OK → Galerie, Wenn NICHT → Admin-Benachrichtigung

**UI:** Karten-basiert, vertikal gestapelt, kein Drag&Drop nötig. Jede Karte hat Konfig-Felder inline.

### 3.3 Tab 2: Booth-Flows (ReactFlow — Zukunft)

Der bestehende ReactFlow-Editor bleibt erhalten, aber wird als "Erweitert" / "Booth-App" markiert. Alle Step-Types bleiben verfügbar für die zukünftige Booth-Electron-App.

### 3.4 Execution Log

Neue Sektion: zeigt wann welcher Workflow für welches Event ausgeführt wurde, welche Steps liefen, Ergebnis (Erfolg/Fehler), Dauer.

---

## 4. Dateien die geändert werden

### NICHT ÄNDERN (stabil lassen):
- `packages/backend/src/services/workflowExecutor.ts` — ✅ funktioniert
- `packages/backend/src/routes/workflows.ts` — ✅ API bleibt
- `packages/backend/prisma/schema.prisma` — ✅ Model bleibt
- `packages/backend/prisma/seeds/workflows.ts` — ✅ Seeds bleiben
- `packages/admin-dashboard/src/components/workflow-builder/types.ts` — ✅ Registry bleibt
- `packages/admin-dashboard/src/components/workflow-builder/presets.ts` — ✅ bleibt
- Alle bestehenden `workflow-builder/` Komponenten — ✅ bleiben

### NEU ERSTELLEN:
1. `packages/admin-dashboard/src/components/workflow-builder/AutomationBuilder.tsx` — Pipeline-Builder UI
2. `packages/admin-dashboard/src/components/workflow-builder/AutomationPresets.tsx` — Vorlagen
3. `packages/admin-dashboard/src/components/workflow-builder/ExecutionLog.tsx` — Execution Log
4. `packages/admin-dashboard/src/components/workflow-builder/automationTypes.ts` — Nur ausführbare Steps

### MINIMAL ÄNDERN:
1. `packages/admin-dashboard/src/app/(admin)/manage/workflows/page.tsx` — Tab-System hinzufügen (Automationen | Booth-Flows)

---

## 5. Umsetzungs-Plan (Schritt für Schritt)

### Phase 1: Vorbereitung (kein UI-Change) ✅
- [x] **Step 1.1:** `automationTypes.ts` erstellt — 7 Triggers, 1 Condition, 11 Actions (384 Zeilen)
- [x] **Step 1.2:** `AutomationPresets.tsx` erstellt — 5 klick-fertige Vorlagen
- [x] **Step 1.3:** TypeScript-Check — 0 Errors

### Phase 2: Pipeline Builder (neue Komponente) ✅
- [x] **Step 2.1:** `AutomationBuilder.tsx` erstellt (513 Zeilen) — Karten-basierter linearer Builder
  - Trigger-Auswahl (Dropdown)
  - Steps hinzufügen (+ Button → Step-Auswahl)
  - Inline-Konfiguration pro Step
  - Speichern als Workflow (gleiche API)
- [x] **Step 2.2:** TypeScript-Check — 0 Errors

### Phase 3: Tab-System in Workflow-Seite ✅
- [x] **Step 3.1:** `page.tsx` erweitert — 4 Tabs: "⚡ Automationen" + "🔧 Booth-Flows" + "🔗 Event-Zuweisung" + "📋 Execution Log"
  - Tab 1 = AutomationBuilder (Pipeline-Builder + Presets)
  - Tab 2 = ReactFlow-Editor (unverändert!)
  - Tab 3 = Event-zu-Automation-Zuweisung (assign, toggle, remove)
  - Tab 4 = Execution Log (qaLogEvent-basiert)
- [x] **Step 3.2:** TypeScript-Check — 0 Errors
- [x] **Step 3.3:** Build + Visueller Test

### Phase 4: Execution Log ✅
- [x] **Step 4.1:** Backend-Endpoint `GET /workflows/execution-log` (aus qaLogEvent lesen)
- [x] **Step 4.2:** `ExecutionLogTab` inline in page.tsx — Tabelle mit Typ/Workflow/Details
- [x] **Step 4.3:** Als 4. Tab integriert

### Phase 5: Deploy + Test ✅
- [x] **Step 5.1:** Backup via bestehende Workflow-Backup-API
- [x] **Step 5.2:** Build Backend + Admin
- [x] **Step 5.3:** Deploy + Verify
- [x] **Step 5.4:** Master-Konzept + TODO.md aktualisiert (01.03.2026)

---

## 6. Risiko-Minimierung

| Risiko | Maßnahme |
|--------|----------|
| Bestehende Workflows brechen | ReactFlow-Editor bleibt als Tab 2 komplett unverändert |
| API-Inkompatibilität | Gleiche `/api/workflows` Endpoints, gleiches Prisma-Model |
| Neue Bugs im Builder | Pipeline-Builder ist eine neue Komponente, kein Rewrite |
| Seed-Workflows | Bleiben unverändert, werden von Tab 2 geladen |
| Executor | Kein einziger Change am Executor nötig |

**Rollback-Plan:** Tab 2 (ReactFlow) funktioniert immer. Tab 1 ist additiv — kann bei Problemen einfach ausgeblendet werden.

---

## 7. Zeitschätzung

| Phase | Aufwand | Abhängigkeit |
|-------|---------|-------------|
| Phase 1: Vorbereitung | ~30 Min | Keine |
| Phase 2: Pipeline Builder | ~60 Min | Phase 1 |
| Phase 3: Tab-System | ~20 Min | Phase 2 |
| Phase 4: Execution Log | ~40 Min | Phase 3 |
| Phase 5: Deploy + Test | ~15 Min | Phase 4 |
| **Gesamt** | **~3 Stunden** | |

---

## 8. Erfolgskriterien

- [x] Admin kann in 30 Sekunden eine Automation erstellen (Trigger → Aktion)
- [x] Vorlagen funktionieren mit einem Klick
- [x] Bestehende Workflows sind unverändert erreichbar
- [x] Execution Log zeigt letzte Ausführungen
- [x] 0 TypeScript-Errors in Backend + Frontend
- [x] Deployed und funktional auf dash.gästefotos.com
