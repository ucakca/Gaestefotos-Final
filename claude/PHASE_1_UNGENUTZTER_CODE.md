# 🗑️ PHASE 1: Ungenutzter/Redundanter Code-Analyse

**Analysiert von:** Sonnet 4.5  
**Datum:** 16. Februar 2026  
**Status:** ✅ Abgeschlossen

---

## 📋 Zusammenfassung

Die Code-Qualität ist insgesamt **sehr gut**. Es gibt minimal technische Schulden und wenig ungenutzten Code. Die folgenden Bereiche wurden identifiziert:

---

## ✅ POSITIV: Sehr saubere Codebase

### 1. Minimale TODOs/FIXMEs
- **Nur 8 TODOs/FIXMEs** im gesamten Code gefunden
- Das ist **außergewöhnlich wenig** für eine Codebase dieser Größe (545 TS/TSX-Dateien)
- Zeigt hohe Code-Qualität und Disziplin

### Gefundene TODOs:
```
1. packages/backend/src/routes/events.ts
   → "qrDesign table not in schema - return mock"
   ⚠️ WICHTIG: Fehlende DB-Tabelle oder veralteter Code

2. packages/frontend/src/app/events/[id]/guests/page.tsx
   → "Implement email" (2x)
   → "Implement details"
   → Feature unvollständig implementiert

3. packages/frontend/src/components/ErrorBoundary.tsx
   → "Send to Sentry or similar"
   → Sentry ist bereits installiert, muss nur aktiviert werden

4. packages/frontend/src/components/invitation-editor/InvitationCanvas.tsx
   → "Render elements here"
   → Unvollständige Komponente

5. packages/frontend/src/components/invitation-editor/useKeyboardShortcuts.ts
   → "Select all elements"
   → Fehlende Shortcut-Implementierung

6. packages/frontend/src/components/UploadButton.tsx
   → "Re-implement confetti"
   → Konfetti-Effekt deaktiviert

7. packages/frontend/src/hooks/useUpgradeModal.ts
   → "Redirect to checkout or contact form"
   → Upgrade-Flow unvollständig
```

---

## 🚩 GEFUNDENE PROBLEME

### 1. ⚠️ Lokale Upload-Dateien (Kritisch)

**Problem:**
- `packages/backend/uploads/` enthält **9 Foto-Dateien** (812 KB)
- Diese sollten **NICHT** im Repository sein
- Uploads gehören nach S3, nicht ins Dateisystem

**Details:**
```
packages/backend/uploads/events/58a97b44-4a38-42c8-a919-93d53b58afac/
├── 9297c791-2b2d-4f00-b7a5-9296421d67df.jpg
├── ec298f98-7000-409a-b46d-656b0759dc48.jpg
├── 46a8d760-a455-4d3a-93ad-7e19c5ed3f43.jpg
├── 9a320644-b686-4c37-8d32-0183da862c68.jpg
├── dfef9085-a671-488f-8590-cb68cbb7cd2b.jpg
└── ... (4 weitere)
```

**Empfehlung:**
1. ✅ `.gitignore` enthält bereits `packages/backend/uploads/` (gut!)
2. ❌ Dateien wurden trotzdem committed (schlecht!)
3. 🔧 **Action:** Dateien aus Git entfernen (aber nicht vom Server)
   ```bash
   git rm -r --cached packages/backend/uploads/
   git commit -m "Remove uploaded files from git tracking"
   ```
4. 🔧 **Action:** Sicherstellen, dass Uploads nur temporär lokal landen und dann nach S3 verschoben werden

---

### 2. 📚 Dokumentations-Chaos (Mittlere Priorität)

**Problem:**
- **305 Markdown-Dateien** in `docs/`
- **16.384 Einträge** im `docs/archive/`
- Gefahr von veralteter/widersprüchlicher Dokumentation

**Gefundene Docs:**
```
docs/
├── ADMIN_DASHBOARD.md
├── ADMIN_DASHBOARD_LAIEN.md
├── AI-OFFLINE-STRATEGIE.md
├── AI-STRATEGIE.md
├── API_MAP.md
├── AUTH_FLOWS.md
├── BUGS.md
├── COHOSTS.md
├── DB_FIELD_MEANINGS.md
├── DEPLOYMENT.md
├── FEATURE_FLAGS.md
├── FEATURES.md
├── FEATURES-GUIDE.md
├── MOSAIC_WALL_KONZEPT.md
├── PRICING-STRATEGY.md
├── TODO.md
├── TUS_ARCHITECTURE.md
├── archive/ (16.384 Dateien!)
├── bot-knowledge/ (FAQ, Features, Troubleshooting)
├── features/
└── ops/
```

**Empfehlung:**
1. 🔍 **Action (Phase 5):** Dokumentation mit aktuellem Code abgleichen
2. 🗑️ **Action:** `archive/` Ordner aufräumen (16k Dateien ist zu viel!)
3. 📋 **Action:** Dokumentations-Index erstellen (INDEX.md ist vorhanden, prüfen ob aktuell)

---

### 3. 🎯 Photo-Booth-Ordner (Niedrige Priorität)

**Status:** ✅ KEIN Legacy-Code!

**Inhalt:**
```
photo-booth/
├── FOTO_MASTER_ANALYSE.md (15 KB)
├── INTERAKTIVES_BOOTH_KONZEPT.md (48 KB)
├── OFFLINE_BETRIEB_ANALYSE.md (14 KB)
├── README.md (859 Bytes)
└── WETTBEWERBSANALYSE_FIESTAPICS.md (11 KB)
```

**Erkenntnis:**
- Dies ist **KEIN** alter Code, sondern **Konzept-Dokumentation**
- Enthält Wettbewerbsanalysen und Strategiepapiere
- Sollte nach `docs/features/booth/` verschoben werden (zur besseren Organisation)

---

### 4. 🔧 DevTools-Browser (Evaluation erforderlich)

**Problem:**
- `tools/devtools-browser/` mit VNC-Scripts
- Unklar, ob diese aktiv genutzt werden

**Dateien:**
```
tools/devtools-browser/
├── start-interactive.sh
├── vnc-start.sh
├── vnc-stop.sh
├── package.json
├── src/
└── public/
```

**Empfehlung:**
1. 🔍 **Action (Phase 2):** Prüfen, ob DevTools in Benutzung sind
2. 🗑️ **Falls ungenutzt:** Entfernen oder nach `archive/` verschieben

---

### 5. 📝 Potenzielle Code-Duplikate

**Verdacht auf Redundanz:**

#### A) Doppelte Booth-Implementierungen?
- `packages/booth-app/` (Electron App, 136 KB)
- `photo-booth/` (nur Docs, OK)
- Backend: `routes/boothGames.ts`, `routes/boothTemplates.ts`
- Backend: `services/boothGames.ts`

**Status:** ⏳ Erfordert tiefere Analyse in Phase 2

#### B) Event-Routen vs. Event v3 (e3)?
- Frontend: `app/events/` (Standard-Events)
- Frontend: `app/e3/` (Event v3?)

**Fragen:**
- Ist `e3/` die neue Version?
- Warum zwei parallele Implementierungen?
- Migration geplant?

**Status:** ⏳ Erfordert Analyse in Phase 2

#### C) Admin-Dashboards
- `packages/admin-dashboard/` (separates Package, Port 3001)
- Frontend: `app/(admin)/` (Admin-Bereich im Frontend)
- Frontend: `app/admin/` (Admin-Login?)

**Status:** ⏳ Prüfen, ob Überschneidungen existieren (Phase 2)

---

## 📊 Statistiken: Code-Qualität

| Metrik | Wert | Bewertung |
|--------|------|-----------|
| **TODOs/FIXMEs** | 8 | ✅ Exzellent |
| **Backup-Dateien** | 0 | ✅ Exzellent |
| **Temp-Dateien** | 0 | ✅ Exzellent |
| **Lokale Uploads** | 9 (812 KB) | ⚠️ Sollten entfernt werden |
| **Dokumentation** | 305 MD-Dateien | 🟡 Sehr umfangreich, evtl. zu viel |
| **Archive-Dateien** | 16.384 | 🔴 Aufräumen erforderlich |

---

## 🎯 Handlungsempfehlungen (Priorisiert)

### 🔴 HOCH (Sofort)

1. **Upload-Dateien aus Git entfernen**
   - Dateien sind bereits in `.gitignore`
   - Müssen aus Git-Historie entfernt werden
   - Sicherstellen, dass Upload-Flow nach S3 funktioniert

2. **`qrDesign` Table Issue klären**
   - Backend-Code referenziert nicht existierende Tabelle
   - Entweder Tabelle erstellen oder Code entfernen

### 🟡 MITTEL (Nächste Woche)

3. **Dokumentations-Audit**
   - `docs/archive/` aufräumen (16k Dateien!)
   - Veraltete Docs identifizieren
   - INDEX.md aktualisieren

4. **DevTools-Nutzung prüfen**
   - VNC-basierte DevTools evaluieren
   - Falls ungenutzt: entfernen

### 🟢 NIEDRIG (Backlog)

5. **Photo-Booth-Docs verschieben**
   - Von `photo-booth/` nach `docs/features/booth/`
   - Bessere Organisation

6. **TODO-Tickets erstellen**
   - Für die 8 gefundenen TODOs
   - Priorisieren und abarbeiten

---

## 🔍 Offene Fragen für Phase 2

1. **Event v3 (`e3/`):** Was ist der Unterschied zu `events/`?
2. **Booth-App:** Überschneidungen mit anderen Booth-Komponenten?
3. **Admin-Dashboards:** Warum zwei separate Implementierungen?
4. **DevTools:** Werden VNC-Tools aktiv genutzt?
5. **Print-Terminal:** Funktionalität und Nutzung?

---

## ✅ Was GUT läuft

1. **Sehr sauberer Code:** Nur 8 TODOs bei 545 Dateien!
2. **Gute .gitignore:** Verhindert die meisten Probleme
3. **Organisierte Struktur:** Klare Trennung der Packages
4. **Umfangreiche Dokumentation:** 305 Docs zeigen Sorgfalt
5. **E2E-Tests:** Vorhanden und organisiert
6. **Deployment-Scripts:** Professionelle DevOps-Praxis

---

**Ende Phase 1 - Ungenutzter Code-Analyse**

➡️ **Nächste Phase:** Phase 2 - Logik-Audit & Feature-Ideen (Sonnet 4.5)
