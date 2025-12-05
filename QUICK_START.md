# Quick Start Guide - Gästefotos V2

## 🚀 Setup (Erstmalig)

### 1. Dependencies installieren

```bash
cd /root/gaestefotos-app-v2

# pnpm installieren (falls nicht vorhanden)
npm install -g pnpm

# Alle Dependencies installieren
pnpm install
```

### 2. Database Setup

```bash
# PostgreSQL muss laufen
# DATABASE_URL in .env setzen

cd packages/backend
cp .env.example .env

# .env anpassen:
# DATABASE_URL=postgresql://user:password@localhost:5432/gaestefotos_v2

# Prisma Client generieren
pnpm prisma generate

# Database migrieren
pnpm prisma migrate dev --name init
```

### 3. Environment Variables

#### Backend (`packages/backend/.env`)
```env
PORT=8001
DATABASE_URL=postgresql://user:password@localhost:5432/gaestefotos_v2
JWT_SECRET=your-secret-key-change-this
FRONTEND_URL=http://localhost:3000
```

#### Frontend (`packages/frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_WS_URL=http://localhost:8001
```

### 4. Development starten

```bash
# Im Root-Verzeichnis

# Shared Package builden (einmalig)
pnpm --filter @gaestefotos/shared build

# Frontend + Backend starten
pnpm dev

# Oder separat:
pnpm dev:backend   # Backend auf http://localhost:8001
pnpm dev:frontend  # Frontend auf http://localhost:3000
```

## 📝 Erste Schritte

1. **Frontend öffnen**: http://localhost:3000
2. **Registrieren**: Erstelle einen Account
3. **Login**: Melde dich an
4. **Event erstellen**: Erstelle dein erstes Event

## 🧪 Testing

### Backend Health Check
```bash
curl http://localhost:8001/health
```

### API Test
```bash
# Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📁 Projekt-Struktur

```
packages/
├── shared/          # TypeScript Types, Utils
├── frontend/        # Next.js 14 App
└── backend/         # Node.js/Express API
```

## 🔧 Wichtige Commands

```bash
pnpm dev              # Frontend + Backend
pnpm build            # Alles builden
pnpm type-check       # TypeScript prüfen

# Backend
pnpm --filter backend prisma studio    # DB GUI
pnpm --filter backend prisma migrate   # DB Migration

# Frontend
pnpm --filter frontend build           # Frontend builden
```

## 🐛 Troubleshooting

### Shared Package Fehler
```bash
pnpm --filter @gaestefotos/shared build
```

### Port bereits belegt
- Backend: Port in `.env` ändern
- Frontend: Port in `package.json` ändern

### Database Connection Fehler
- PostgreSQL läuft?
- DATABASE_URL korrekt?
- Database existiert?

