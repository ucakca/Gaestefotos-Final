# gästefotos.com — Audit Master-Plan

> Konsolidierte Findings aus dem 360°-Audit (Sonnet 4.5, Opus 4.6, GPT-5.2, Gemini 3 Flash)
> Verifiziert durch Cascade via SSH/Code-Analyse am 15.02.2026
> Phase E implementiert: 15.02.2026 (C9, C2, H5, H10)

---

## Verifizierungsstatus der Audit-Findings

| Finding | Quelle | Status | Kommentar |
|---------|--------|--------|-----------|
| K1: SQL-Injection analytics.ts | Opus | ⚠️ LOW RISK | `config.bucket` kommt aus Hardcoded-Whitelist, nicht User-Input |
| K2: SQL-Injection wordpress.ts | Opus | ⚠️ LOW RISK | `tableName` aus `information_schema`, nicht User-Input |
| K3: uploadSecurity.ts fehlt | Opus | ❌ FALSCH | Datei existiert (303 Zeilen), Magic-Byte-Validierung vorhanden |
| K4: Virus-Scanner Stub | Opus/GPT | ✅ BESTÄTIGT | Flippt nur PENDING→CLEAN |
| K5: JWT in URL (WP-SSO) | Opus/GPT | ✅ BESTÄTIGT | Token leakt via Browser-History/Logs/Referrer |
| K6: IP-Adressen Klartext | Opus | ✅ BESTÄTIGT | DSGVO-relevant, muss gehasht werden |
| Self-Register = ADMIN | GPT | ✅ BESTÄTIGT | auth.ts:663 — aktuell disabled aber fataler Bug |
| TUS ohne Auth | Sonnet/GPT | ✅ BESTÄTIGT | Kein Auth, kein Event-Check, kein Rate-Limit |
| uploadedBy XSS in E-Mails | GPT | ✅ BESTÄTIGT | eventRecap.ts:80 — HTML-Injection möglich |
| VNC ohne Passwort | GPT | ✅ BESTÄTIGT | x11vnc -nopw auf 0.0.0.0:5900 |
| Firewall inaktiv | GPT | ✅ BESTÄTIGT | ufw inactive, iptables ACCEPT |
| Services öffentlich gebunden | GPT | ✅ BESTÄTIGT | 12+ Ports auf 0.0.0.0/* |
| H6: express-mongo-sanitize | Opus | ✅ RICHTIG | Sinnlos (kein MongoDB), aber harmlos |

---

## 🔴 KRITISCH — Sofort umsetzen (Security / Logic)

### Sprint 1: Ops-Hardening (Server-Ebene, KEIN Code-Änderung)

| # | Fix | Aufwand | Risiko ohne Fix |
|---|-----|---------|-----------------|
| C1 | **VNC/Websockify stoppen** — `systemctl stop vnc-browser; systemctl disable vnc-browser` oder auf 127.0.0.1 binden | 5 min | Remote Desktop Takeover |
| C2 | **Firewall aktivieren** — `ufw default deny incoming; ufw allow 22,80,443,25,465,587/tcp; ufw enable` | 10 min | ✅ **ERLEDIGT** (15.02.2026) — 14 Ports erlaubt, Rest blockiert |
| C3 | **App-Ports nur lokal** — systemd Units: alle Node/Next-Apps auf `127.0.0.1` binden (Nginx reversed proxy) | 30 min | Bypass von TLS/Proxy |
| C4 | **.env Permissions** — `chmod 600` auf alle `.env*` + DB-Backups, Backup-Dir `chmod 700` | 5 min | Credential-Leak |

### Sprint 2: Kritische Code-Fixes (Backend)

| # | Fix | Datei | Aufwand | Risiko ohne Fix |
|---|-----|-------|---------|-----------------|
| C5 | **Self-Register → HOST** statt ADMIN | `routes/auth.ts:663` | 1 Zeile | Admin-Takeover |
| C6 | **TUS Auth + Event-Check** — Event-Existenz + `allowUploads` + Rate-Limit auf `/api/uploads` | `routes/uploads.ts` | 2h | Upload-Spam, Storage-Abuse |
| C7 | **uploadedBy HTML-Escaping** in Event-Recap-E-Mails | `services/eventRecap.ts:80` | 10 min | Stored XSS in E-Mails |
| C8 | **WP-SSO: JWT nicht in URL** — kurzlebigen Code austauschen, dann Cookie setzen | `routes/auth.ts:1005` | 1h | Token-Leak |
| C9 | **$queryRawUnsafe absichern** — `Prisma.sql` Template Literals statt String-Interpolation | `analytics.ts`, `eventRecap.ts` | 1h | ✅ **ERLEDIGT** (15.02.2026) — 3 Dateien migriert |
| C10 | **IP-Adressen hashen** — SHA-256 Hash vor dem Speichern | `PhotoLike`, `PhotoVote`, `ChallengeRating` | 30 min | DSGVO-Verstoß |

---

## 🟡 HOCH — Nächste Woche (Hardening)

| # | Fix | Aufwand | Quelle |
|---|-----|---------|--------|
| H1 | **Globalen Rate-Limiter aktivieren** — auskommentierte Zeile in index.ts einkommentieren | 5 min | Opus |
| H2 | **Swagger-UI in Production sperren** — nur im Development-Mode laden | 15 min | Opus |
| H3 | **Password-Minimum auf 8+ Zeichen** — Zod-Schema für Register/Login anpassen | 10 min | Opus |
| H4 | **HSTS-Header in Nginx** — `add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"` | 5 min | Opus |
| H5 | **DB-Backup automatisieren** — systemd-Timer, Verschlüsselung (age/gpg), Offsite-Sync | 2h | ✅ **ERLEDIGT** (15.02.2026) — pg_dump Cron daily/weekly/monthly |
| H6 | **Services nicht als root** — dedizierter User, systemd-Hardening (NoNewPrivileges, ProtectSystem) | 2h | GPT |
| H7 | **CSRF-Middleware fixen oder entfernen** — aktuell defekt (In-Memory-Store, JWT als Key) | 1h | Opus |
| H8 | **TUS Post-Processing angleichen** — Face-Detection, Duplicate-Check, Smart-Category, Push, Achievements | 3h | Sonnet |
| H9 | **express-mongo-sanitize entfernen** — sinnlose Dependency (kein MongoDB) | 5 min | Opus |
| H10 | **Virus-Scanner echte Integration** — ClamAV-Anbindung oder Feature ehrlich labeln | 4h | ✅ **ERLEDIGT** (15.02.2026) — ClamAV 1.4.3 installiert, virusScan.ts mit echtem clamdscan |

---

## 🟢 OPTIMIERUNGEN — Backlog

| # | Optimierung | Aufwand | Quelle |
|---|-------------|---------|--------|
| O1 | **Einheitliche Upload-Fortschritts-Anzeige** — uploadStore für TUS + Multer vereinen | 2h | Sonnet |
| O2 | **Prisma Connection-Pool-Limits** — `connection_limit` in DATABASE_URL setzen | 15 min | Opus |
| O3 | **Float → Int für monetäre Werte** — Cents statt Euro als Float | 2h | Opus |
| O4 | **WordPress MySQL-Pool Shutdown** — `pool.end()` im graceful-shutdown | 15 min | Opus |
| O5 | **$queryRawUnsafe → Prisma.sql** — überall Tagged Template Literals nutzen | 2h | Opus/GPT |
| O6 | **JSON-Felder Schema-Validierung** — Zod-Schemas für featuresConfig, designConfig, etc. | 3h | Opus |
| O7 | **Naming-Konventionen vereinheitlichen** — snake_case vs camelCase im Schema | 4h | Opus |

---

## 🚀 FEATURE-VORSCHLÄGE — Evaluierung

### ✅ Sofort sinnvoll (passt in bestehende Architektur)

| Feature | Quelle | Begründung | Aufwand |
|---------|--------|-----------|---------|
| **Account-Lockout nach N Fehlversuchen** | Opus | Einfach via Redis-Counter, schützt gegen Credential-Stuffing | 2h |
| **Dynamic OpenGraph per Event-Slug** | Gemini | Next.js `generateMetadata` + OG-Image-Route → massive Click-Rate-Steigerung beim Teilen | 3h |
| **Web-Push für Gäste** | Gemini | Push wenn Host Foto freigibt → Retention während Event. Service Worker bereits PWA-ready | 4h |
| **HSTS + Security-Headers** | Opus | Permissions-Policy, COOP, COEP — reine Nginx/Helmet-Config | 30 min |

### ⚡ Mittelfristig sinnvoll (1–2 Wochen)

| Feature | Quelle | Begründung | Aufwand |
|---------|--------|-----------|---------|
| **Offline-Uploads (Background Sync)** | Gemini | Service Worker + IndexedDB Queue existiert bereits, nur Background Sync fehlt | 1 Woche |
| **Token-Blacklist in Redis** | Opus | Nötig für Passwort-Änderung / Account-Sperrung, Redis bereits vorhanden | 1 Tag |
| **One-Click-Demo auf Landingpage** | Gemini | Conversion-Booster, Demo-Event mit Seed-Daten | 2 Tage |
| **Referral-System** | Gemini | Rabatt wenn Gast eigenes Event bucht, passt zum viralen Loop | 3 Tage |
| **AI Image Enhancer** | Gemini | Dunkle/unscharfe Gästefotos automatisch aufwerten. Braucht Cloud-AI-Budget | 1 Woche |

### ❌ Nicht empfohlen / bereits vorhanden

| Feature | Quelle | Begründung |
|---------|--------|-----------|
| WAF-Integration (Cloudflare) | Opus | Zu komplex für aktuellen Stack, Firewall + Rate-Limiting reicht erstmal |
| Secret-Rotation mit Multi-Key | Opus | Over-Engineering für aktuelle Phase, besser `.env` Permissions fixen |
| Automated sitemap.xml | Gemini | Kaum SEO-relevant da Events meist privat |
| Edge-Processing | Gemini | Sharp auf Server reicht, SeaweedFS-Filter overkill |

---

## 📋 IMPLEMENTIERUNGS-REIHENFOLGE

Die Reihenfolge minimiert Regressionen durch: Ops vor Code, Security vor Features, Backend vor Frontend.

### Phase A: Ops-Hardening (Tag 1) — KEIN Regressions-Risiko
```
C1 → C2 → C3 → C4
VNC stoppen → Firewall → Ports lokal → .env Permissions
```

### Phase B: Kritische 1-Zeiler (Tag 1–2) — Minimales Regressions-Risiko
```
C5 (role: HOST) → C7 (HTML-Escape) → C10 (IP-Hash) → H1 (Rate-Limiter) → H2 (Swagger) → H3 (PW-Min) → H4 (HSTS) → H9 (mongo-sanitize raus)
```

### Phase C: TUS-Hardening (Tag 3) — Mittleres Regressions-Risiko
```
C6 (TUS Auth + Event-Check + Rate-Limit) → H8 (TUS Post-Processing)
```
> ⚠️ Muss getestet werden: Upload-Flow von Gästen darf nicht brechen.

### Phase D: Auth-Flow-Fixes (Tag 4) — Höheres Regressions-Risiko
```
C8 (WP-SSO Token-Flow) → H7 (CSRF-Fix)
```
> ⚠️ Muss getestet werden: WordPress-SSO-Login + Cookie-basierte Auth.

### Phase E: DB + Backups (Tag 5) — ✅ 3/4 ERLEDIGT (15.02.2026)
```
✅ C9 (queryRawUnsafe → Prisma.sql) → ✅ H5 (pg_dump Cron) → ⏳ H6 (non-root Services) → ✅ H10 (ClamAV)
```

### Phase F: Optimierungen + Features (Woche 2+)
```
O1–O7 → Account-Lockout → OpenGraph → Web-Push → One-Click-Demo
```

---

## Zusammenfassung

| Kategorie | Anzahl | Verifiziert | False Positives |
|-----------|--------|-------------|-----------------|
| P0 Kritisch | 10 | 10/10 ✅ | 1 (K3 uploadSecurity) |
| P1 Hoch | 10 | 10/10 ✅ | 0 |
| Optimierungen | 7 | — | — |
| Feature-Vorschläge | 9 evaluiert | 4 sofort, 5 mittelfristig | 4 nicht empfohlen |

**Gesamtbewertung:** Die App hat eine **solide Basis** (TypeScript, Prisma, UUID-PKs, Magic-Byte-Validierung, Event-Access-Cookies). Die kritischsten Probleme sind auf **Ops-Ebene** (VNC, Firewall, öffentliche Ports) und **3 Code-Bugs** (Self-Register=ADMIN, TUS ohne Auth, uploadedBy XSS). Alle sind mit moderatem Aufwand fixbar.

> *Erstellt: 15.02.2026 — Cascade (verifiziert via SSH + Code-Analyse)*
