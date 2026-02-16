# ✅ TODO: Kompakte Übersicht (AI-Cache/Themes ausgenommen)

> **Stand**: 2026-02-16  
> **Completion**: 47% (7/15 Tasks)  
> **Referenz**: `GEGENPRÜFUNG-ALLE-AUFGABEN.md` (Vollständige Details)

---

## 🔴 KRITISCH (SOFORT!)

### 1. 🚨 TUS-Upload Security-Gap
**Problem**: `/api/uploads` hat KEINE Authentication/Authorization!  
**Gefahr**: Jeder kann Dateien hochladen ohne Event-Berechtigung

**Action**:
```typescript
// packages/backend/src/routes/uploads.ts
// TODO: Implement Signed Upload Tokens
// TODO: Add authMiddleware
// TODO: Validate Event ownership
```

**Status**: ❌ OFFEN  
**Priorität**: 🔥🔥🔥 **HÖCHSTE**

---

### 2. 🔒 Globalen API-Rate-Limiter aktivieren
**Problem**: In `index.ts` auskommentiert:
```typescript
// app.use('/api', apiLimiter)  ← AKTIVIEREN!
```

**Action**:
```bash
vim packages/backend/src/index.ts
# Line ~150: Kommentar entfernen
# Test, dann Deploy
```

**Status**: ❌ OFFEN  
**Priorität**: 🔥🔥 **HOCH**

---

### 3. 🎨 Trust Badges Feature deployen
**Problem**: Code ist fertig, aber NICHT deployed

**Action**:
```bash
cd /root/gaestefotos-app-v2/packages/backend
npx prisma migrate deploy --name add-landing-badges
systemctl restart gaestefotos-backend
systemctl restart gaestefotos-frontend
systemctl restart gaestefotos-admin-dashboard

# Test: https://dash.xn--gstefotos-v2a.com/manage/landing
```

**Status**: ⚠️ CODE FERTIG, DEPLOYMENT OFFEN  
**Priorität**: 🔥🔥 **HOCH**

---

## 🟡 WICHTIG (Diese Woche)

### 4. 👤 Root-zu-User-Migration
**Problem**: Services laufen als `root` (Security-Risk!)

**Action**:
```bash
cd /root/gaestefotos-app-v2/claude

# 1. Preflight-Check
./migration-phase0-preflight.sh

# 2. Wenn OK → Follow README-MIGRATION.md
# 3. Backup erstellen!
# 4. Migration durchführen (Phase 1-5)
```

**Status**: ⚠️ VORBEREITET, NICHT AUSGEFÜHRT  
**Priorität**: 🟡 **MITTEL-HOCH**

---

### 5. 🛡️ Security-Audit (Phase 3) durchführen
**Problem**: Phase 3 des Original-Audits NICHT erledigt

**Missing**:
- [ ] OWASP-Check
- [ ] SQL-Injection-Tests
- [ ] XSS-Tests
- [ ] CSRF-Verification
- [ ] Berechtigungs-Audit (alle Routen)
- [ ] Automatisierte Backups prüfen

**Status**: ❌ KOMPLETT OFFEN  
**Priorität**: 🟡 **MITTEL**

---

## 🟢 MITTEL (Diesen Monat)

### 6. 🎨 Design-Modernisierung
**Probleme**:
- Design-Token-Chaos (3 verschiedene Systeme)
- Dark-Mode "Brown/Sepia" (altmodisch)
- Mobile Bottom-Sheet Bug (Swipe-down → Refresh statt Dismiss)
- AI Providers Page inkonsistent

**Action**:
- Implement: `claude/DESIGN-AUDIT-2026.md` → Neue `globals.css`
- Fix: Dark-Mode Farben (Brown → Slate-Gray)
- Fix: Mobile Bottom-Sheet mit Vaul-Library
- Modernize: AI Providers Page

**Status**: ✅ DOKUMENTIERT, ❌ IMPLEMENTIERUNG OFFEN  
**Priorität**: 🟢 **MITTEL**

---

### 7. 🔄 Workflow-Builder erweitern
**Status**: ✅ ANALYSE KOMPLETT (`workflow-builder-audit.md`)

**Empfehlung**: Iterative Erweiterung (nicht Rewrite)

**Action**: USER-ENTSCHEIDUNG NÖTIG
- Soll erweitert werden?
- Welche Features zuerst?

**Status**: ⏸️ WARTET AUF USER-ENTSCHEIDUNG  
**Priorität**: 🟢 **NIEDRIG-MITTEL**

---

## 🔵 NIEDRIG (Später)

### 8. 📊 Audit Phase 4 & 5 abschließen
**Missing**:
- [ ] Phase 4: UX, Design & Marketing
  - Design-Konsistenz-Check (teilweise durch Design-Audits ersetzt)
  - SEO-Audit
  - Conversion-Rate-Optimierung
  
- [ ] Phase 5: Realitäts-Check & Abschlussbericht
  - Abgleich mit .md-Dokumentation
  - Finale Roadmap
  - Priorisierte Feature-Liste

**Status**: ❌ OFFEN  
**Priorität**: 🔵 **NIEDRIG**

---

## ⏳ IN ARBEIT (Opus)

### 9. 🎨 Dynamic Event Themes + AI-Cache
**Status**: ⏳ **BEI OPUS** (kein Action von uns!)

**Dokumente**:
- `OPUS-MASTER-PLAN-DYNAMIC-THEMES.md`
- `OPUS-START-HIER.md`
- `KRITISCHE-ERGÄNZUNGEN-AI-CACHE.md`
- `AI-CACHE-PRELOADING-STRATEGIE.md`

**Phasen**:
- Phase 0.5: Unified AI Cache
- Phase 0.6: Cache Preloading
- Phase 0-8: Theme-Implementierung

---

## 📊 STATUS-ÜBERSICHT

| Task | Status | Priorität | Aufwand |
|------|--------|-----------|---------|
| TUS-Upload Security | ❌ Offen | 🔥🔥🔥 Kritisch | 2-3 Tage |
| API-Rate-Limiter | ❌ Offen | 🔥🔥 Hoch | 1 Stunde |
| Trust Badges Deploy | ⚠️ Code fertig | 🔥🔥 Hoch | 30 Min |
| Root-Migration | ⚠️ Vorbereitet | 🟡 Mittel-Hoch | 4-6 Stunden |
| Security-Audit Phase 3 | ❌ Offen | 🟡 Mittel | 3-5 Tage |
| Design-Modernisierung | ❌ Offen | 🟢 Mittel | 5-8 Tage |
| Workflow-Builder | ⏸️ User-Entscheidung | 🟢 Niedrig-Mittel | ? |
| Audit Phase 4 & 5 | ❌ Offen | 🔵 Niedrig | 2-3 Tage |
| Dynamic Themes | ⏳ Bei Opus | - | 35-45 Tage |

---

## 🚀 ERSTE SCHRITTE (EMPFOHLEN)

### Option A: Security-First (EMPFOHLEN!)
```bash
# 1. TUS-Upload absichern (2-3 Tage)
vim packages/backend/src/routes/uploads.ts
# → Signed Upload Tokens implementieren

# 2. Rate-Limiter aktivieren (1 Stunde)
vim packages/backend/src/index.ts
# → Zeile ~150 entkommentieren

# 3. Trust Badges deployen (30 Min)
cd packages/backend
npx prisma migrate deploy
systemctl restart gaestefotos-*

# 4. Security-Audit Phase 3 (3-5 Tage)
# → OWASP-Check, Penetration-Tests
```

**Gesamt-Aufwand**: ~1 Woche  
**Impact**: 🔒 System deutlich sicherer

---

### Option B: Quick-Wins (Schnelle Erfolge)
```bash
# 1. Trust Badges deployen (30 Min)
# → Sofort nutzbar im Admin-Dashboard

# 2. Rate-Limiter aktivieren (1 Stunde)
# → Sofort mehr Schutz

# 3. Root-Migration (4-6 Stunden)
# → Services sicherer, bessere Isolation

# 4. Design-Quick-Fixes (2-3 Tage)
# → Dark-Mode-Farben, Mobile-Bug
```

**Gesamt-Aufwand**: 3-4 Tage  
**Impact**: ✨ Sofort sichtbare Verbesserungen

---

## 📝 USER-ENTSCHEIDUNGEN NÖTIG

1. **Root-Migration**: Durchführen? (Empfehlung: JA, aber auf Staging testen!)
2. **Workflow-Builder**: Erweitern? Welche Features?
3. **Design-Modernisierung**: Vollständig oder nur Quick-Fixes?
4. **Audit Phase 4 & 5**: Noch durchführen oder überspringen?

---

## 🔗 REFERENZEN

- **Vollständige Details**: `GEGENPRÜFUNG-ALLE-AUFGABEN.md`
- **Alle Dokumente**: `/root/gaestefotos-app-v2/claude/` (26 Dateien)

---

**DOKUMENT-STATUS**: ✅ **KOMPAKT & ACTIONABLE**  
**LETZTE AKTUALISIERUNG**: 2026-02-16
