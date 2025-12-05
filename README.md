# Gästefotos App V2

Modern Web-Application für Event-Foto-Galerien mit Next.js 14 + Node.js.

## 🏗️ Architektur

```
gaestefotos-app-v2/
├── packages/
│   ├── shared/          # Shared TypeScript types, utilities
│   ├── frontend/        # Next.js 14 (App Router)
│   └── backend/         # Node.js (Express)
```

## 🚀 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, TypeScript, Socket.io
- **Database**: PostgreSQL
- **Storage**: SeaweedFS/MinIO
- **State**: Zustand, React Query

## 📦 Installation

```bash
# Install pnpm (if not already installed)
npm install -g pnpm

# Install dependencies
pnpm install
```

## 🛠️ Development

```bash
# Run all (frontend + backend)
pnpm dev

# Run only frontend
pnpm dev:frontend

# Run only backend
pnpm dev:backend
```

## 🏗️ Build

```bash
# Build all packages
pnpm build

# Build only frontend
pnpm build:frontend

# Build only backend
pnpm build:backend
```

## 📁 Project Structure

### `packages/shared`
Shared TypeScript types, utilities, and constants that are used by both frontend and backend.

### `packages/frontend`
Next.js 14 application with App Router.

### `packages/backend`
Node.js/Express backend API with WebSocket support.

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8001

# Backend
PORT=8001
DATABASE_URL=postgresql://user:password@localhost:5432/gaestefotos_v2
MINIO_ENDPOINT=localhost:9001
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=password
```

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.

## 📝 License

Private

