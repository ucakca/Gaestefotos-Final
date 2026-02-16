# 🔍 PHASE 1: Code-Quality & Dependency-Analyse
**Status:** In Bearbeitung | **Datum:** 15.02.2026 | **Agent:** Sonnet 4.5

---

## 📊 CODE-METRIKEN

### Test-Coverage
```
❌ KRITISCH: Nur 8 Test-Dateien für 688 TypeScript-Dateien
📊 Test-Coverage: ~1% (extrem niedrig!)
🎯 Empfohlen: Mindestens 60-80% für produktionskritische Bereiche

Gefundene Tests:
- Frontend: 7 Test-Dateien (hauptsächlich in __tests__/)
- Backend: 1 Test-Datei (oder sehr wenige)

RISIKO: Keine automatisierte Qualitätssicherung für:
  - API-Endpoints
  - Business-Logik
  - Datenbank-Operationen
  - UI-Komponenten
```

### TypeScript-Qualität
```
⚠️ TypeScript 'any' Verwendung:
- Backend: 91 Dateien verwenden 'any'
- Relativ hoch, aber für Projektgröße noch akzeptabel
- Hauptsächlich in:
  - Route-Handlern (Request/Response Types)
  - Service-Schnittstellen
  - Config-Dateien

✅ Alle Packages haben strikte TypeScript-Konfiguration:
  - strict: true
  - forceConsistentCasingInFileNames: true
  - esModuleInterop: true
```

### Console Statements
```
✅ GUT: Nur 5 Dateien mit console.log im Backend
- Hauptsächlich in Scripts (rerender-mosaic-tiles.ts, test-blend.ts)
- Logger (Winston) wird korrekt verwendet
- Keine Debug-Console-Calls in Production-Code
```

### TODOs & FIXMEs
```
✅ ÜBERSCHAUBAR: 7 Dateien mit TODO/FIXME/XXX Kommentaren
Frontend:
- useUpgradeModal.ts
- useKeyboardShortcuts.ts
- InvitationCanvas.tsx
- UploadButton.tsx
- ErrorBoundary.tsx
- events/[id]/guests/page.tsx

Backend:
- routes/events.ts
```

---

## 🔒 ENVIRONMENT & SECURITY

### Environment-Konfiguration
```
✅ .env.example Dateien vorhanden:
- packages/backend/.env.example (101 Zeilen)
- packages/frontend/.env.example (7 Zeilen)
- packages/admin-dashboard/nginx.conf.example

Backend Environment (Highlights):
├── Database:         PostgreSQL (DATABASE_URL)
├── Storage:          SeaweedFS S3-kompatibel
├── Cache:            Redis
├── JWT:              Secret + Expiry
├── Encryption:       AES-256-GCM (2FA, AI Keys)
├── WordPress:        MySQL-DB Integration
├── Email:            SMTP-Konfiguration
├── SMS:              Twilio
├── AI-Provider:      Groq/xAI/OpenAI (Auto-detect)
├── Sentry:           Error Tracking (optional)
├── TUS:              Resumable Uploads
└── Cloudflare:       CDN/DNS (optional)

Frontend Environment:
- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_WS_URL
- NEXT_PUBLIC_APP_URL
```

### Security-Konfiguration
```
✅ SICHERHEITS-FEATURES:
- Helmet.js aktiviert
- CORS konfiguriert
- Rate Limiting (10 verschiedene Limiter)
- CSRF-Protection
- JWT-Authentication
- 2FA-System (optional)
- API-Key-System mit Scopes
- bcryptjs für Passwörter
- AES-256-GCM für Secrets
- express-mongo-sanitize (Injection-Schutz)

⚠️ ZU PRÜFEN:
- Sind alle Rate-Limits produktionsbereit konfiguriert?
- Ist CORS-Whitelist korrekt?
- Sind Secrets rotiert?
```

---

## 📦 TYPESCRIPT-KONFIGURATION

### Backend (tsconfig.json)
```json
{
  "target": "ES2020",
  "module": "commonjs",
  "strict": true,
  "outDir": "./dist",
  "sourceMap": true,
  "declaration": true,
  "paths": {
    "@gaestefotos/shared": ["../../packages/shared/dist"]
  }
}
```

### Frontend/Admin (tsconfig.json)
```json
{
  "target": "ES2020",
  "module": "esnext",
  "strict": true,
  "jsx": "react-jsx",
  "moduleResolution": "bundler",
  "paths": {
    "@/*": ["./src/*"],
    "@gaestefotos/shared": ["../../packages/shared/src"]
  }
}
```

### Booth App
```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@runtime/*": ["../frontend/src/lib/workflow-runtime/*"],
    "@workflow-steps/*": ["../frontend/src/components/workflow-runtime/*"]
  }
}
```
⚠️ **WARNUNG:** Booth-App importiert direkt aus Frontend-Package!
- Potenzielle Circular-Dependency
- Verletzt Monorepo-Isolation
- Sollte über @gaestefotos/shared abstrahiert werden

---

## 🔄 PACKAGE-MANAGEMENT

### npm/pnpm Warnings
```
⚠️ npm outdated ausgegeben Warnungen:
- "shamefully-hoist" config deprecated (wird in npm 10 entfernt)
- "strict-peer-dependencies" config deprecated

✅ Empfehlung:
- .npmrc aktualisieren
- Auf pnpm >= 8.0.0 Standard-Konfiguration migrieren
```

### Workspace-Abhängigkeiten
```
Monorepo-Struktur (pnpm workspaces):
- @gaestefotos/backend      → @gaestefotos/shared
- @gaestefotos/frontend     → @gaestefotos/shared
- @gaestefotos/admin        → @gaestefotos/shared
- @gaestefotos/print-term   → @gaestefotos/shared
- @gaestefotos/booth-app    → @gaestefotos/shared + Frontend! ⚠️
```

---

## 🐛 POTENZIELLE CODE-SMELLS

### 1. Test-Coverage (KRITISCH)
```
Problem: Nur ~1% Test-Coverage
Impact: Hohe Bug-Rate, schwer wartbar, Refactoring riskant
Lösung:
  - Unit-Tests für Services (mindestens kritische wie faceRecognition, storage, aiExecution)
  - Integration-Tests für API-Endpoints
  - E2E-Tests für kritische User-Flows (Foto-Upload, Mosaic, Guestbook)
  - Playwright ist bereits installiert, aber kaum genutzt
```

### 2. Route-Komplexität
```
Problem: Sehr große Route-Dateien
- events.ts: 82KB
- mosaic.ts: 54KB
- photos.ts: 39KB
- videos.ts: 43KB
- guestbook.ts: 34KB
- auth.ts: 32KB

Impact: Schwer wartbar, schwer testbar
Lösung:
  - Refactoring in kleinere Controller
  - Business-Logik in Services auslagern
  - Validation in Middleware/Schemas
```

### 3. Dependency-Duplikate
```
Problem: PostgreSQL UND MariaDB gleichzeitig laufend
Frage: Warum beide?
Hypothesen:
  - MariaDB für WordPress-Integration?
  - PostgreSQL für App-Daten?
  - Legacy-System noch nicht migriert?

Impact: Höhere Komplexität, mehr Fehlerquellen
Zu prüfen: Kann MariaDB entfernt werden?
```

### 4. Service-Duplikate
```
Problem: Backend + Backend-Staging parallel laufend
- gaestefotos-backend.service (Port 8001?)
- gaestefotos-backend-staging.service

Impact: Ressourcen-Verbrauch, potenzielle Konflikte
Zu prüfen:
  - Sind beide notwendig?
  - Klare Trennung der Umgebungen?
  - Separate Datenbanken?
```

### 5. TypeScript 'any' Overuse
```
Problem: 91 Dateien mit 'any'
Hauptsächlich in:
  - Route-Handlern (Express Request/Response)
  - Config-Dateien
  - Service-Interfaces

Impact: Verlust der Type-Safety
Lösung:
  - Typed Request/Response Interfaces
  - Zod-Schemas für Runtime-Validation
  - Prisma-Types für DB-Entities nutzen
```

---

## 📊 BUNDLE-SIZE-ANALYSE (TODO)

### Frontend
```
TODO: npm run build && analyze
- Erwartete Größe: 4.1M Source → ~500KB-1MB Gzipped?
- Kritische Abhängigkeiten:
  - Konva (Canvas-Library)
  - Leaflet (Maps)
  - React/Next.js
  - Radix UI
  - Recharts

Zu prüfen:
  - Code-Splitting korrekt?
  - Tree-Shaking aktiv?
  - Lazy-Loading für große Komponenten?
  - Unnötige Dependencies?
```

### Backend
```
Backend-Build:
- Kompiliert zu CommonJS (dist/)
- Source Maps aktiviert
- Declarations aktiviert

Zu prüfen:
  - Build-Zeit optimierbar?
  - Unused Code eliminiert?
  - node_modules Größe?
```

---

## 🔧 EMPFEHLUNGEN (PHASE 1)

### Sofort (P1)
1. ❌ **Test-Coverage erhöhen:**
   - Unit-Tests für kritische Services
   - Integration-Tests für Top-10 API-Endpoints
   - E2E-Tests für kritische User-Flows

2. ⚠️ **Route-Refactoring:**
   - events.ts, mosaic.ts, photos.ts aufteilen
   - Business-Logik in Services auslagern

3. ⚠️ **TypeScript 'any' reduzieren:**
   - Typed Express-Handlers
   - Prisma-Types nutzen

### Kurzfristig (P2)
4. 🔄 **Dependency-Audit:**
   - npm outdated prüfen
   - Sicherheitsupdates einspielen
   - Unnötige Dependencies entfernen

5. 🔄 **Build-Optimierung:**
   - Bundle-Size analysieren
   - Code-Splitting optimieren
   - Lazy-Loading implementieren

### Mittelfristig (P3)
6. 🗄️ **Datenbank-Konsolidierung:**
   - MariaDB-Nutzung evaluieren
   - Ggf. WordPress-Integration refactoren

7. 🔧 **Monorepo-Isolation:**
   - Booth-App Frontend-Import entfernen
   - Shared-Library erweitern

---

**Erstellt:** 15.02.2026 16:20  
**Nächstes Update:** Nach Dependency-Audit
