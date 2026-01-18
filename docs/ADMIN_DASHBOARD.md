# Admin Dashboard - Technische Dokumentation

**Status:** ✅ Produktiv (seit 18.01.2026)  
**Version:** 2.0  
**Zuletzt aktualisiert:** 18.01.2026

## Übersicht

Das Admin Dashboard bietet umfassende Verwaltungs- und Monitoring-Funktionen für Administratoren und Super-Administratoren der Gästefotos-Plattform.

## Architektur

### Backend Routes

Alle Admin-Endpoints sind unter `/api/admin/*` verfügbar und erfordern:
- ✅ Authentifizierung via JWT Token
- ✅ Rolle: `ADMIN` oder `SUPERADMIN`

#### Implementierte Endpoints

**Dashboard & Analytics** (`/api/admin/dashboard/*`)
- `GET /stats` - Plattform-Statistiken (Nutzer, Events, Fotos, Storage)
- `GET /analytics` - Detaillierte Analytics (Top Events, Top Hosts, Daily Activity)

**Photo Moderation** (`/api/admin/photos/*`)
- `GET /` - Liste aller Fotos mit Filter (status, eventId, pagination)
- `POST /bulk-moderate` - Bulk-Freigabe/Ablehnung von Fotos
- `DELETE /bulk-delete` - Bulk-Löschung von Fotos

**System Logs** (`/api/admin/logs/*`)
- `GET /errors` - System Error Logs mit Pagination
- `DELETE /errors/cleanup` - Bereinigung alter Logs (>30 Tage)

### Frontend Pages

Alle Admin-Seiten sind unter `/admin/*` verfügbar und erfordern Admin-Berechtigung.

**Implementierte Seiten:**
- `/admin` - Dashboard Übersicht
- `/admin/dashboard` - Haupt-Dashboard mit KPIs
- `/admin/events` - Event Management
- `/admin/users` - User Management
- `/admin/photos` - Content Moderation
- `/admin/logs` - System Logs
- `/admin/analytics` - Analytics Dashboard
- `/admin/settings` - System Settings

## Features

### 1. Dashboard Statistics

**Angezeigt:**
- Gesamt-Nutzer, Events, Fotos, Videos
- Aktive Events (letzte 30 Tage)
- Heutige Registrierungen/Events/Uploads
- Wachstums-Metriken (Monat-zu-Monat)
- Storage-Nutzung (Fotos + Videos)

**Datenquelle:**
```typescript
GET /api/admin/dashboard/stats
```

**Response:**
```json
{
  "ok": true,
  "stats": {
    "total": { "users": 1234, "events": 567, "photos": 89012, "videos": 345, "activeEvents": 23 },
    "today": { "users": 5, "events": 2, "photos": 123 },
    "growth": { 
      "eventsThisMonth": 45, 
      "eventsLastMonth": 38,
      "eventsGrowth": "18.4",
      "photosThisMonth": 5678,
      "photosLastMonth": 4321,
      "photosGrowth": "31.4"
    },
    "storage": {
      "photosBytes": 12345678901,
      "videosBytes": 2345678901,
      "totalBytes": 14691357802
    }
  },
  "recent": {
    "events": [...],
    "users": [...]
  }
}
```

### 2. Event Management

**Funktionen:**
- Event-Liste mit Suche und Pagination
- Quick Actions: Aktivieren/Deaktivieren, Löschen
- Event-Details anzeigen
- Filter nach Status (aktiv/inaktiv)

**Prisma Queries:**
- Verwendet `deletedAt: null` für Soft-Delete-Filter
- Zählt `photos`, `guests`, `videos` via `_count`
- Selectiert nur benötigte Felder (Performance)

### 3. User Management

**Funktionen:**
- User-Liste mit Rollen-Anzeige
- Rollen-Änderung (USER, ADMIN, SUPERADMIN)
- 2FA-Status anzeigen
- User sperren/löschen (löschen implementiert, sperren zurückgestellt)

**Hinweis:** User-Locking (`lockedAt`, `lockedReason`) ist im Prisma-Schema nicht vorhanden und wurde mit HTTP 501 implementiert.

### 4. Content Moderation

**Funktionen:**
- Foto-Queue mit Status-Filter (PENDING, APPROVED, REJECTED)
- Bulk-Selection und Actions
- Einzelbild-Freigabe/Ablehnung
- Bulk-Löschung

**Status-Werte:**
```typescript
enum PhotoStatus {
  PENDING   // Noch nicht moderiert
  APPROVED  // Freigegeben
  REJECTED  // Abgelehnt
}
```

**Query-Parameter:**
```typescript
{
  q?: string,           // Suchbegriff (aktuell deaktiviert)
  eventId?: string,     // Filter nach Event
  status?: 'pending' | 'approved' | 'rejected',
  limit?: number,       // Default: 50, Max: 200
  offset?: number       // Default: 0
}
```

### 5. System Monitoring

**Log-Typen:**
- Error Logs (QaLogEvent mit level='IMPORTANT')
- System-Metriken
- Server-Informationen

**Auto-Cleanup:**
- Logs älter als 30 Tage können gelöscht werden
- Manuelle Trigger via `/api/admin/logs/errors/cleanup`

### 6. Analytics

**Top-Listen:**
- Top Events (nach Foto-Anzahl)
- Top Events (nach Gäste-Anzahl)
- Top Hosts (nach Event-Anzahl)

**Activity-Tracking:**
- Daily Activity (letzte 30 Tage)
- Foto-Uploads pro Tag
- Event-Erstellung pro Tag

## Datenbankschema-Anpassungen

### Verwendete Felder

**Event:**
- `id`, `hostId`, `title`, `slug`, `dateTime`
- `locationName` (nicht `location`)
- `isActive`, `createdAt`, `updatedAt`, `deletedAt`
- **NICHT verwendet:** `description` (nicht im Schema)

**Photo:**
- `id`, `eventId`, `createdAt`, `status`
- **NICHT verwendet:** 
  - `uploadedAt` (nicht im Schema, verwende `createdAt`)
  - `filename`, `guestName` (nicht direkt querybar)
  - `isApproved`, `moderatedAt`, `rejectionReason` (ersetzt durch `status`)

**User:**
- `id`, `email`, `name`, `role`, `twoFactorEnabled`
- `createdAt`, `updatedAt`
- **NICHT verwendet:** `lockedAt`, `lockedReason` (nicht im Schema)

**QaLogEvent:**
- `id`, `level`, `type`, `message`, `data`, `createdAt`
- Filter: `level='IMPORTANT'` für Error-Logs

## Sicherheit

### Authentication & Authorization

Alle Admin-Endpoints verwenden:
```typescript
router.get('/endpoint', 
  authMiddleware,           // JWT-Validierung
  requireRole('ADMIN'),     // Rollen-Check
  async (req: AuthRequest, res: Response) => {
    // Handler-Code
  }
);
```

**Berechtigungsstufen:**
- `USER` - Kein Admin-Zugriff
- `ADMIN` - Voller Admin-Zugriff
- `SUPERADMIN` - Voller Admin-Zugriff + erweiterte Rechte

### Rate Limiting

Admin-Endpoints nutzen die bestehende Rate-Limiting-Middleware:
- Standard API-Limit gilt auch für Admin-Routes
- Keine separaten Limits für Admin-Operationen

## Deployment

### Production Services

**Systemd Services:**
```bash
# Backend
systemctl restart gaestefotos-backend.service
systemctl status gaestefotos-backend.service

# Frontend
systemctl restart gaestefotos-frontend.service
systemctl status gaestefotos-frontend.service
```

**Deployment-Prozess:**
1. Build: `pnpm --filter @gaestefotos/backend build`
2. Build: `pnpm --filter @gaestefotos/frontend build`
3. Restart Services (siehe oben)

**Health-Check:**
```bash
curl http://localhost:3000/api/health
# Expected: 200 OK
```

## Testing

### API Endpoint Tests

**Ohne Auth (erwartet 401):**
```bash
curl http://localhost:3000/api/admin/dashboard/stats
# Response: {"error": "Unauthorized: No token provided"}
```

**Mit Auth-Token:**
```bash
TOKEN="your-jwt-token"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/dashboard/stats
```

### Frontend Access

**URL:** `https://app.gästefotos.com/admin`

**Zugriff:**
1. Login mit Admin-Account
2. Navigation zu `/admin` (automatische Weiterleitung bei fehlenden Rechten)
3. Dashboard-Zugriff prüfen

## Performance-Optimierungen

### Prisma Queries

**Best Practices angewendet:**
1. **Select nur benötigte Felder** - Reduziert Datentransfer
2. **Pagination** - Limit/Offset für große Datenmengen
3. **Count-Queries parallel** - `Promise.all()` für bessere Performance
4. **Soft-Delete Filter** - `deletedAt: null` in allen Event-Queries
5. **Number-Casting** - BigInt → Number für JSON-Serialisierung

**Beispiel:**
```typescript
const [total, photos] = await Promise.all([
  prisma.photo.count({ where }),
  prisma.photo.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      eventId: true,
      createdAt: true,
      status: true,
      event: {
        select: { id: true, title: true, slug: true }
      }
    }
  })
]);
```

## Bekannte Einschränkungen

1. **User Locking** - Nicht implementiert (Schema-Feld fehlt)
2. **Photo Filename/GuestName Search** - Nicht implementiert (Felder nicht direkt querybar)
3. **Event Description** - Nicht verfügbar (Schema-Feld fehlt)
4. **Photo Moderation History** - Nur aktueller Status (keine History)

## Zukünftige Erweiterungen

### Phase 1 (Nächste Schritte)
- [ ] Real-time Dashboard Updates (WebSockets)
- [ ] Export-Funktionen (CSV, PDF)
- [ ] Erweiterte Filter-Optionen
- [ ] Bulk-Actions für Events/Users

### Phase 2 (Geplant)
- [ ] Audit-Log für Admin-Aktionen
- [ ] Dashboard-Widgets individualisieren
- [ ] Scheduled Reports per E-Mail
- [ ] Advanced Analytics (Charts, Trends)

## Troubleshooting

### Backend startet nicht
```bash
# Logs prüfen
journalctl -u gaestefotos-backend.service -n 100

# Typische Fehler:
# - Prisma Client nicht generiert → pnpm exec prisma generate
# - Port bereits belegt → lsof -i :3000
# - Env-Variablen fehlen → .env prüfen
```

### Frontend 404 auf /admin
```bash
# Build-Status prüfen
ls -la packages/frontend/.next/

# Neu builden
pnpm --filter @gaestefotos/frontend build
```

### API 401 Unauthorized
```bash
# Token prüfen
# - Gültigkeit (exp)
# - Rolle (ADMIN/SUPERADMIN)
# - Signature
```

## Wartung

### Regelmäßige Tasks

**Täglich:**
- Error-Logs prüfen (`/admin/logs`)
- Dashboard-Metriken checken

**Wöchentlich:**
- Storage-Nutzung überwachen
- Top Events/Users reviewen

**Monatlich:**
- Alte Logs bereinigen (>30 Tage)
- Performance-Metriken analysieren

## Support & Kontakt

**Technische Dokumentation:** `/root/gaestefotos-app-v2/docs/`  
**API Schema:** Prisma Schema in `packages/backend/prisma/schema.prisma`  
**Logs:** `journalctl -u gaestefotos-backend.service`

---

**Dokumentation erstellt:** 18.01.2026  
**Letztes Update:** 18.01.2026  
**Version:** 2.0.0
