# ✅ Test Checklist - Gästefotos V2

## 📋 Komponenten-Tests

### ✅ Backend Tests

#### ✅ Dependencies
- [x] Express.js installiert
- [x] Socket.io installiert
- [x] Prisma installiert
- [x] Sharp installiert
- [x] AWS SDK installiert

#### ✅ Routes
- [x] `/api/auth/login` - Login Route
- [x] `/api/auth/register` - Register Route
- [x] `/api/auth/me` - Get Current User
- [x] `/api/events` - List/Create Events
- [x] `/api/events/:id` - Get Event
- [x] `/api/events/slug/:slug` - Get Event by Slug
- [x] `/api/events/:eventId/guests` - Guest Management
- [x] `/api/events/:eventId/photos` - Photo List/Upload
- [x] `/api/photos/:photoId/approve` - Approve Photo
- [x] `/api/photos/:photoId/reject` - Reject Photo
- [x] `/api/photos/:photoId` - Delete Photo

#### ✅ Services
- [x] Storage Service (SeaweedFS)
- [x] Image Processor (Sharp)
- [x] WebSocket Server (Socket.io)

#### ✅ Middleware
- [x] Auth Middleware
- [x] Role-based Authorization

### ✅ Frontend Tests

#### ✅ Pages
- [x] `/` - Home/Redirect
- [x] `/login` - Login Page
- [x] `/register` - Register Page
- [x] `/dashboard` - Dashboard
- [x] `/events/new` - Create Event
- [x] `/events/:id` - Event Detail
- [x] `/events/:id/edit` - Edit Event
- [x] `/events/:id/photos` - Photo Management
- [x] `/events/:id/guests` - Guest Management
- [x] `/e/:slug` - Public Event Page
- [x] `/e/:slug/invitation` - Invitation Page
- [x] `/live/:slug/wall` - Live Wall
- [x] `/live/:slug/camera` - Camera Page
- [x] `/moderation` - Photo Moderation

#### ✅ Components
- [x] Envelope Component
- [x] PhotoUpload Component
- [x] Gallery Component
- [x] QRCode Component
- [x] Toast Component

#### ✅ Features
- [x] Framer Motion Animations
- [x] WebSocket Realtime Updates
- [x] Toast Notifications
- [x] Auth Store (Zustand)
- [x] API Client (Axios)

### ✅ Shared Package

- [x] Types exported
- [x] Utils exported (slugify, etc.)
- [x] Constants exported

---

## 🔧 Konfiguration prüfen

### ✅ Backend .env
```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
SEAWEEDFS_ENDPOINT=localhost:8333
SEAWEEDFS_ACCESS_KEY=...
SEAWEEDFS_SECRET_KEY=...
PORT=8001
FRONTEND_URL=http://localhost:3000
```

### ✅ Frontend .env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_WS_URL=http://localhost:8001
```

---

## 🚀 Start-Tests

### 1. Shared Package builden
```bash
cd packages/shared
pnpm build
```

### 2. Backend starten
```bash
cd packages/backend
pnpm dev
```

### 3. Frontend starten
```bash
cd packages/frontend
pnpm dev
```

---

## ✅ Bekannte Probleme & Fixes

### ✅ Behoben:
1. ✅ Photo Routes - Doppelte Registrierung behoben
2. ✅ Auth Middleware - Korrekte Verwendung
3. ✅ Layout - Client Component für Toast
4. ✅ slugify Export - Korrekt in shared package

### ⚠️ Zu prüfen:
- [ ] SeaweedFS Verbindung
- [ ] Database Migration
- [ ] Image Processing (Sharp)

---

## 📊 Test-Status

- ✅ **Backend**: Alle Routes implementiert
- ✅ **Frontend**: Alle Pages implementiert
- ✅ **Components**: Alle Components vorhanden
- ✅ **Services**: Storage & Image Processing
- ✅ **Realtime**: WebSocket Integration
- ✅ **Animations**: Framer Motion überall

**Status: BEREIT FÜR TESTING** 🎉

