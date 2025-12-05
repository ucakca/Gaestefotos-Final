# Setup-Anleitung: Gästefotos V2

## 🚀 Schnellstart

### 1. Dependencies installieren

```bash
cd /root/gaestefotos-app-v2

# pnpm installieren (falls nicht vorhanden)
npm install -g pnpm

# Alle Dependencies installieren
pnpm install
```

### 2. Environment Variables einrichten

#### Backend
```bash
cd packages/backend
cp .env.example .env
# .env anpassen mit echten Werten
```

#### Frontend
```bash
cd packages/frontend
cp .env.example .env.local
# .env.local anpassen
```

### 3. Shared Package builden

```bash
# Im Root-Verzeichnis
pnpm --filter @gaestefotos/shared build
```

### 4. Development starten

```bash
# Beide gleichzeitig (Frontend + Backend)
pnpm dev

# Oder separat:
pnpm dev:frontend  # Frontend auf http://localhost:3000
pnpm dev:backend   # Backend auf http://localhost:8001
```

## 📁 Projekt-Struktur

```
gaestefotos-app-v2/
├── packages/
│   ├── shared/              # Shared TypeScript Code
│   │   ├── src/
│   │   │   ├── types/       # TypeScript Interfaces
│   │   │   ├── utils/       # Utility Functions
│   │   │   └── constants/   # Constants
│   │   └── package.json
│   │
│   ├── frontend/            # Next.js 14 App
│   │   ├── src/
│   │   │   └── app/         # App Router
│   │   └── package.json
│   │
│   └── backend/             # Node.js/Express API
│       ├── src/
│       │   └── index.ts     # Entry Point
│       └── package.json
│
├── package.json             # Root Package (Workspaces)
└── README.md
```

## 🔧 Wichtige Commands

```bash
# Development
pnpm dev                    # Frontend + Backend
pnpm dev:frontend           # Nur Frontend
pnpm dev:backend            # Nur Backend

# Build
pnpm build                  # Alles builden
pnpm build:frontend         # Nur Frontend
pnpm build:backend          # Nur Backend

# Type Checking
pnpm type-check             # TypeScript prüfen

# Linting
pnpm lint                   # Alle Packages linten
```

## 📝 Nächste Schritte

1. ✅ Setup ist fertig
2. ⏭️ Backend Routes implementieren
3. ⏭️ Frontend Pages erstellen
4. ⏭️ Database Schema definieren
5. ⏭️ Authentication implementieren

## 🌐 URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Health Check**: http://localhost:8001/health
- **API Root**: http://localhost:8001/api

## 📦 Shared Package nutzen

```typescript
// In Frontend oder Backend
import { User, Event, Photo } from '@gaestefotos/shared';
import { API_ROUTES, WS_EVENTS } from '@gaestefotos/shared';
import { formatDate, slugify } from '@gaestefotos/shared';
```

## 🐛 Troubleshooting

### Shared Package wird nicht gefunden
```bash
pnpm --filter @gaestefotos/shared build
```

### Port bereits belegt
- Frontend: Port 3000 ändern in `package.json`
- Backend: Port 8001 ändern in `.env`

### TypeScript Fehler
```bash
pnpm type-check
```

## 📚 Dokumentation

- [Next.js Docs](https://nextjs.org/docs)
- [Express Docs](https://expressjs.com/)
- [Socket.io Docs](https://socket.io/docs/)

