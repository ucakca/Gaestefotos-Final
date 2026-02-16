# ✅ FINAL-TODO: Alle Aufgaben (Korrigiert nach Opus-Review)

> **Stand**: 2026-02-16 (nach Opus-Gegenprüfung)  
> **Ausgenommen**: AI-Cache/Themes (bei Opus in Arbeit)  
> **Status**: Vollständige Chat-Analyse mit korrigierten Prioritäten

---

## 🔴 KRITISCH (DIESE WOCHE!)

### 1. 🚨 **TUS-Upload Security-Gap** - HÖCHSTE PRIORITÄT!
**Problem**: `/api/uploads` Endpoint hat KEINE:
- ❌ Authentication
- ❌ Authorization (Event-Owner-Check)
- ❌ Event-Validation
- ❌ Rate-Limiting

**Gefahr**: **Jeder kann Dateien hochladen ohne Event-Berechtigung!**

**Gefunden in**: `phase2-logik-audit-report.md`

**Lösung**:
```typescript
// packages/backend/src/routes/uploads.ts

// 1. Generate signed token
router.post('/events/:eventId/upload-token', authMiddleware, async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;
  
  // Check event access
  const hasAccess = await checkEventAccess(userId, eventId);
  if (!hasAccess) return res.status(403).json({ error: 'No access' });
  
  // Generate JWT
  const token = jwt.sign(
    { eventId, userId, purpose: 'upload' },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
  
  res.json({ token, expiresAt: new Date(Date.now() + 24*60*60*1000) });
});

// 2. Validate in TUS upload
app.use('/api/uploads', (req, res, next) => {
  const token = req.headers['x-upload-token'];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.eventId = decoded.eventId;
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired upload token' });
  }
});
```

**Aufwand**: 2-3 Tage (inkl. Tests)  
**Status**: ❌ OFFEN  
**Priorität**: 🔥🔥🔥 **KRITISCH**

---

### 2. 🔒 **API Rate-Limiter aktivieren**
**Problem**: Globaler Limiter in `index.ts` auskommentiert (Zeile ~150)

**Fix**:
```bash
vim /root/gaestefotos-app-v2/packages/backend/src/index.ts

# Zeile ~150:
# // app.use('/api', apiLimiter);  ← ENTKOMMENTIEREN!
app.use('/api', apiLimiter);

systemctl restart gaestefotos-backend
```

**Aufwand**: 10 Minuten  
**Status**: ❌ OFFEN  
**Priorität**: 🔥🔥🔥 **KRITISCH**

---

### 3. 🎨 **Trust Badges Feature deployen**
**Status**: Code ist 100% fertig, nur Deployment fehlt!

**Files Ready**:
- ✅ Prisma Schema: `LandingBadge` Model
- ✅ Backend: `adminLandingBadges.ts` (CRUD + Upload)
- ✅ Admin-Dashboard: `/manage/landing` Page
- ✅ Frontend: Trust-Badge Section

**Deployment**:
```bash
cd /root/gaestefotos-app-v2/packages/backend

# 1. Migration
npx prisma migrate deploy --name add-landing-badges

# 2. Services restart
systemctl restart gaestefotos-backend
systemctl restart gaestefotos-admin-dashboard
systemctl restart gaestefotos-frontend

# 3. Test
curl https://dash.xn--gstefotos-v2a.com/manage/landing
curl https://app.xn--gstefotos-v2a.com/ | grep -i badge
```

**Aufwand**: 30 Minuten  
**Status**: ⚠️ CODE FERTIG, DEPLOYMENT OFFEN  
**Priorität**: 🔥🔥 **HOCH**

---

## 🟡 WICHTIG (NÄCHSTE 2 WOCHEN)

### 4. 🛡️ **Security-Audit Phase 3 durchführen**
**Problem**: Original-Audit Phase 3 wurde übersprungen!

**Missing**:
- [ ] OWASP Top 10 Check
- [ ] SQL-Injection-Tests (Prisma schützt, aber prüfen!)
- [ ] XSS-Tests (Input-Sanitization)
- [ ] CSRF-Verification (Cookie-basiert, prüfen!)
- [ ] Berechtigungs-Audit (alle Admin-Routes: nur ADMIN-Role?)
- [ ] Session-Handling (JWT-Expiry, Refresh)
- [ ] Secrets-Management (.env Files, Permissions)
- [ ] Dependency-Audit (`npm audit`, `pnpm audit`)
- [ ] Rate-Limiting-Review (alle kritischen Endpoints)
- [ ] Backup-Automatisierung prüfen

**Aufwand**: 3-5 Tage  
**Status**: ❌ KOMPLETT OFFEN  
**Priorität**: 🟡 **MITTEL-HOCH**

---

### 5. 👤 **Root-zu-User-Migration durchführen**
**Status**: Vollständig vorbereitet, aber NICHT ausgeführt!

**Dokumente**:
- `h6-migration-analyse.md`
- `README-MIGRATION.md`
- `todo-migration.md`
- 7 Executable Scripts

**Schritte**:
```bash
cd /root/gaestefotos-app-v2/claude

# 1. Preflight-Check
./migration-phase0-preflight.sh

# 2. Wenn OK → Backup!
pg_dump -U postgres gaestefotos > ~/backup-pre-migration.sql
tar -czf ~/backup-app-$(date +%Y%m%d).tar.gz /root/gaestefotos-app-v2

# 3. Migration (Follow README-MIGRATION.md)
./migration-phase1-prepare.sh
./migration-phase2-systemd.sh
./migration-phase3-backup.sh
./migration-phase4-migrate.sh  # ⚠️ DOWNTIME!
./migration-phase5-postmigration.sh

# 4. Verify
systemctl status gaestefotos-*
curl https://api.xn--gstefotos-v2a.com/api/health
```

**Aufwand**: 4-6 Stunden (inkl. Testing)  
**Status**: ⚠️ VORBEREITET, NICHT AUSGEFÜHRT  
**Priorität**: 🟡 **MITTEL**

**Action**: USER-ENTSCHEIDUNG nötig!

---

## 🟢 MITTEL (NÄCHSTE 4 WOCHEN)

### 6. 🎨 **Design-Modernisierung**
**Analysen vorhanden**:
- `DESIGN-AUDIT-2026.md`
- `VOLLSTÄNDIGE-DESIGN-ANALYSE-2026.md`
- `analyse-ai-providers-page.md`

**Probleme identifiziert**:
1. Design-Token-Chaos (3 verschiedene Systeme)
2. Dark-Mode "Brown/Sepia" (altmodisch)
3. Mobile Bottom-Sheet Bug (Swipe → Refresh statt Dismiss)
4. AI Providers Page inkonsistent
5. Keine Visual-Hierarchy

**Vorgeschlagene Fixes**:
```
Quick-Wins (2-3 Tage):
  - Dark-Mode Farben (Brown → Slate-Gray)
  - Mobile Bottom-Sheet (Vaul-Library)
  - Button-Sizes (min 44x44px)

Mid-Term (3-5 Tage):
  - Design-Token-Konsolidierung (globals.css)
  - AI Providers Page modernisieren
  - QR Templates Page modernisieren

Strategic (5-8 Tage):
  - Komplette Dashboard-Modernisierung
  - Component-Library (Storybook)
  - Design-System-Dokumentation
```

**Aufwand**: 10-16 Tage (gesamt)  
**Status**: ✅ DOKUMENTIERT, ❌ IMPLEMENTIERUNG OFFEN  
**Priorität**: 🟢 **MITTEL**

---

### 7. 🔄 **Workflow-Builder erweitern**
**Analyse vorhanden**: `workflow-builder-audit.md`

**Empfehlung**: Iterative Erweiterung (nicht Rewrite)

**Vorgeschlagene Features**:
- Visual-Flow-Canvas-Verbesserungen
- KI-Integration (Smart Tagging als Workflow-Step)
- Test-Modus (Workflow simulieren)
- Mehr Templates

**Status**: ⏸️ **WARTET AUF USER-ENTSCHEIDUNG**  
**Priorität**: 🟢 **NIEDRIG-MITTEL**

**Action**: User muss entscheiden:
- Soll erweitert werden?
- Welche Features zuerst?
- Zeitrahmen?

---

## 🔵 NIEDRIG (SPÄTER)

### 8. 📊 **Audit Phase 4 & 5 abschließen**
**Missing**:
- Phase 4: UX, Design & Marketing
  - Design-Konsistenz (teilweise durch Design-Audits ersetzt)
  - SEO-Audit
  - Conversion-Rate-Optimierung
  - Marketing-Psychologie-Analyse
  
- Phase 5: Realitäts-Check & Abschlussbericht
  - Abgleich mit .md-Dokumentation
  - Finale Bug-Roadmap
  - Priorisierte Feature-Liste

**Aufwand**: 3-5 Tage  
**Status**: ❌ OFFEN  
**Priorität**: 🔵 **NIEDRIG**

**Begründung**: Teilweise durch spätere Design-Audits ersetzt

---

## 📊 GESAMT-STATUS (KORRIGIERT)

### Nach Kategorien

| Kategorie | Total | ✅ Erledigt | ⏳ Bei Opus | ❌ Offen | ⏸️ User |
|-----------|-------|-------------|-------------|----------|---------|
| **Security-Fixes** | 3 | 0 | 0 | 3 | 0 |
| **Trust Badges** | 1 | 0 (Code fertig) | 0 | 1 (Deploy) | 0 |
| **Root-Migration** | 1 | 0 | 0 | 0 | 1 (User) |
| **Design-Modernisierung** | 1 | 0 | 0 | 1 | 0 |
| **Workflow-Builder** | 1 | 0 | 0 | 0 | 1 (User) |
| **Audit Phase 3-5** | 3 | 0 | 0 | 3 | 0 |
| **Dynamic Themes** | 1 | 0 | 1 | 0 | 0 |
| **GESAMT** | 11 | 0 | 1 | 8 | 2 |

### Completion-Rate
- **Erledigt**: 0% (Dokumentation ≠ Implementation!)
- **Bei Opus**: 9% (1/11)
- **Offen**: 73% (8/11)
- **User-Entscheidung**: 18% (2/11)

---

## 🚀 EMPFOHLENE REIHENFOLGE (KORRIGIERT)

### WOCHE 1: Security-First (OPUS' EMPFEHLUNG!)
```
Tag 1: API Rate-Limiter aktivieren (10 Min) + Trust Badges deployen (30 Min)
Tag 2-4: TUS-Upload Security-Gap beheben (2-3 Tage)
```

**Impact**: 🔒 System deutlich sicherer  
**Aufwand**: 3 Tage

---

### WOCHE 2-3: Security-Audit + Quick-Wins
```
Tag 5-9: Security-Audit Phase 3 durchführen (3-5 Tage)
Tag 10-11: Dark-Mode Fix + Mobile-Bug (2 Tage)
```

**Impact**: 🛡️ Vollständiges Security-Review + sichtbare UX-Verbesserungen  
**Aufwand**: 7 Tage

---

### WOCHE 4: User-Entscheidungen
```
- Root-Migration durchführen? (JA/NEIN)
- Workflow-Builder erweitern? (JA/NEIN)
- Design-Modernisierung: Quick-Wins oder vollständig?
```

**Impact**: Strategische Ausrichtung klären  
**Aufwand**: Meetings/Planung

---

### WOCHE 5+: Implementierung (basierend auf Entscheidungen)
```
- Design-Modernisierung (10-16 Tage)
- Workflow-Builder-Features (wenn gewünscht)
- Audit Phase 4 & 5 abschließen
```

---

## 📝 LESSONS LEARNED

### Was ich falsch gemacht habe
1. ❌ **Bestehendes Code ignoriert** (aiCache.ts übersehen)
2. ❌ **Kosten überschätzt** (€500 statt €0.40 - Faktor 1000!)
3. ❌ **Nicht-existierende Probleme "gelöst"** ("Cache leeren" Button)
4. ❌ **Over-Engineering** (6 Cache-Levels, separate Services)
5. ❌ **Inkompatible Enums** (HOCHZEIT statt "wedding")
6. ❌ **Security nicht priorisiert** (TUS-Upload ist KRITISCH!)

### Was Opus richtig gemacht hat
1. ✅ **Bestehenden Code geprüft**
2. ✅ **Kostenangaben verifiziert**
3. ✅ **Pragmatische Lösungen**
4. ✅ **Security-First-Ansatz**
5. ✅ **Realistische Zeitschätzung**

---

## 🎯 KONKRETE NÄCHSTE SCHRITTE

### Für User (Sofort!)
1. **Entscheiden**: Sollen Security-Fixes diese Woche gemacht werden?
2. **Entscheiden**: Trust Badges deployen?
3. **Entscheiden**: Root-Migration durchführen?

### Für Opus (Themes - läuft bereits)
1. ✅ Security-Fixes ZUERST (Woche 1)
2. ✅ Dann pragmatische Theme-Implementierung
3. ✅ Bestehendes `aiCache.ts` erweitern (nicht neu bauen!)

### Für Entwickler (Security)
1. **10 Min**: Rate-Limiter aktivieren
2. **30 Min**: Trust Badges deployen
3. **2-3 Tage**: TUS-Upload absichern
4. **3-5 Tage**: Security-Audit Phase 3

---

## 📚 ALLE OFFENEN TASKS (PRIORISIERT)

| # | Task | Aufwand | Priorität | Status |
|---|------|---------|-----------|--------|
| 1 | TUS-Upload Security | 2-3 Tage | 🔥🔥🔥 Kritisch | ❌ Offen |
| 2 | API Rate-Limiter | 10 Min | 🔥🔥🔥 Kritisch | ❌ Offen |
| 3 | Trust Badges Deploy | 30 Min | 🔥🔥 Hoch | ⚠️ Code fertig |
| 4 | Security-Audit Phase 3 | 3-5 Tage | 🟡 Mittel-Hoch | ❌ Offen |
| 5 | Root-Migration | 4-6 Std | 🟡 Mittel | ⏸️ User |
| 6 | Dark-Mode Fix | 1 Tag | 🟢 Mittel | ❌ Offen |
| 7 | Mobile Bottom-Sheet | 1 Tag | 🟢 Mittel | ❌ Offen |
| 8 | Design-Tokens | 3-5 Tage | 🟢 Mittel | ❌ Offen |
| 9 | AI Providers Page | 2-3 Tage | 🟢 Mittel | ❌ Offen |
| 10 | Workflow-Builder | ? | 🟢 Niedrig | ⏸️ User |
| 11 | Audit Phase 4 & 5 | 3-5 Tage | 🔵 Niedrig | ❌ Offen |

**Total Offene**: 8 Tasks (+ 2 User-Entscheidungen + 1 bei Opus)

---

## 💡 WICHTIGSTE ERKENNTNIS

**Security ist wichtiger als Features!**

Die größten vergessenen TODOs sind nicht bei Themes, sondern bei **Security**:
- TUS-Upload ohne Auth
- Rate-Limiter deaktiviert
- Services als root
- Kein vollständiger Security-Audit

→ **Diese müssen VOR dem Theme-Feature adressiert werden!**

Opus hat absolut recht mit dieser Priorisierung! 🎯

---

**DOKUMENT-STATUS**: ✅ **KORRIGIERT & VOLLSTÄNDIG**  
**DANKE AN**: Opus für präzise Gegenprüfung!  
**NÄCHSTE STEPS**: Security-Fixes, dann User-Entscheidungen
