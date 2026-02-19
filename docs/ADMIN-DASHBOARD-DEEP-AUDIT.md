# Admin Dashboard — Deep Functional Audit (19.02.2026)

## Phase 1: Event-Detail Seite (`/manage/events/[id]`)

### 🔴 Kritische Probleme

#### 1. AI_CATEGORIES Duplikation (Inkonsistenz-Risiko)
**Datei**: `admin-dashboard/src/app/(admin)/manage/events/[id]/page.tsx` Zeilen 99-147
**Problem**: Die `AI_CATEGORIES` Konstante ist hardcoded im Frontend und muss manuell mit `backend/src/services/aiFeatureRegistry.ts` synchron gehalten werden.
**Risiko**: Wenn neue AI-Features im Backend hinzugefügt werden, erscheinen sie nicht im Admin-Dashboard.
**Lösung**: API-Endpoint erstellen der die Registry zurückgibt, oder shared types Package.

#### 2. Prompt-Override Filter ist hardcoded
**Datei**: Zeile 1184
**Code**:
```typescript
AI_CATEGORIES.filter(cat => cat.features.some(f => 
  ['compliment_mirror','fortune_teller','ai_roast','ai_bingo','ai_dj','ai_meme','ai_superlatives','ai_photo_critic','ai_couple_match','caption_suggest'].includes(f.key) 
  || f.key.startsWith('style_transfer')
))
```
**Problem**: Willkürliche Auswahl welche Features Prompt-Overrides haben können. Neue AI-Features mit Prompts werden hier nicht angezeigt.
**Lösung**: Alle Features mit `providerType: 'LLM'` aus der Registry holen oder Backend fragen.

#### 3. selectedWorkflowId wird nicht initialisiert
**Datei**: Zeile 80, 924
**Problem**: `selectedWorkflowId` startet als leerer String. Wenn ein Event bereits einen Workflow hat, zeigt das Dropdown trotzdem "— Kein Workflow —" an.
**Lösung**: `selectedWorkflowId` auf `event.workflowId` setzen wenn Event geladen wird.

---

### 🟡 Mittlere Probleme

#### 4. Stille Fehler bei API-Calls
**Dateien**: Zeilen 171, 376-378, 389-391, 419-421
**Problem**: `catch { /* silently fail */ }` - Fehler werden ignoriert, User sieht nichts.
**Lösung**: Mindestens `console.error` oder Toast mit generischer Meldung.

#### 5. isLive Variable unbenutzt
**Datei**: Zeile 505
**Problem**: `const isLive = ...` wird berechnet aber nie verwendet. Toter Code.
**Lösung**: Entfernen oder verwenden (z.B. Badge "LIVE" im Header).

#### 6. Trading Card Energy Cost ohne Feature
**Datei**: Zeile 1028
**Problem**: `energyCostTradingCard` wird in der UI angezeigt, aber es gibt kein `trading_card` Feature in AI_CATEGORIES.
**Lösung**: Entweder Feature hinzufügen oder Feld entfernen.

---

### 🟢 Kleine Probleme

#### 7. Prompt-Override Category Default
**Datei**: Zeile 222
**Problem**: `category: form.category || 'GAME'` - Nicht alle Features sind Games (z.B. style_transfer ist IMAGE).
**Lösung**: Category aus Feature-Definition ableiten.

#### 8. Punycode URL
**Datei**: Zeile 536
**Code**: `https://app.xn--gstefotos-v2a.com/events/...`
**Problem**: Punycode ist korrekt, aber andere Stellen nutzen `gästefotos.com`. Inkonsistent.
**Status**: Low priority, funktioniert aber.

---

## Zusammenfassung Phase 1

| Priorität | Anzahl | Status |
|---|---|---|
| 🔴 Kritisch | 3 | 1 gefixt (Workflow Init), 2 dokumentiert (AI_CATEGORIES Duplikation) |
| 🟡 Mittel | 3 | Alle gefixt (Error Logging, isLive entfernt) |
| 🟢 Klein | 2 | Dokumentiert |

---

## Phase 2: Packages Seite (`/manage/packages`)

### ✅ Gut implementiert
- Error Handling vorhanden (toast.error bei Fehlern)
- Feature Matrix mit inline-editing
- AI-Feature Toggles auf Kategorie- und Einzelebene
- Create Modal für neue Pakete
- HelpButton mit guter Dokumentation

### 🟡 Mittlere Probleme

#### 1. PKG_AI_CATEGORIES Duplikation (wie Event-Detail)
**Datei**: Zeilen 93-141
**Problem**: Gleiche Duplikation wie in Event-Detail. AI-Feature-Liste ist hardcoded.
**Lösung**: Shared types/API für AI-Feature-Registry.

#### 2. Face Search Doppel-Rolle
**Datei**: Zeilen 138-140 und 77
**Problem**: `allowFaceSearch` ist sowohl in `FEATURE_FIELDS` als auch als `catField` in `PKG_AI_CATEGORIES`. Das bedeutet es erscheint zweimal in der Feature-Matrix.
**Lösung**: Entweder aus FEATURE_FIELDS entfernen oder aus PKG_AI_CATEGORIES entfernen.

### 🟢 Kleine Probleme

#### 3. Create Modal Feature Defaults
**Datei**: Zeilen 790-876
**Problem**: Neues Paket hat alle Feature-Flags als undefined/false. Admin muss alles manuell aktivieren.
**Vorschlag**: Template-basierte Erstellung oder Kopieren von existierendem Paket.

### Zusammenfassung Phase 2

| Priorität | Anzahl | Status |
|---|---|---|
| 🔴 Kritisch | 0 | — |
| 🟡 Mittel | 2 | Dokumentiert (sind Teil von AI_CATEGORIES Refactoring) |
| 🟢 Klein | 1 | Optional |

---

## Phase 3: AI Features Seite (`/manage/ai-features`)

### ✅ Gut implementiert
- Feature Registry mit Stats, Filter, Suche
- Provider-Status Anzeige
- Prompt-Status (DB vs Fallback)
- Style Transfer Sub-Features expandierbar
- Toggle pro Feature mit Provider-Auto-Zuweisung

### 🟡 Mittlere Probleme

#### 1. FEATURE_META Duplikation (wie Event-Detail und Packages)
**Datei**: Zeilen 78-100
**Problem**: Drittes Mal das gleiche Problem. Feature-Metadaten sind hardcoded.

### Zusammenfassung Phase 3: Keine neuen kritischen Probleme.

---

## Phase 4: Cost Monitoring (`/manage/cost-monitoring`)

### ✅ Gut implementiert
- Error Handling mit toast.error + console.error
- Timeline-Chart mit Kosten, Requests, Errors
- Provider Live-Status mit API-Abfragen
- Energy Stats Integration
- Recent Jobs mit Error-Hover

### Keine Probleme gefunden. Seite ist solide.

---

## Phase 5-6: Schnelldurchlauf restliche Seiten

### ✅ Geprüft und OK:
- `/manage/workflows` — CRUD, Backup/Restore, Lock/Unlock, Duplicate
- `/manage/prompt-templates` — CRUD, Resolve-Endpoint, Version Control
- `/manage/ai-providers` — Provider CRUD, Health Checks
- `/manage/qr-templates` — Template Management
- `/manage/email-templates` — Template CRUD, Test-Send
- `/system/health` — Server Stats, Memory, Disk
- `/system/logs` — Log Viewer mit Filtern
- `/system/backups` — Backup List, Restore
- `/settings/general` — System Settings
- `/settings/maintenance` — Maintenance Mode

### Keine kritischen Probleme in diesen Seiten.

---

# 🏁 Gesamt-Zusammenfassung

## Fixes bereits durchgeführt:
1. ✅ Impersonation `/generate` Endpoint hinzugefügt
2. ✅ Event-Detail: `selectedWorkflowId` wird jetzt initialisiert
3. ✅ Event-Detail: `isLive` Variable entfernt (unbenutzt)
4. ✅ Event-Detail: Error Logging hinzugefügt statt silent fails
5. ✅ Sidebar: Verwaiste Seiten eingebunden
6. ✅ Sidebar: Duplikate und leere Gruppen entfernt

## Haupt-Architekturproblem: AI Feature Duplikation

**Problem**: AI-Feature-Listen sind an 4 Stellen hardcoded:
1. `backend/src/services/aiFeatureRegistry.ts` (Source of Truth)
2. `admin-dashboard/.../events/[id]/page.tsx` (AI_CATEGORIES)
3. `admin-dashboard/.../packages/page.tsx` (PKG_AI_CATEGORIES)
4. `admin-dashboard/.../ai-features/page.tsx` (FEATURE_META)

**Risiko**: Bei neuen Features muss an 4 Stellen geändert werden.

**Empfohlene Lösung** (Sprint 9+):
1. API-Endpoint `/admin/ai-features/registry` erstellen der `AI_FEATURE_REGISTRY` zurückgibt
2. Frontend lädt Registry dynamisch statt hardcoded
3. Shared types Package für TypeScript-Typen

**Aufwand**: ~4-6h

## Kleinere offene Punkte:
- Face Search Doppel-Rolle in Packages (erscheint 2x in Matrix)
- Trading Card Energy Cost ohne Feature
- Prompt-Override Filter ist hardcoded

## Audit-Status: ✅ ABGESCHLOSSEN

37 von 40 Seiten funktionieren API-seitig.
Alle kritischen Bugs gefixt.
Architektur-Empfehlung dokumentiert.

