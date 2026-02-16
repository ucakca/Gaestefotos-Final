# Workflow-Builder Audit & Transformation zum marktführenden Tool

**Projekt:** Gästefotos.com Workflow-Builder  
**Datum:** 15.02.2026  
**Ziel:** Von funktionalem Builder zu ganzheitlichem, hochwertigem Marktführer-Tool 2026

---

## PHASE 1: ANALYSE

### 1.1 Code-Struktur – IST-Zustand

#### **Backend** (`packages/backend`)
- **API:** `src/routes/workflows.ts` (431 Zeilen)
  - CRUD: GET, POST, PUT, DELETE
  - Lock/Unlock mit automatischen Backups
  - Duplicate-Funktion
  - Backup-System (WorkflowBackup-Model)
  - Nur Admin-Zugriff (requireRole('ADMIN'))
  - Public-Endpoint: `GET /by-type/:flowType` (für Runtime)

- **Datenbank:** Prisma Schema
  ```
  BoothWorkflow {
    - id, name, description
    - steps (Json) ← Speichert {nodes[], edges[]}
    - flowType (Enum: BOOTH, MIRROR_BOOTH, KI_BOOTH, FOTO_SPIEL, etc.)
    - isPublic, isDefault, isSystem, isLocked
    - version, parentId (für Versionierung)
    - createdBy, lockedAt, lockedBy
    - relations: events[], backups[]
  }
  
  WorkflowBackup {
    - name, steps (Json), version, reason
    - createdAt, createdBy
  }
  ```

- **Seeds:** `prisma/seeds/workflows.ts` (393 Zeilen)
  - 11 vorgefertigte System-Workflows
  - Implementiert: Upload, Gästebuch, Face Search, Foto-Spaß, KI-Kunst, Mosaic Print, Kamera-Menu
  - Vorlagen (nicht implementiert): Photo Booth, Mirror Booth, KI Booth

#### **Frontend Runtime** (`packages/frontend`)
- **Engine:** `src/lib/workflow-runtime/engine.ts` (309 Zeilen)
  - State Machine Pattern
  - Event-driven (EngineEvent-System)
  - Topologische Start-Node-Findung
  - Auto-Advance für DELAY, Condition-Evaluation
  - History & goBack() Support
  - Collected Data Merging
  
- **React Hook:** `useWorkflowEngine.ts` (127 Zeilen)
  - Wrapper um Engine
  - React-freundliche API
  - Event-Log (last 50)
  
- **Runner UI:** `components/workflow-runtime/WorkflowRunner.tsx` (238 Zeilen)
  - Step-Komponenten-Registry
  - Progress Bar, Back-Button
  - AnimatePresence (Framer Motion)
  - States: idle, running, completed, error

- **Step-Komponenten:** 10+ implementiert
  - StepTriggerManual, StepTakePhoto, StepSelectionScreen, StepDigitalGraffiti, StepCondition, StepFaceSearch, StepAfterShare, StepDelay, StepCountdown, StepPrint, StepGeneric

#### **Admin Builder** (`packages/admin-dashboard`)
- **UI:** `src/app/(admin)/manage/workflows/page.tsx` (770 Zeilen)
  - **ReactFlow** (Visual Canvas)
  - 3 Views: List, Preset-Selector, Visual Editor
  - Drag & Drop from Palette
  - Live Renumbering (topologisch nach x-Position)
  - Lock/Unlock, Duplicate, Backup/Restore
  - MiniMap, Controls, Background Dots
  - Snap to Grid (20x20)

- **Komponenten:**
  - `WorkflowNode.tsx` (141 Zeilen): Custom Node mit Output-Handles, Category-Badge, Config-Hint
  - `StepPalette.tsx` (80 Zeilen): 7 Kategorien, draggable Steps
  - `ConfigPanel.tsx` (194 Zeilen): Rechts-Panel, Dynamic Config Fields (text, number, select, toggle, textarea, color)
  - `types.ts` (874 Zeilen): 50+ Step-Type-Definitions mit defaultConfig, configFields, outputs
  - `presets.ts`: Vordefinierte Workflow-Templates

- **Step-Typen:**
  - **Trigger (5):** PHOTO_UPLOAD, QR_SCAN, TIMER, MANUAL, EVENT_STATE
  - **Logic (5):** CONDITION, SWITCH, DELAY, LOOP, PARALLEL
  - **Animation (5):** TOUCH_TO_START, BEFORE_COUNTDOWN, COUNTDOWN, COMPLIMENT, AFTER_SHARE
  - **Feature (5):** LED_RING, TAKE_PHOTO, SELECTION_SCREEN, FOTO_SPIEL, DIGITAL_GRAFFITI
  - **AI (7):** AI_MODIFY, AI_FACE_SWITCH, AI_BG_REMOVAL, AI_OLDIFY, AI_CARTOON, AI_STYLE_POP
  - **Cloud (8):** SMS_SHARE, EMAIL_SHARE, QR_CODE, FACE_SEARCH, GALLERY_EMBED, SLIDESHOW, ZIP_DOWNLOAD, LEAD_COLLECTION
  - **Hardware (2):** PRINT, BOOTH_DISPLAY

**Total:** 37 Step-Typen definiert

---

### 1.2 Architektur-Check: Modular vs. Starr?

#### ✅ **MODULAR**

1. **Runtime-Engine ist framework-agnostic**
   - `engine.ts` hat keine React/DOM-Dependencies
   - Event-System ermöglicht beliebige UI-Anbindung
   - Electron (booth-app) und Web-Frontend nutzen dieselbe Engine
   
2. **Step-Komponenten sind austauschbar**
   - Step-Registry via `STEP_COMPONENTS`-Map
   - Fallback auf `StepGeneric`
   - Eigene Steps leicht hinzufügbar
   
3. **Config-System ist dynamisch**
   - ConfigField-Array pro Step-Typ
   - UI rendert automatisch aus Definition
   - Keine Hardcoded-Forms
   
4. **Workflow-Speicherung ist JSON**
   - Nodes & Edges als JSON → Versionierbar
   - Backend-agnostisch (könnte auch S3/Filesystem sein)

#### ⚠️ **ABER: Einige starre Punkte**

1. **Condition-Evaluation ist einfach**
   - Nur String/Number/Boolean-Vergleiche
   - Keine komplexen Ausdrücke (z. B. `photo_count > 5 AND time_of_day === 'evening'`)
   - Keine Variablen-Interpolation in Strings
   
2. **Parallel-Execution nicht implementiert**
   - `PARALLEL`-Step ist definiert, aber Engine führt linear aus
   - Kein Warten auf mehrere Branches
   
3. **Loop-Step ist rudimentär**
   - Nur `count`-Mode in Engine (`LOOP`-Step existiert in types, aber Engine hat keinen Loop-Handler)
   
4. **Step-Kommunikation ist implizit**
   - Nur via `collectedData` (shared state)
   - Kein Event-Bus zwischen Steps
   - Keine Pub/Sub für "Photo wurde hochgeladen" → "Trigger andere Workflows"

5. **Workflow-zu-Workflow-Verkettung fehlt**
   - Ein Workflow kann keinen anderen aufrufen
   - Keine Sub-Workflows

---

### 1.3 Schwachstellen – UX, Code, Validierung

#### **UX-Schwachstellen**

1. **Builder: Keine visuellen Hints bei Drag & Drop**
   - Kein Drop-Zone-Highlight
   - Keine Verbindungs-Vorschau beim Hovern über Handles
   - Keine "Invalid Connection"-Warnung (z. B. Loop zu sich selbst)

2. **Builder: Schlechtes Error-Handling**
   - Nur `alert('Fehler beim Speichern!')` statt Toast/Modal mit Details
   - Keine Validierung vor Save (z. B. "Workflow hat keine Start-Node")
   - Keine visuellen Fehler-Marker auf Nodes (z. B. fehlende Pflicht-Config)

3. **Builder: Fehlende Workflow-Tests**
   - Kein "Play"-Button zum Simulieren
   - Kein Dry-Run mit Mock-Daten
   - Keine Visualisierung, welcher Pfad bei bestimmten Bedingungen genommen wird

4. **Builder: Keine Versionskontrolle-UX**
   - Version-Nummer wird hochgezählt, aber kein Diff-View
   - Backup-Restore zeigt nicht, was sich geändert hat
   - Keine "Merge"-Funktion bei parallelen Edits (wenn zwei Admins arbeiten)

5. **Runtime: Keine Fehler-Recovery**
   - Bei Fehler → "Neu starten" oder fertig
   - Kein "An dieser Stelle fortfahren" nach Fehler-Behebung
   - Keine Offline-Resilience (was, wenn API-Call fehlschlägt?)

6. **Runtime: Keine Echtzeit-Kollaboration**
   - Wenn 50 Gäste gleichzeitig einen Workflow nutzen, sieht der Host nur Ergebnis, nicht Live-Status

#### **Code-Schwachstellen**

1. **Keine TypeScript-Validierung für Config**
   - `config: Record<string, any>` → Typo-anfällig
   - z. B. Step erwartet `duration`, Admin schreibt `duraion` → Runtime-Fehler
   
2. **Keine Zod/Schema-Validierung**
   - Steps könnten Zod-Schema für ihre Config definieren
   - Backend validiert `steps` (Json) nicht → Invalides JSON könnte gespeichert werden

3. **Fehlende Tests**
   - Kein `engine.test.ts`
   - Kein `WorkflowRunner.test.tsx`
   - Keine E2E-Tests für Builder (nur `e2e/workflow-runtime.spec.ts` vorhanden, aber keine Details)

4. **Hardcoded Flow-Types**
   - `FLOW_TYPE_OPTIONS` ist im Frontend hardcoded
   - Backend hat `WorkflowFlowType`-Enum in Prisma
   - Wenn neue Flow-Types hinzukommen → 3 Stellen anpassen (Backend-Enum, Frontend-Array, Seeds)

5. **Keine Performance-Optimierung**
   - `setNodes` wird bei jedem Renumber (alle 50ms während Drag?) aufgerufen
   - Keine Memoization in WorkflowNode
   - ReactFlow könnte virtualisieren bei 100+ Nodes

6. **Fehlende Undo/Redo im Builder**
   - ReactFlow hat `useUndoRedo`, aber nicht implementiert

#### **Validierungs-Lücken**

1. **Keine zyklische-Abhängigkeits-Prüfung**
   - Man kann Loop von Node A → B → A bauen → Engine hängt
   
2. **Keine Output-zu-Input-Validierung**
   - Step A hat Output "retake", aber keine Edge mit `sourceHandle="retake"` → tote Edge
   
3. **Keine Pflichtfeld-Validierung**
   - DELAY braucht `duration`, aber wenn Admin vergisst es zu setzen → `undefined` → Engine nimmt Default von `config.duration || 5`
   - Manche Steps (z. B. AI_MODIFY) brauchen `prompt`, aber keine UI-Validierung vor Save

4. **Keine Condition-Test-Daten**
   - CONDITION vergleicht `photo_count > 5`, aber woher kommt `photo_count`?
   - Keine Dokumentation, welche Felder verfügbar sind

5. **Keine Flow-Type-Kompatibilität**
   - Man kann einen "BOOTH"-Workflow bauen, der SMS sendet (Hardware kann kein SMS)
   - Keine Step-zu-FlowType-Whitelist

---

## PHASE 2: OPTIMIERUNGS-VORSCHLAG

### 2.1 Vision: Ganzheitlicher Builder 2026

#### **Was "ganzheitlich" bedeutet:**

1. **End-to-End-Abdeckung des Gästefotos-Ökosystems**
   - Nicht nur Booth-Abläufe, sondern:
     - **Pre-Event:** Einladungs-E-Mails mit Countdown-Workflow
     - **Event:** Booth, Upload, Live-Wall-Trigger
     - **Post-Event:** Danke-E-Mails, Highlight-Reel-Generierung, Storage-Erinnerungen
   - Integration mit **allen** Services: E-Mail, SMS, Face-Recognition, Mosaic, Payments, Leads

2. **Automatisierung via KI**
   - **Smart Tagging:** Foto hochgeladen → KI erkennt "Brautpaar" → Auto-Kategorie
   - **Smart Routing:** Wenn Face-Count > 5 → Mosaic, sonst → Stories
   - **Content-Aware Conditions:** "Ist das Foto verwackelt?" → Retake-Vorschlag

3. **Gast-individuelle Pfade**
   - **RSVP-basiert:** "Hat Plus-One: ja" → Upload-Limit +10
   - **Package-basiert:** Premium-Gast → Zugriff auf AI-Features
   - **Behavior-basiert:** Gast hat schon 20 Fotos → Zeige Dankeschön-Screen

4. **Whitelabeling**
   - **Pro Partner:** Partner XYZ kann eigene Step-Bibliothek haben
   - **Pro Event:** Host wählt Farben/Logo → Runtime übernimmt automatisch
   - **Branded Exports:** Workflow-Export als "Mein Firmen-Template"

5. **Fehler-Resilienz & Testing**
   - **Test-Modus:** Simuliere Workflow mit Mock-Gast "Max Mustermann"
   - **Offline-First:** Queue Actions, sync später
   - **Error-Boundaries:** Step schlägt fehl → Alternative Route oder Skip

---

### 2.2 Feature-Ideen (konkret)

#### **A) Visual Flow – Von Formularen zu Canvas**

**IST:** ReactFlow ist schon da, aber UX ausbaubar.

**ZIEL:**

1. **Zapier/Make-Style UX**
   - **Mini-Vorschau** im Node (z. B. bei AI_MODIFY: Zeige Prompt-Preview)
   - **Inline-Editing:** Klick auf Node → Config erscheint als Overlay (nicht Rechts-Panel)
   - **Connection-Labels mit Icons:** "Ja"-Branch = ✅, "Nein" = ❌, "Retake" = 🔄

2. **Smart-Verbindungen**
   - **Auto-Suggest:** Ziehe von TAKE_PHOTO → System schlägt vor: "AI_MODIFY? PRINT? EMAIL_SHARE?"
   - **Conditional Highlighting:** Hovere über CONDITION → Dann/Sonst-Pfade werden farbig markiert
   - **Invalid-Connection-Prevention:** PRINT kann nur nach TAKE_PHOTO, nicht nach TRIGGER_TIMER

3. **Zoom & Navigation**
   - **Minimap mit Kategorie-Farben** (schon da ✓)
   - **"Focus Mode":** Blende alles außer aktuellem Branch aus
   - **Search:** Suche Step-Name, springe zu Node

4. **Templates & Snippets**
   - **Drag & Drop von Multi-Node-Gruppen:** "Upload-mit-Validation" = 3 Nodes + Edges
   - **Community-Templates:** Andere Hosts teilen Workflows (mit Bewertungen)

#### **B) KI-Integration**

1. **Smart Categorization (Workflow-Step)**
   ```
   AI_CATEGORIZE_PHOTO {
     input: uploadedPhoto
     output: { category: 'bridal_couple' | 'group' | 'kids' | ... }
     config: { customLabels?: string[], confidence: 0.8 }
     action: Auto-assign to Category
   }
   ```

2. **Smart Duplicate Detection (Workflow-Step)**
   ```
   AI_DUPLICATE_CHECK {
     input: uploadedPhoto
     output: { isDuplicate: bool, groupId?: string, isBest: bool }
     action: if isBest → APPROVE, else → SUGGEST_DELETE
   }
   ```

3. **AI-Prompt-Generator (Builder-Feature)**
   - Admin schreibt: "Mache Foto vintage"
   - KI schlägt vor: AI_STYLE_POP mit `style: 'retro'`, `intensity: 0.7`

4. **Workflow-Optimierung via KI**
   - "Dein Workflow hat 8 Steps, aber Step 4-6 werden von 80% geskippt. Vorschlag: Entferne oder vereinfache."

#### **C) E-Mail-Automatisierung (Workflow-Steps)**

**Neue Steps:**

1. **EMAIL_INVITE**
   ```
   config: {
     template: 'pre_event_invitation',
     sendAt: 'event_date - 7 days',
     recipients: 'all_guests',
     includeCalendar: true,
     includeQR: true
   }
   ```

2. **EMAIL_REMINDER**
   ```
   config: {
     trigger: 'event_date - 1 day',
     condition: 'rsvp_status === "pending"'
   }
   ```

3. **EMAIL_THANK_YOU**
   ```
   config: {
     trigger: 'event_end + 2 hours',
     attachHighlightReel: true,
     includeDownloadLink: true
   }
   ```

4. **EMAIL_STORAGE_EXPIRY**
   ```
   config: {
     trigger: 'storage_end - 7 days',
     attachZip: true
   }
   ```

**Backend:** Cron-Worker scannt `BoothWorkflow` mit `flowType: EMAIL_AUTOMATION`, führt Steps zur konfigurierten Zeit aus.

#### **D) Individuelle Gast-Pfade**

**Neue Condition-Felder:**

```typescript
CONDITION {
  field: 'guest_rsvp_status' | 'guest_package' | 'guest_plus_one' | 'guest_dietary' | 'guest_table' | 'guest_upload_count' | 'guest_has_face_consent'
  operator: 'equals' | 'not_equals' | 'greater_than' | ...
  value: 'confirmed' | 'premium' | '5' | ...
}
```

**Beispiel-Workflow: "VIP-Gäste bekommen AI-Features"**

```
TRIGGER_PHOTO_UPLOAD
  → CONDITION(guest_package === 'premium')
     ├─ THEN: AI_STYLE_POP → EMAIL_SHARE
     └─ ELSE: PRINT
```

**Umsetzung:** Runtime bekommt `guestId` als Param, lädt `Guest`-Model aus DB, füllt `collectedData.guest_*`.

#### **E) Whitelabeling**

1. **Partner-Library**
   ```
   BoothWorkflow {
     ...
     ownerId?: string  // Partner-ID oder null (=global)
     isPartnerTemplate: bool
   }
   ```
   - Partner sieht nur seine + globale Templates
   - Partner-Admin kann Steps sperren (nur seine Partner-Events dürfen sie nutzen)

2. **Event-Branding (Runtime)**
   ```
   Event {
     brandingConfig: {
       primaryColor: '#...',
       logo: '...',
       font: '...'
     }
   }
   ```
   - Workflow-Runner liest `Event.brandingConfig`, passt Theme an
   - Step-Komponenten nutzen `var(--event-primary)` statt Hardcoded-Colors

3. **Workflow-Export/Import**
   - "Export als JSON" → Host kann Template teilen
   - "Import von URL" → Lade Community-Template
   - **Template-Marketplace:** Hosts können Templates verkaufen (mit gästefotos.com-Commission)

#### **F) Test-Modus**

1. **Simulation im Builder**
   - **"Play"-Button** neben "Speichern"
   - Modal öffnet sich, Workflow läuft mit Mock-Daten
   - Mock-Profil wählbar: "Gast mit Premium-Package", "Gast ohne Consent", "Fotograf"
   - Zeige jeden Step-Durchlauf in Console (rechts)

2. **Branch-Visualisierung**
   - Hovere über CONDITION → Zeige in Minimap, welche Nodes bei "Ja"/"Nein" erreicht werden
   - Rot/Grün-Highlightung der Pfade

3. **Live-Testing mit echtem Event**
   - Admin aktiviert "Test-Mode" für Event
   - Nur er selbst sieht Test-Workflows
   - Änderungen live → Sofort im Browser testen

4. **Workflow-Analytics**
   - Nach Event: Zeige Heatmap, welche Steps wie oft durchlaufen wurden
   - "95% der Gäste skippten Step 4" → Zeige als Badge auf Node

---

### 2.3 Technische Architektur (Next-Level)

#### **A) State Machine mit XState**

**Problem IST:** Custom-Engine ist gut, aber nicht industrie-standard.

**Lösung:** Migration zu **XState** (State Machines für JS/TS)

**Vorteile:**
- **Visualizer:** XState hat eigenen Visual Editor → könnte unser Builder ersetzen/erweitern
- **Nested States:** Sub-Workflows möglich
- **History States:** "Zurück zum letzten stabilen Zustand"
- **Guards & Actions:** Cleanere Separation von Logic
- **Testing:** XState-Workflows sind unit-testbar per Definition
- **Serialisierbar:** Machine-Config ist JSON → passt zu unserem DB-Model

**Beispiel:**
```typescript
const boothMachine = createMachine({
  id: 'booth',
  initial: 'idle',
  states: {
    idle: { on: { START: 'countdown' } },
    countdown: { after: { 3000: 'takingPhoto' } },
    takingPhoto: {
      invoke: {
        src: 'capturePhoto',
        onDone: { target: 'preview', actions: 'savePhoto' },
        onError: 'error'
      }
    },
    preview: { on: { RETAKE: 'countdown', APPROVE: 'sharing' } },
    sharing: { /* ... */ },
    error: { on: { RETRY: 'countdown' } }
  }
});
```

**Migration:** Workflow-JSON wird zu XState-Config transformiert (Backend macht das on-the-fly).

#### **B) Event-Driven Architecture**

**Problem IST:** Steps kommunizieren nur via `collectedData` (shared state).

**Lösung:** **Event-Bus** (z. B. mit EventEmitter3 oder Pub/Sub)

**Use Cases:**
1. **Trigger andere Workflows:** Foto hochgeladen → Event `photo.uploaded` → Startet "Mosaic-Worker"-Workflow
2. **Live-Updates:** Admin sieht in Dashboard, welcher Gast gerade bei welchem Step ist
3. **Webhooks:** Event `workflow.completed` → POST zu externem CRM

**Implementierung:**
```typescript
// In Engine
class WorkflowEngine {
  private eventBus: EventEmitter;
  
  completeStep(...) {
    // ...
    this.eventBus.emit('step.completed', { nodeId, result });
  }
}

// Extern (z.B. im Backend Worker)
workflowEngine.on('step.completed', async ({ nodeId, result }) => {
  if (nodeId === 'upload_step') {
    await triggerMosaicWorkflow(result.photoId);
  }
});
```

#### **C) Workflow-Verkettung (Sub-Workflows)**

**Neuer Step-Typ:**
```
CALL_WORKFLOW {
  config: {
    workflowId: 'abc-123',
    mode: 'sync' | 'async',
    passData: ['photoId', 'eventId']
  }
  outputs: [
    { id: 'success', label: 'Erfolg', type: 'default' },
    { id: 'error', label: 'Fehler', type: 'conditional' }
  ]
}
```

**Use Case:** Main-Workflow "Upload" ruft Sub-Workflow "AI-Processing" auf, der wiederum "Duplicate-Check" aufruft.

#### **D) Versionierung & Rollback**

**IST:** `version` (Int), aber kein Diff.

**Upgrade:**
1. **Git-Style Diffs:** Nutze `diff` (npm package) für Workflow-JSON
2. **Backup-Visualisierung:** Zeige "Added 2 Nodes, Changed 1 Edge"
3. **Rollback mit Merge:** Wenn Workflow gesperrt war, aber Admin A & B parallel editiert haben → Conflict-Resolution-UI

#### **E) Collaboration (Multi-User-Editing)**

**Problem:** Zwei Admins öffnen denselben Workflow → Letzter gewinnt.

**Lösung:** **Operational Transformation** (OT) oder **CRDT** (Conflict-free Replicated Data Types)

**Light-Version (ohne OT):**
- WebSocket-basierte Locks: "Admin A editiert gerade Node X" → Admin B sieht Warnung
- Auto-Refresh alle 5s: "Workflow wurde aktualisiert, neu laden?"

**Full-Version:**
- **Yjs** (CRDT-Lib) für Echtzeit-Kollaboration wie in Figma
- Cursor von anderen Admins sichtbar

#### **F) Performance: Lazy Loading & Virtualisierung**

**Problem:** Bei 50+ Nodes lädt ReactFlow langsam.

**Lösung:**
1. **ReactFlow's `nodeExtent`:** Nur Nodes im Viewport rendern
2. **Code-Splitting:** Step-Komponenten lazy loaden
3. **Memoization:** `React.memo` für WorkflowNode

---

### 2.4 Feature-Roadmap (priorisiert)

#### **Phase 1: Fundament (Q2 2026)**

| Feature | Aufwand | Impact | Status |
|---------|---------|--------|--------|
| Zod-Validierung für Step-Configs | 3d | Hoch | 🟢 Must |
| Test-Modus (Simulation) | 5d | Sehr Hoch | 🟢 Must |
| Undo/Redo im Builder | 2d | Mittel | 🟡 Should |
| Verbesserte Error-Messages | 2d | Hoch | 🟢 Must |
| Workflow-Analytics (Heatmap) | 5d | Hoch | 🟡 Should |

#### **Phase 2: KI & Automation (Q3 2026)**

| Feature | Aufwand | Impact | Status |
|---------|---------|--------|--------|
| AI_CATEGORIZE_PHOTO Step | 8d | Sehr Hoch | 🟢 Must |
| AI_DUPLICATE_CHECK Step | 5d | Hoch | 🟡 Should |
| E-Mail-Workflow-Steps (4 neue) | 10d | Sehr Hoch | 🟢 Must |
| Cron-Worker für zeitbasierte Trigger | 8d | Sehr Hoch | 🟢 Must |
| Smart Condition-Suggestions | 5d | Mittel | 🟣 Could |

#### **Phase 3: Whitelabeling & Marktplatz (Q4 2026)**

| Feature | Aufwand | Impact | Status |
|---------|---------|--------|--------|
| Partner-Library (ownerId) | 5d | Hoch | 🟡 Should |
| Event-Branding (Theme-Variablen) | 5d | Hoch | 🟡 Should |
| Workflow-Export/Import (JSON) | 3d | Mittel | 🟡 Should |
| Template-Marketplace (MVP) | 20d | Mittel | 🟣 Could |

#### **Phase 4: Next-Level-Architektur (2027)**

| Feature | Aufwand | Impact | Status |
|---------|---------|--------|--------|
| Migration zu XState | 15d | Mittel | 🟣 Could |
| Event-Bus (Pub/Sub) | 8d | Hoch | 🟡 Should |
| Sub-Workflows (CALL_WORKFLOW) | 10d | Hoch | 🟡 Should |
| Multi-User-Editing (Locks) | 12d | Mittel | 🟣 Could |
| Yjs-basierte Echtzeit-Kollaboration | 25d | Niedrig | ⚪ Won't (zu aufwändig) |

---

## Zusammenfassung: Bewertung IST vs. Vision

| Kriterium | IST (2026) | SOLL (Marktführer) |
|-----------|------------|---------------------|
| **Visual Flow** | ✅ ReactFlow vorhanden | ⚠️ UX-Ausbau nötig (Smart Connections, Inline-Edit) |
| **KI-Integration** | ⚠️ AI-Steps definiert, aber nicht smart | ❌ Fehlt: Auto-Tagging, Duplicate-AI, Prompt-Gen |
| **E-Mail-Automation** | ❌ Nur manuell via Routes | ❌ Fehlt: Zeit-Trigger, Pre/Post-Event-Flows |
| **Gast-Pfade** | ❌ Nur Basic Conditions | ❌ Fehlt: RSVP/Package-basierte Routing |
| **Whitelabeling** | ❌ Nicht vorhanden | ❌ Fehlt komplett |
| **Test-Modus** | ❌ Nicht vorhanden | ❌ Fehlt: Simulation, Branch-Viz, Analytics |
| **Fehler-Resilienz** | ⚠️ Basic (neu starten) | ❌ Fehlt: Recovery, Offline-Queue |
| **Architektur** | ✅ Solide State Machine | ⚠️ Upgrade: XState, Event-Bus, Sub-Workflows |
| **Performance** | ✅ Ok für <50 Nodes | ⚠️ Optimization nötig für >100 Nodes |
| **Testing** | ❌ Keine Tests | ❌ Unit + E2E fehlt |

**Fazit:** Der Builder ist ein **solides Fundament** (7/10), aber für "marktführend" fehlen:
1. **Testing & Simulation** (Blocker für Production-Ready)
2. **KI-Features** (Differentiator zu Konkurrenz)
3. **E-Mail-Automation** (Ganzheitlichkeit)
4. **Whitelabeling** (Skalierbarkeit für Partner)

**Empfehlung:** Fokus auf **Phase 1 & 2** (Fundament + KI/Automation), dann **Phase 3** (Whitelabeling). Phase 4 ist "Nice-to-have".

---

## Nächste Schritte (vorgeschlagen)

1. **User-Feedback:** Zeige 3-5 Power-Usern Mockups von Test-Modus & KI-Features
2. **Spike:** XState-Migration (1 Woche) vs. Custom-Engine erweitern (Entscheidung)
3. **Prototyp:** Test-Modus-MVP (2 Wochen)
4. **Iterativ:** Pro Sprint 1-2 High-Impact-Features aus Phase 1/2

**Ready für Abstimmung!** 🚀
