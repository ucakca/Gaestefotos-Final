# Event DesignConfig & QR-Template-Config – technisch + laiensicher

Ziel: Dieses Dokument erklärt, wie ein Event sein Aussehen (Design) und die QR‑Aufsteller‑Konfiguration speichert, welche APIs dafür existieren und wo die Logik im Code liegt.

---

## Laiensicher (Was kann man damit machen?)

### Design (Look & Feel eines Events)

Ein Event kann ein eigenes Erscheinungsbild haben, z.B.:

- Farben (Primary/Secondary/Accent)
- Schriften
- Cover-/Profil-/Logo-Bilder
- QR-Code Darstellung / QR-Aufsteller

Das ist wichtig, damit die Guest‑Seite zum Event „passt“ und Host/Branding wiedererkennbar ist.

### QR‑Styler (QR‑Aufsteller)

Der QR‑Styler ist ein Werkzeug, um einen **druckfertigen QR‑Aufsteller** zu erstellen:

- Auswahl eines Templates (z.B. „Minimal Classic“)
- Texte anpassen (Headline, Subline, Call‑to‑Action)
- Farben anpassen (Background/Text/Accent)
- Export als PNG oder PDF (A6/A5)

Die zuletzt gespeicherten Einstellungen werden pro Event gespeichert, damit man sie später wiederverwenden kann.

---

## Technisch (Datenmodell & APIs)

### Wo liegt das in der DB?

Im Event-Feld `Event.designConfig` (JSON).

- Shared Type: `packages/shared/src/types/index.ts` → `EventDesignConfig`
- Persistiert in der DB als JSON (siehe Prisma Schema; Feld am `Event` Model).

> Hinweis: `designConfig` ist ein „flexibles“ JSON, das im Laufe der Produktentwicklung erweitert wird.

---

## `designConfig` – aktuelle Bestandteile (aus Code-Nutzung)

### 1) `colors` (Theme/Preset)

Aus `EventDesignConfig` (Shared):

- `designPresetKey?: string`
- `colors?: { primary?: string; secondary?: string; accent?: string }`
- `fonts?: { heading?: string; body?: string }`
- `coverImageUrl?: string`

Zusätzlich (observed in UI):

- Uploads für `logo`, `profile`, `cover` werden über Event-Upload-Endpunkte gespeichert und anschließend über `GET /api/events/:id` wieder geladen.

Frontend Editor:

- `packages/frontend/src/app/events/[id]/design/page.tsx`
  - Speichert Design-Updates via `PATCH /api/events/:id` mit `designConfig: { ...existing, ...updates }`.

### 2) `qrCodeConfig` (QR Code Darstellung in Design-Seite)

Im Design‑Builder wird eine separate QR Code Config im `designConfig` verwaltet.

Frontend:

- `packages/frontend/src/app/events/[id]/design/page.tsx`
  - State `qrCodeConfig` (z.B. `fgColor`, `bgColor`, `size`, `level`)
  - geladen aus `event.designConfig.qrCodeConfig` (best-effort)
  - gespeichert über `PATCH /api/events/:id` mit `designConfig.qrCodeConfig`

> Das ist unabhängig vom QR‑Styler Template Export (siehe `qrTemplateConfig`).

---

## `qrTemplateConfig` – QR‑Styler Persistenz

### Zweck

Speichert die zuletzt gewählte QR‑Template-Konfiguration pro Event (damit der QR‑Styler beim nächsten Öffnen wiederherstellt).

### Schema (Backend Validation)

Backend validiert den Body per Zod Schema:

- `templateSlug: string`
- `format: 'A6' | 'A5'`
- `headline: string`
- `subline: string`
- `eventName: string`
- `callToAction: string`
- `bgColor: '#RRGGBB'`
- `textColor: '#RRGGBB'`
- `accentColor: '#RRGGBB'`

Code:

- `packages/backend/src/routes/events.ts` → `qrTemplateConfigSchema`

### API

- `GET /api/events/:id/qr/config`
  - Auth: `authMiddleware`
  - Permission: `requireHostOrAdmin(req, res, eventId)`
  - Response: `{ ok: true, qrTemplateConfig: object|null }`

- `PUT /api/events/:id/qr/config`
  - Auth: `authMiddleware`
  - Permission: `requireHostOrAdmin(req, res, eventId)`
  - Validierung: `qrTemplateConfigSchema`
  - Persistenz: `Event.designConfig.qrTemplateConfig = <validated body>`

### Frontend

- Editor: `packages/frontend/src/app/events/[id]/qr-styler/page.tsx`
  - lädt saved config via `GET /api/events/:id/qr/config`
  - autosaved + manueller Save via `PUT /api/events/:id/qr/config`
  - Export:
    - `POST /api/events/:id/qr/export.png`
    - `POST /api/events/:id/qr/export.pdf`

---

## QR Export (PNG/PDF) – Überblick

- Backend: `packages/backend/src/routes/events.ts`
  - `POST /api/events/:id/qr/export.png`
  - `POST /api/events/:id/qr/export.pdf`

Sicherheit:

- SVG wird serverseitig auf offensichtliche Unsicherheiten geprüft (`<script>`, `onload=`, `javascript:` und remote image hrefs).

Renderer:

- bevorzugt `@resvg/resvg-js`
- Fallback (PNG) optional `sharp`

PDF Policy (Kurz):

- Host: „idiotensicher“ (kein Bleed, keine CropMarks, Default Margin)
- Admin: darf Bleed/CropMarks setzen, Margin wird dann auf 0 gezogen

Details siehe: `docs/QR_TEMPLATES.md`.

