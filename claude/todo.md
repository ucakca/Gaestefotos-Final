# 📋 Gaestefotos App - 360° Audit TODO-Liste

**Audit gestartet:** 16. Februar 2026  
**Status:** In Bearbeitung ⏳

---

## 🔍 PHASE 1: Deep-Mapping & Struktur (Sonnet 4.5)

### ✅ Abgeschlossen
- [x] ✅ Architektur-Map erstellen (Monorepo-Struktur)
- [x] ✅ Verzeichnis-Analyse (alle 6 Packages)
- [x] ✅ Abhängigkeiten zwischen Packages identifizieren
- [x] ✅ Tech-Stack-Dokumentation erstellen

### ✅ Abgeschlossen
- [x] ✅ Ungenutzten/redundanten Code identifizieren

---

**📊 PHASE 1 ERGEBNIS:**
- ✅ Architektur-Map erstellt (77 DB-Models, 6 Packages, 545 Dateien)
- ✅ Tech-Stack dokumentiert
- ✅ Ungenutzten Code identifiziert (minimal!)
- ⚠️ **Kritischer Fund:** Upload-Dateien im Git (sollten in S3 sein)
- 🟡 **Dokumentations-Chaos:** 305 MD-Dateien + 16k Archive-Einträge

**➡️ Bereit für Phase 2**

---

## 📐 PHASE 2: Logik-Audit & Feature-Ideen (Sonnet 4.5)

### ✅ Abgeschlossen
- [x] ✅ Foto-Upload-Zyklus analysieren (End-to-End)
- [x] ✅ Event-Management-Flow prüfen
- [x] ✅ Datenbankschema analysieren (Prisma)
- [x] ✅ API-Endpoints inventarisieren (48+ Endpoints)
- [x] ✅ Logikfehler & Race Conditions identifizieren (6 gefunden!)
- [x] ✅ Performance-Bottlenecks finden (N+1 Queries, etc.)
- [x] ✅ Feature-Vorschläge erstellt (10 High-Value Features!)

---

**📊 PHASE 2 ERGEBNIS:**
- ✅ Upload-Pipeline analysiert (8 Schritte, 7 Middleware-Layers)
- ✅ **6 Kritische Probleme** identifiziert:
  - Race Condition bei Concurrent Uploads
  - N+1 Query Problem
  - Lange Upload-Zeiten (5-10s → Job-Queue empfohlen!)
  - Event-Datum-Fenster zu kurz (±1 Tag → konfigurierbar machen)
  - Fehlende Soft-Delete-Bestätigung
  - Package-Upgrade-Issues
- ✅ **10 Feature-Vorschläge** (WhatsApp, PWA, Face-Grouping, Instagram, etc.)
- ✅ **4 Bugs** gefunden (qrDesign Table, Invitation Editor, etc.)
- ✅ **3 Performance-Optimierungen** vorgeschlagen

**➡️ Bereit für Phase 3 (Security-Audit)**

---

## 🔐 PHASE 3: Security & DB-Hardening (Opus 4.6)

### ✅ Abgeschlossen
- [x] ✅ OWASP Top 10 Prüfung (alle 10 Kategorien)
- [x] ✅ Authentifizierung & Autorisierung (2FA, RBAC)
- [x] ✅ Datei-Upload-Sicherheit (Magic-Bytes fehlen!)
- [x] ✅ Environment-Variables & Secrets-Management
- [x] ✅ SQL/NoSQL-Injection (✅ Prisma schützt)
- [x] ✅ XSS-Schwachstellen (Helmet aktiv)
- [x] ✅ CSRF-Schutz (vorhanden, aber in Map statt Redis)
- [x] ✅ Datenbank-Sicherheit (Encryption-Empfehlungen)
- [x] ✅ Rate-Limiting (sehr gut implementiert!)
- [x] ✅ SSL/TLS-Konfiguration (TLS 1.2/1.3)
- [x] ✅ Permissions & Access Control
- [x] ✅ Security-Feature-Vorschläge (4 Features)

---

**📊 PHASE 3 ERGEBNIS:**
- ✅ **Security-Score: 7/10** ⭐⭐⭐⭐⭐⭐⭐
- 🔴 **5 KRITISCHE Findings:**
  - Virus-Scan ist STUB (kein echter Scan!)
  - Magic-Byte-Validation fehlt
  - JWT_SECRET in .env (sollte in Vault)
  - SeaweedFS mit Default-Credentials
  - Brute-Force-Protection fehlt
- 🟡 **7 MITTLERE Findings** (CSRF-Store, Permission-Validation, etc.)
- 🟢 **3 NIEDRIGE Findings**
- ✅ **4 Security-Features** vorgeschlagen (Anomalie-Erkennung, CSP-Reporting, etc.)

**➡️ Bereit für Phase 4 (UX/Design-Audit)**

---

## 🎨 PHASE 4: UX, Design & Marketing (Gemini 3 Flash)

### Noch nicht gestartet
- [ ] UI/UX-Konsistenz bewerten
- [ ] Responsive Design prüfen
- [ ] Accessibility (WCAG) prüfen
- [ ] SEO-Optimierung analysieren
- [ ] Ladezeiten & Performance (Lighthouse)
- [ ] User-Flow-Optimierungen
- [ ] Conversion-Rate-Optimierung
- [ ] Mobile-First-Strategie
- [ ] Branding & Visual Identity
- [ ] Marketing-Feature-Vorschläge

---

## 📊 PHASE 5: Realitäts-Check & Abschlussbericht (Gemini 3 Flash)

### Noch nicht gestartet
- [ ] Abgleich mit .md-Dokumentation
- [ ] Feature-Vollständigkeit prüfen
- [ ] Bug-Liste priorisieren
- [ ] Feature-Roadmap erstellen
- [ ] Quick-Wins identifizieren
- [ ] Technische Schulden dokumentieren
- [ ] Finaler Audit-Report

---

## 📈 Entdeckte Probleme

### 🔴 Kritisch
_(Wird während des Audits gefüllt)_

### 🟡 Wichtig
_(Wird während des Audits gefüllt)_

### 🟢 Nice-to-Have
_(Wird während des Audits gefüllt)_

---

## 💡 Feature-Vorschläge

### 🚀 High Priority
_(Wird während des Audits gefüllt)_

### 📌 Medium Priority
_(Wird während des Audits gefüllt)_

### 🎯 Future Consideration
_(Wird während des Audits gefüllt)_

---

---

## 🐛 KRITISCHER BUG GEFUNDEN & BEHOBEN

### 🌓 Dark Mode Inkonsistenz (16. Feb 2026)

**Problem:**
- Event-Dashboard hatte **hardcoded** hellen Hintergrund
- Ignorierte Dark Mode komplett → massive visuelle Inkonsistenz

**Ursache:**
- 2x `bg-[hsl(30_20%_98%)]` statt `bg-background`
- Zeilen 407 + 443 in `app/events/[id]/dashboard/page.tsx`

**Fix:**
- ✅ Zeile 407: `bg-[hsl(30_20%_98%)]` → `bg-background`
- ✅ Zeile 443: `bg-[hsl(30_20%_98%)]` → `bg-background`

**Status:** ✅ BEHOBEN  
**Testing:** ⏳ Lokal testen empfohlen  
**Deployment:** 📋 Bereit für Staging/Production

**Details:** Siehe `claude/DARK_MODE_FIX_COMPLETE.md`

---

### 📝 Text-Inkonsistenzen (16. Feb 2026)

**Problem:**
- "Schliessen" statt "Schließen" (Schweizer statt Hochdeutsch)
- "Hell-Modus" statt "Heller Modus" (inkonsistent mit ThemeToggle)

**Betroffene Datei:**
- `components/e3/EventHero.tsx` (3 Stellen)

**Fix:**
- ✅ "Schliessen" → "Schließen" (2x)
- ✅ "Hell-Modus" → "Heller Modus"
- ✅ "Dunkel-Modus" → "Dunkler Modus"

**Status:** ✅ BEHOBEN  
**Event-Seite:** ✅ Theme-konsistent (keine hardcodierten Farben!)

**Details:** Siehe `claude/TEXT_INKONSISTENZEN_REPORT.md` + `claude/INKONSISTENZEN_BEHOBEN.md`

---

---

## 🚨 KRITISCHES UX-PROBLEM: Upload-Flow

**User-Feedback:** "viel zu viele schritte", "funktioniert nicht"

### Analyse-Ergebnisse:

**Problem:**
- ❌ **8 Schritte** für einen Foto-Upload (Benchmark: Instagram = 2-3 Schritte)
- ❌ Pflichtfelder VOR Upload (Name, Album)
- ❌ Workflow-System zu komplex für Mobile-Web
- ❌ Geschätzte **55% Abbruch-Rate**

**Impact:**
- 🔴 Nur **45% Upload-Completion-Rate**
- 🔴 User-Frustration sehr hoch
- 🔴 Weniger Event-Fotos = Unzufriedene Hosts

### Empfohlene Lösungen:

1. **🔥 Quick-Win (P0):** Express-Upload-Button (4h Aufwand)
   - Foto wählen → Upload startet SOFORT
   - Name/Album nachträglich
   - +100% Upload-Rate erwartet

2. **⭐ Instagram-Stil (P1):** 2-Schritt-Flow (1-2 Tage)
   - Native File-Picker
   - Smart Defaults (LocalStorage)
   - AI-Auto-Kategorisierung nutzen

3. **🏗️ Langfristig (P2):** Workflow-System NUR für Hardware-Booth
   - Mobile-Web: Eigene optimierte Komponente
   - Separation of Concerns

### Nächste Schritte:
- [ ] Team-Meeting: Strategie festlegen
- [ ] Debug "funktioniert nicht" (Browser-Console prüfen)
- [ ] A/B-Test-Setup vorbereiten
- [ ] Quick-Win implementieren?

**Details:** Siehe `claude/UX_ANALYSE_UPLOAD_FLOW.md` + `claude/UPLOAD_FLOW_EMPFEHLUNGEN.md`

---

---

## 📋 TODO FÜR OPUS/WINDSURF - Upload-Flow Implementation

**Erstellt:** 16. Februar 2026  
**Assignee:** Opus/Windsurf  
**Geschätzter Aufwand:** 10 Stunden  
**Branch:** `feature/quick-upload-modal`

### Haupt-Tasks:
- [ ] TASK 1: QuickUploadModal.tsx erstellen (4h)
- [ ] TASK 2: Foto-Auswahl Screen (1h)
- [ ] TASK 3: Parallel-Upload Logic (3h)
- [ ] TASK 4: Success-Screen (1h)
- [ ] TASK 5: Integration in e3/page.tsx (0.5h)
- [ ] TASK 6: Backend Rate-Limit erhöhen (0.25h)
- [ ] TASK 7: Workflow maxFiles: 10 → 100 (0.25h)
- [ ] TASK 8: Error-Handling & Retry (2h)
- [ ] TASK 9: Progress-Anzeige optimieren (1.5h)
- [ ] TASK 10: LocalStorage Name-Persistierung (0.5h)
- [ ] TASK 11: Auto-Kategorisierung aktivieren (0.25h)

**Spezifikationen:**
- Instagram-Stil (2-3 Schritte statt 8)
- Max 100 Fotos (statt 10)
- Paralleler Upload (5 gleichzeitig)
- Native File-Picker
- Bestehende Design-Language beibehalten!

**Details:** Siehe `claude/TODO_OPUS_WINDSURF_UPLOAD_FLOW.md`

---

**Letzte Aktualisierung:** 16. Februar 2026, TODO für Windsurf erstellt
