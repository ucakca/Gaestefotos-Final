# Master-Prompt für Lovable: Audit & Strategy

## ⚠️ WICHTIG: Dieser Prompt ist für Lovable, nicht für Claude!

Kopiere den folgenden Text **komplett** in den Chat von Lovable:

---

> **Rolle:** Senior Fullstack Architect & UX Specialist.
> **Status:** Du hast jetzt Zugriff auf mein GitHub-Repository `ucakca/gaestefotos-app-v2`. Dies ist ein produktives Projekt mit **drei getrennten Subdomains** und **zwei Frontend-Apps**:
> 
> **Subdomain-Architektur:**
> 1. **`app.gästefotos.com`** (oder `app.gaestefotos.com`): **Gast-Interface** - Foto-Upload, Galerie, Stories, Guestbook (Next.js Frontend in `packages/frontend`)
> 2. **`dash.gästefotos.com`** (oder `dash.gaestefotos.com`): **Host/Admin-Dashboard** - Event-Verwaltung, Moderation, Statistiken (Next.js Frontend in `packages/admin-dashboard`)
> 3. **`gästefotos.com`** (Hauptdomain): **Marketing/WordPress** - Landing Pages, AGB, Datenschutz (optional: WordPress-Integration)
> 
> **Backend:**
> - Express.js Backend in `packages/backend` (Port 8001)
> - PostgreSQL + Prisma ORM (NICHT Supabase!)
> - SeaweedFS (S3-compatible) für Media-Storage
> - Socket.io für Realtime-Updates
> - JWT-Auth mit httpOnly Cookies
> 
> **Monorepo-Struktur:**
> - `packages/backend/` - Express API
> - `packages/frontend/` - Next.js App (Gäste)
> - `packages/admin-dashboard/` - Next.js Dashboard (Hosts/Admins)
> - `packages/shared/` - Shared Types/Utils
> 
> **DEIN AUFTRAG (NUR ANALYSE - KEIN CODE ÄNDERN):**
> 
> Bitte führe einen kompletten Scan aller Dateien im Repository durch und antworte mir mit einem detaillierten Bericht zu folgenden Punkten:
> 
> ### 1. **Architektur-Check:**
> - Verstehst du, wie das Routing zwischen `app.` (Gäste) und `dash.` (Hosts) aktuell gelöst ist?
> - Gibt es Inkonsistenzen in der Ordnerstruktur zwischen `packages/frontend` und `packages/admin-dashboard`?
> - Wie wird CORS zwischen den Subdomains gehandhabt? (Prüfe `packages/backend/src/index.ts` Zeile 126-160)
> - Gibt es Middleware-Konflikte oder doppelte Auth-Logik?
> 
> ### 2. **Media-Integrität:**
> - Analysiere den Image-Upload-Flow in `packages/backend/src/routes/photos.ts` und `packages/backend/src/services/imageProcessor.ts`
> - Wie stellst du sicher, dass Bilder in **Originalqualität** (ohne Kompression) gespeichert werden, während die Galerie-Vorschau schnell bleibt?
> - Prüfe: Werden `storagePathOriginal`, `storagePath` (optimized) und `storagePathThumb` korrekt verwendet?
> - Wie funktioniert der Download-Flow für Hosts vs. Gäste? (Original vs. Optimized)
> 
> ### 3. **Datenbank & Auth:**
> - Prüfe die Prisma-Schema-Struktur in `prisma/schema.prisma`
> - Sind die Auth-Flows für die verschiedenen Rollen (HOST vs. ADMIN) sauber getrennt? (Prüfe `packages/backend/src/middleware/auth.ts`)
> - Wie funktioniert Event-Zugriffskontrolle? (Host, Co-Host, Admin)
> - Gibt es Race Conditions oder fehlende Transaktionen bei kritischen Operationen?
> 
> ### 4. **UI/UX Audit:**
> - Analysiere die Tailwind-Konfiguration und Design-Tokens in `packages/frontend/src/app/globals.css`
> - Wo siehst du im aktuellen Code Potenzial für ein "festlicheres" und hochwertigeres Design, das besonders auf mobilen Geräten der Gäste glänzt?
> - Gibt es Inkonsistenzen zwischen `packages/frontend` und `packages/admin-dashboard` Design-System?
> - Wie ist die PWA-Integration? (Service Worker, Install-Prompt)
> 
> ### 5. **Feature-Integration:**
> - Prüfe die bestehende `Invitation`-Struktur in `packages/backend/src/routes/invitations.ts`
> - Wie ist die aktuelle QR-Code-Generierung implementiert? (Prüfe `packages/backend/src/routes/events.ts` QR-Export)
> - Gibt es bereits Gästegruppen-Logik oder muss diese komplett neu implementiert werden?
> 
> **AUSGABE:**
> 
> Erstelle mir zum Abschluss **3 konkrete "Action-Packages" (A, B und C)**, die wir nacheinander abarbeiten können:
> - **Package A:** Kleinste, non-breaking Änderungen (z.B. UI-Verbesserungen, Bugfixes)
> - **Package B:** Mittlere Komplexität (z.B. Neue Features, die bestehende Struktur erweitern)
> - **Package C:** Größere Refactorings (z.B. Architektur-Änderungen, Migrationen)
> 
> **WICHTIG:** 
> - Ändere noch **KEINEN Code**!
> - Ich möchte erst deine Analyse bestätigen, um sicherzustellen, dass wir auf derselben Wellenlänge sind.
> - Wenn du etwas nicht verstehst (z.B. Subdomain-Routing, CORS-Logik), frage nach, bevor du Annahmen triffst.
> 
> **Bestätige, dass du bereit bist und die Struktur verstanden hast.**

---

## 📋 Checkliste für Lovable's Antwort

Wenn Lovable antwortet, prüfe folgende Punkte:

### ✅ **Gut (Lovable hat es verstanden):**
- [ ] Erwähnt explizit die drei Subdomains (`app.`, `dash.`, Hauptdomain)
- [ ] Erkennt PostgreSQL + Prisma (nicht Supabase)
- [ ] Versteht die Monorepo-Struktur (`packages/backend`, `packages/frontend`, `packages/admin-dashboard`)
- [ ] Erkennt die Original-Qualität Storage-Strategie (`storagePathOriginal` vs. `storagePath`)
- [ ] Versteht CORS-Konfiguration zwischen Subdomains
- [ ] Erkennt bestehende `Invitation`-Struktur

### ❌ **Schlecht (Lovable hat es NICHT verstanden):**
- [ ] Spricht von "Supabase" statt PostgreSQL
- [ ] Verwechselt `app.` (Gäste) mit Host-Panel
- [ ] Ignoriert die Subdomain-Trennung
- [ ] Schlägt Breaking Changes vor, ohne Migration zu erwähnen
- [ ] Versteht nicht die Original-Qualität Storage-Strategie

### 🔧 **Wenn Lovable Fehler macht:**

**Fehler 1: "Ich sehe Supabase-Integration..."**
→ **Korrektur:** "Wir nutzen PostgreSQL + Prisma, nicht Supabase. Bitte prüfe `prisma/schema.prisma` und `packages/backend/src/config/database.ts`"

**Fehler 2: "Die App-Route ist für Hosts..."**
→ **Korrektur:** "`app.gästefotos.com` ist für GÄSTE (Foto-Upload). `dash.gästefotos.com` ist für HOSTS/ADMINS (Event-Verwaltung). Bitte prüfe die CORS-Config in `packages/backend/src/index.ts` Zeile 127-129"

**Fehler 3: "Ich sehe keine Original-Qualität Storage..."**
→ **Korrektur:** "Bitte prüfe `prisma/schema.prisma` Photo Model: `storagePathOriginal`, `storagePath`, `storagePathThumb`. Und `packages/backend/src/services/imageProcessor.ts` Zeile 22-59"

---

## 🎯 Nächste Schritte nach Lovable's Antwort

1. **Validierung:** Prüfe ob Lovable die Architektur verstanden hat (Checkliste oben)
2. **Korrektur:** Falls nötig, korrigiere Lovable's Missverständnisse
3. **Bestätigung:** Sobald Lovable die Struktur versteht, bestätige die Action-Packages
4. **Umsetzung:** Beginne mit Package A (kleinste Änderungen)

---

## 📝 Zusätzliche Kontext-Informationen für Lovable

Falls Lovable nachfragt, hier die wichtigsten Fakten:

- **Backend Port:** 8001 (siehe `packages/backend/src/index.ts`)
- **Frontend Port:** 3002 (siehe `packages/frontend/package.json` oder systemd service)
- **Dashboard Port:** 3101 (siehe `packages/admin-dashboard/package.json` oder systemd service)
- **Database:** PostgreSQL (Connection String in `.env` als `DATABASE_URL`)
- **Storage:** SeaweedFS S3-API (Config in `packages/backend/src/services/storage.ts`)
- **Auth:** JWT mit httpOnly Cookies (siehe `packages/backend/src/middleware/auth.ts`)
- **CORS:** Origin-basiert, konfiguriert in `packages/backend/src/index.ts` Zeile 135-200
- **Realtime:** Socket.io (siehe `packages/backend/src/index.ts` Zeile 200+)

---

**Erstellt:** 2026-01-10  
**Zweck:** Lovable dazu bringen, die Codebase zu verstehen, BEVOR Code geändert wird
