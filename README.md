# Gaestefotos — Enterprise Event Photo Platform

**Version 2.1.0** | **Production** | **Updated 2026-02-16**

The all-in-one SaaS + Hardware platform for event photography. QR-Upload, Live Wall, Face Search, Photo Booth, Mosaic Wall, AI Photo Styles, Workflow Builder — GDPR-compliant, made in Austria.

**Live:** [app.gaestefotos.com](https://app.xn--gstefotos-v2a.com) | **Admin:** [dash.gaestefotos.com](https://dash.xn--gstefotos-v2a.com)

---

## Architecture

```
                        ┌──────────────────────┐
                        │       Cloudflare      │
                        │     (CDN / WAF)       │
                        └──────────┬───────────┘
                                   │
                        ┌──────────┴───────────┐
                        │        Nginx         │
                        │  (Reverse Proxy, SSL) │
                        └───┬──────┬──────┬────┘
                            │      │      │
               ┌────────────┘      │      └────────────┐
               │                   │                    │
    ┌──────────┴──────┐  ┌────────┴────────┐  ┌───────┴──────────┐
    │    Frontend     │  │  Admin Dashboard │  │     Backend      │
    │   Next.js 16    │  │   Next.js 16     │  │   Express.js     │
    │   Port 3000     │  │   Port 3001      │  │   Port 8001      │
    │  app.gästefotos │  │ dash.gästefotos  │  │  Socket.IO WS    │
    └────────┬────────┘  └────────┬─────────┘  └──┬───────────────┘
             │                    │               │
             └────────────────────┴───────────────┘
                                  │
          ┌───────────┬───────────┼───────────┬──────────┐
          │           │           │           │          │
    ┌─────┴────┐ ┌────┴───┐ ┌────┴────┐ ┌────┴───┐ ┌───┴────┐
    │PostgreSQL│ │ Redis  │ │SeaweedFS│ │ Groq   │ │Twilio  │
    │ 78 Models│ │ Cache  │ │S3 Store │ │+4 AI   │ │ SMS    │
    │ Prisma   │ │Sessions│ │ Photos  │ │Providers│ │        │
    └──────────┘ │CSRF/RL │ │ Videos  │ └────────┘ └────────┘
                 └────────┘ └─────────┘
```

---

## Packages

| Package | Stack | Port | Description |
|---------|-------|------|-------------|
| `backend` | Express, Prisma, Socket.IO | 8001 | API Server — 85 route files, 78 DB models |
| `frontend` | Next.js 16, React, Tailwind | 3000 | User App — 55 pages, 282 components |
| `admin-dashboard` | Next.js 16, React, Tailwind | 3001 | Admin UI — 35 pages |
| `shared` | TypeScript | — | Shared types & utils |

---

## Project Structure

```
gaestefotos-app-v2/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── routes/             # 85 API route files
│   │   │   ├── services/           # Business logic (AI, cache, billing, face search, …)
│   │   │   ├── middleware/         # Auth, CSRF (Redis), rate-limit (Redis), CSP
│   │   │   └── index.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # 78 models, 2255 lines
│   │   │   └── migrations/         # 50 migrations
│   │   └── package.json
│   │
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── app/                # 55 pages (App Router)
│   │   │   │   ├── e3/[slug]/      # Public event gallery
│   │   │   │   ├── i/[slug]/       # Digital invitations
│   │   │   │   ├── live/[slug]/    # Live wall + camera
│   │   │   │   ├── events/[id]/    # Host event management (15 sub-pages)
│   │   │   │   └── dashboard/      # Host dashboard
│   │   │   ├── components/         # 282 React components
│   │   │   ├── hooks/              # Custom hooks
│   │   │   ├── lib/                # API client, auth, i18n
│   │   │   └── store/              # Zustand stores
│   │   ├── i18n/                   # Locale config
│   │   ├── messages/               # 5 languages (de/en/fr/es/it)
│   │   └── public/
│   │       ├── robots.txt
│   │       └── qr-templates/       # 10+ SVG templates
│   │
│   ├── admin-dashboard/
│   │   └── src/app/(admin)/
│   │       ├── dashboard/          # Stats overview
│   │       ├── manage/             # Events, Users, Partners, Workflows, …
│   │       ├── settings/           # General, API Keys, WooCommerce
│   │       └── system/             # Health, Logs, AI Cache, Rate Limits
│   │
│   └── shared/                     # TypeScript types
│
├── e2e/                            # 19 Playwright E2E specs
├── docs/                           # 41 documentation files
├── scripts/                        # Deploy & ops scripts
└── deploy.sh                       # Unified deploy (backend|frontend|admin)
```

---

## Features

### Core

- **Photo Upload** — TUS resumable upload, EXIF extraction, auto-rotation, deduplication
- **Video Upload** — MP4/MOV, thumbnail generation, streaming
- **Event Protection** — Password, shortlinks, QR codes
- **Categories** — Album organization, drag & drop, smart albums (AI)
- **Downloads** — Single, bulk, ZIP (up to 10GB)
- **Guestbook** — Text + photo entries, moderation, PDF export
- **Challenges** — Photo contests with voting
- **Stories** — Instagram-style stories
- **Live Wall** — Real-time photo projection (5 animations), multi-source
- **Co-Hosts** — Event co-management with invitation flow
- **Digital Invitations** — Design editor, RSVP, WhatsApp share, ICS calendar
- **Comments & Likes** — Social interaction on photos/videos

### Face Search (free for all tiers)

Server-side WASM face detection. Selfie → instantly find all your photos. GDPR consent management with automatic biometric data scrubbing on event deletion.

### AI Features (17 functions, 5 providers)

Groq + Grok + OpenAI (text) / Replicate + Stability AI (image). Intelligent 30-day cache with warm-up, auto-fallback, offline-capable.

- Album suggestions, event descriptions, invitation texts, challenge ideas, guestbook intros
- Color design, chat assistant, highlight reel
- Photo styles: Van Gogh, Anime, Cartoon, Oldify, DrawBot

### Photo Games (free in all packages)

Photobomb Challenge, Cover Shooting, Emoji Challenge, Filter Roulette, Digital Graffiti, Face Switch, Compliment Mirror, Mystery Overlay — with leaderboard, badges & achievements.

### Mosaic Wall

Digital + print mode. 5-step wizard. AI overlay analysis. Board designer for branded banners. Print-on-demand option.

### Workflow Builder (Admin)

Visual ReactFlow node editor. 12 flow types, 37 step types. Lock/unlock, versioning, backup/restore, duplicate. XState v5 runtime, event bus, sub-workflows, multi-user editing with OCC.

### Partner/Franchise Model (B2B)

Partner dashboard with stats, team management (Owner/Manager/Operator), hardware inventory, branding. Automated billing with status workflow (Draft → Finalized → Sent → Paid).

### QR-Code Designer

10+ SVG templates in 6 categories. A6/A5 table stands, Story, Square formats. PNG + PDF export. Custom colors, QR style, logo integration.

### Dynamic Event Themes

15 default themes (wedding, party, business, …). AI theme generation. CSS custom properties injection, Google Fonts loading, Framer Motion animations.

---

## Security (Audit-Hardened Feb 2026)

| Layer | Implementation |
|-------|---------------|
| **Authentication** | JWT httpOnly cookies, 1h access + 30d refresh token rotation (Redis) |
| **2FA (TOTP)** | Mandatory for admins, AES-256-GCM encrypted secrets, recovery codes |
| **CSRF** | Double-submit cookie, Redis-backed token store |
| **Rate Limiting** | 20 endpoint-specific limiters, all Redis-backed (`rate-limit-redis`) |
| **CSP** | Nonce-based Content Security Policy (per-request nonce in middleware) |
| **Input Validation** | Zod schemas on all endpoints |
| **Account Lockout** | Configurable attempts/window/duration |
| **Admin Impersonation** | Admin-to-admin blocked, audit-logged |
| **Face Data Retention** | Automatic biometric scrubbing for deleted/expired events (GDPR) |
| **Helmet.js** | Security headers (HSTS, X-Frame, etc.) |

---

## i18n

Cookie-based locale switching (no URL prefix routing). 5 languages: German, English, French, Spanish, Italian. Custom lightweight `I18nProvider` compatible with Next.js 16 Turbopack.

---

## Tech Stack

### Backend

Express.js, Prisma ORM (78 models), Socket.IO, Sharp, @tus/server, @aws-sdk/client-s3, rate-limit-redis, pdf-lib, qrcode, nodemailer, winston, zod, bcryptjs, jsonwebtoken, ioredis

### Frontend

Next.js 16 (App Router, Turbopack), React 19, TailwindCSS, Radix UI, Framer Motion, Zustand, Lucide, react-hook-form, XState v5, @xstate/react

### Infrastructure

PostgreSQL 14+, Redis 7+, SeaweedFS (S3), Nginx, systemd, Cloudflare (CDN/WAF)

---

## Quick Start

```bash
# Clone & install
git clone <repo-url> && cd gaestefotos-app-v2
pnpm install

# Database
cd packages/backend
cp .env.example .env   # edit DATABASE_URL, JWT_SECRET, etc.
pnpm prisma migrate dev

# Start dev
pnpm dev               # backend (port 8001)
cd ../frontend && pnpm dev   # frontend (port 3000)
```

### Environment Variables

```env
PORT=8001
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/gaestefotos
JWT_SECRET=change-me
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_TTL_SECONDS=2592000
REDIS_URL=redis://localhost:6379
SEAWEEDFS_ENDPOINT=localhost:8333
SEAWEEDFS_BUCKET=gaestefotos-v2
TUS_MAX_SIZE=104857600
```

---

## Deployment

```bash
# Unified deploy script (rsync → install → build → restart)
bash deploy.sh backend
bash deploy.sh frontend
bash deploy.sh admin
```

| Service | Port | systemd Unit | Domain |
|---------|------|-------------|--------|
| Backend | 8001 | `gaestefotos-backend.service` | API via nginx |
| Frontend | 3000 | `gaestefotos-frontend.service` | app.gaestefotos.com |
| Admin | 3001 | `gaestefotos-admin-dashboard.service` | dash.gaestefotos.com |

---

## Testing

```bash
pnpm run e2e:stable    # 19 Playwright specs (auto-starts servers)
pnpm run e2e:ui        # Interactive UI mode
pnpm run e2e:report    # View HTML report
pnpm run hooks:install # Git pre-push hook
```

---

## Documentation

See `docs/` for 41 documentation files including:

- `docs/INDEX.md` — Start here
- `docs/API_MAP.md` — All API endpoints mapped to files
- `docs/FEATURES.md` — Feature overview
- `docs/DEPLOYMENT.md` — Deployment guide
- `docs/PRICING-STRATEGY.md` — Pricing model (B2C + B2B)
- `docs/SALES-FEATURE-LISTE.md` — Complete sales feature list
- `docs/SECURITY-BADGES.md` — Security audit results
- `docs/AUTH_FLOWS.md` — Authentication flow documentation

---

## Platform Numbers

| Metric | Value |
|--------|-------|
| Backend API routes | 85 |
| Frontend pages | 55 |
| React components | 282 |
| Admin pages | 35 |
| Prisma models | 78 |
| DB migrations | 50 |
| E2E test specs | 19 |
| AI features | 17 |
| AI providers | 5 |
| Workflow step types | 37 |
| Languages | 5 |
| Rate limiters | 20 (all Redis-backed) |

---

**v2.1.0** | Audit-hardened | GDPR-compliant | Made in Austria
