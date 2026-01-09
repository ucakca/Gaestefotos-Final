# Co-Hosts (Event Mitglieder) – technisch + laiensicher

Ziel: Ein Event kann neben dem **Host** zusätzliche **Co-Hosts** haben.
Co-Hosts dürfen das Event **verwalten** (ähnlich Host), ohne dass sie der Host selbst sind.

## Laiensicher (Was bedeutet das?)

- **Host** = Haupt-Veranstalter des Events.
- **Co-Host** = Helfer/Teammitglied (z.B. Trauzeuge, DJ, Wedding-Planner), der die Event-Verwaltung mit übernehmen darf.
- Co-Hosts können z.B.:
  - Einstellungen prüfen
  - Inhalte moderieren
  - Uploads/Downloads verwalten
  - Gäste/Einladungen verwalten

### So lädst du jemanden als Co-Host ein

1. Im Admin Dashboard ein Event öffnen.
2. Abschnitt **Co-Hosts** → **Invite-Link erzeugen**.
3. Den Link an die Person schicken.
4. Die Person öffnet den Link:
   - Wenn sie nicht eingeloggt ist: sie wird zum Login geführt.
   - Danach wird die Einladung automatisch angenommen.

## Technisch (Datenmodell)

### Prisma

- Model: `EventMember`
- Role: `COHOST`

Wichtig:

- Host ist weiterhin `Event.hostId` (kein EventMember).
- Co-Hosts sind zusätzliche Mitglieder via Join-Table.

## Technisch (Permissions / Access Control)

### Manage Access

Viele „manage“-Aktionen prüfen jetzt:

- **ADMIN/SUPERADMIN** oder
- **Host** (`event.hostId === req.userId`) oder
- **Co-Host** (existiert `EventMember(eventId,userId,role=COHOST)`)

Backend-Helper:

- `hasEventManageAccess(req, eventId)`

## Technisch (APIs)

### Co-Hosts verwalten (auth erforderlich)

Mounts:

- `/api/events` → `packages/backend/src/routes/cohosts.ts`
- `/api/cohosts` → `packages/backend/src/routes/cohostInvites.ts`

#### Liste

- `GET /api/events/:eventId/cohosts`
- Response: `{ cohosts: EventMember[] }`

#### Direkt hinzufügen (Admin/Host/Co-Host)

- `POST /api/events/:eventId/cohosts`
- Body: `{ userId: "uuid" }`

#### Entfernen

- `DELETE /api/events/:eventId/cohosts/:userId`

### Invite Flow

#### Invite Token erzeugen

- `POST /api/events/:eventId/cohosts/invite-token`
- Response: `{ ok, eventId, inviteToken, shareUrl }`

Token Details:

- JWT `type = 'cohost_invite'`
- Payload: `{ eventId }`
- Secret: `INVITE_JWT_SECRET` (Fallback `JWT_SECRET`)
- TTL: `COHOST_INVITE_TTL_SECONDS` (Default: 7 Tage)

#### Invite annehmen (eingeloggt)

- `POST /api/cohosts/accept`
- Body: `{ inviteToken: string }`
- Effekt: Upsert `EventMember(eventId,userId,role=COHOST)`

## Frontend / Admin Dashboard

### Admin Dashboard

- Event Detail: `packages/admin-dashboard/src/app/events/[id]/page.tsx`
- Funktionen:
  - Co-Hosts anzeigen
  - User suchen (Admin Users API)
  - Co-Host add/remove
  - Invite-Link erzeugen + Clipboard

### Public App (/e2)

- Page: `packages/frontend/src/app/e2/[slug]/page.tsx`
- Query Param: `?cohostInvite=...`
- Ablauf:
  - Token wird aus URL entfernt und in `sessionStorage` gespeichert
  - Wenn nicht eingeloggt: Redirect zu `/login?returnUrl=...`
  - Wenn eingeloggt: `POST /api/cohosts/accept`

## Security Notes

- Token ist ein **Bearer Token**: wer den Link hat, kann die Rolle annehmen (bis Ablauf).
- Deshalb:
  - TTL begrenzen (`COHOST_INVITE_TTL_SECONDS`)
  - Link nur an gewünschte Personen weitergeben
  - Bei Bedarf Co-Host wieder entfernen
