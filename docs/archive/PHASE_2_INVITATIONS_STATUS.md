# 📨 Phase 2: Einladungsseiten-System - STATUS

**Status**: ✅ **BEREITS KOMPLETT IMPLEMENTIERT**  
**Entdeckt**: 2026-01-21  
**Implementierung**: Vorhanden seit 2025-12-20 (Migration)

---

## 🎯 ÜBERSICHT

Das Einladungsseiten-System ist **vollständig implementiert** und produktionsreif. Es existieren:
- ✅ Komplettes DB-Schema (5 Tables)
- ✅ Backend-API (807 Zeilen, vollständig)
- ✅ Host-Management-UI
- ✅ Gäste-Ansicht mit RSVP
- ✅ Shortlink-System
- ✅ Password-Protection
- ✅ ICS-Kalender-Export

---

## 📊 BACKEND-IMPLEMENTIERUNG

### DB-Schema (Prisma)

**5 Core Tables**:

1. **`invitations`** (Haupttabelle)
   ```prisma
   model Invitation {
     id           String                @id @default(uuid())
     eventId      String
     slug         String                @unique
     name         String
     config       Json?                 @default("{}")
     passwordHash String?
     isActive     Boolean               @default(true)
     visibility   InvitationVisibility  @default(UNLISTED)
     createdAt    DateTime              @default(now())
     updatedAt    DateTime              @updatedAt
   }
   ```

2. **`invitation_rsvps`** (Zusagen/Absagen)
   ```prisma
   model InvitationRsvp {
     id           String               @id
     invitationId String
     status       InvitationRsvpStatus  // YES, NO, MAYBE
     name         String?
     ipHash       String?
     createdAt    DateTime
   }
   ```

3. **`invitation_short_links`** (Tracking-Links)
   ```prisma
   model InvitationShortLink {
     id             String     @id
     invitationId   String
     code           String     @unique  // 7-char code
     channel        String?    // 'whatsapp', 'email', etc.
     lastAccessedAt DateTime?
   }
   ```

4. **`invitation_visits`** (Analytics)
   ```prisma
   model InvitationVisit {
     id           String    @id
     invitationId String
     shortLinkId  String?
     ipHash       String?
     userAgent    String?
     createdAt    DateTime
   }
   ```

5. **`invitation_templates`** (Template-System)
   ```prisma
   model InvitationTemplate {
     id          String   @id
     slug        String   @unique
     title       String
     description String?
     html        String?
     isActive    Boolean
   }
   ```

**Enums**:
```prisma
enum InvitationVisibility { UNLISTED, PUBLIC }
enum InvitationRsvpStatus { YES, NO, MAYBE }
```

---

### API-Routes

**Datei**: `/packages/backend/src/routes/invitations.ts` (807 Zeilen)

**Host-Endpoints** (Auth required):
```typescript
GET    /events/:eventId/invitations                    // Liste
POST   /events/:eventId/invitations                    // Erstellen
PUT    /events/:eventId/invitations/:invitationId      // Bearbeiten
POST   /events/:eventId/invitations/:id/shortlinks     // Shortlink generieren
```

**Public-Endpoints**:
```typescript
GET    /invitations/slug/:slug                         // Einladung laden
POST   /invitations/slug/:slug/rsvp                    // RSVP abgeben
GET    /invitations/slug/:slug/ics                     // Kalender-Download
GET    /shortlinks/:code                               // Shortlink auflösen
GET    /events/slug/:slug/invitations/public           // Öffentliche Liste
```

**Features**:
- ✅ **Password-Protection**: bcrypt-hashed, rate-limited
- ✅ **Cookie-based Access**: JWT für UNLISTED invitations
- ✅ **IP-Hashing**: Privacy-compliant Analytics
- ✅ **Shortlink-Tracking**: Channel-Attribution
- ✅ **RSVP-Aggregation**: Real-time Counts
- ✅ **ICS-Generation**: RFC-compliant Calendar Files

---

## 🎨 FRONTEND-IMPLEMENTIERUNG

### 1. Gäste-Ansicht

**Route**: `/i/[slug]/page.tsx` (495 Zeilen)  
**URL**: `https://gaestefotos.com/i/hochzeit-mueller`

**Features**:
- ✅ Hero-Section mit Event-Details
- ✅ Datum/Uhrzeit/Ort-Display
- ✅ Google Maps-Integration
- ✅ RSVP-Buttons (Ja/Nein/Vielleicht)
- ✅ Name-Input (optional)
- ✅ Real-time RSVP-Counts
- ✅ Share-Buttons (WhatsApp, Email, Facebook, X, LinkedIn)
- ✅ Kalender-Download (ICS)
- ✅ Link zur Event-Galerie
- ✅ Password-Screen (wenn aktiviert)

**UX-Flow**:
```
1. Guest klickt Shortlink
   ↓
2. Cookie wird gesetzt (UNLISTED)
   ↓
3. Password-Screen (wenn erforderlich)
   ↓
4. Einladungsseite mit RSVP
   ↓
5. RSVP-Submit → Counts aktualisiert
```

---

### 2. Host-Management

**Route**: `/events/[id]/invitations/page.tsx` (520 Zeilen)  
**URL**: `https://gaestefotos.com/events/abc123/invitations`

**Features**:
- ✅ **Liste aller Einladungen**
  - Name, Status (Aktiv/Inaktiv)
  - Password-Badge
  - Visibility (PUBLIC/UNLISTED)
  - RSVP-Counts (Ja/Nein/Vielleicht)
  - Opens (Analytics)

- ✅ **Inline-Editing**
  - Name ändern
  - Aktiv/Inaktiv Toggle
  - Public/Unlisted Toggle
  - Password setzen/entfernen
  - Password-Visibility-Toggle

- ✅ **Shortlink-Management**
  - Automatischer Default-Shortlink bei Create
  - Zusätzliche Shortlinks generieren
  - Channel-Attribution (z.B. "whatsapp")
  - Copy-to-Clipboard
  - Share-Integration

- ✅ **Config-Editor** (Modal)
  - Hero-Section Toggle
  - RSVP-Section Toggle
  - Calendar-Section Toggle
  - Gallery-Preview Toggle
  - Custom Design-Settings

---

### 3. Host-Editor (Legacy)

**Route**: `/events/[id]/invitation/page.tsx` (40 Zeilen)  
**Komponente**: `InvitationEditorPanel`

**Status**: Legacy-Route, wird von `/invitations` ersetzt.

---

### 4. Komponenten

**Verzeichnis**: `/packages/frontend/src/components/invitation-editor/`

**Komponenten**:
- `InvitationEditorPanel.tsx` - Editor für einzelne Einladung
- `InvitationConfigEditor.tsx` - Modal für Config-Editing

---

## 🔧 TECHNISCHE DETAILS

### Shortlink-System

**URL-Format**: `https://gaestefotos.com/s/abc1234`  
**Code**: 7 Zeichen, URL-safe (a-zA-Z0-9)

**Flow**:
```
1. Host erstellt Einladung
   ↓
2. Default-Shortlink automatisch generiert
   ↓
3. Shortlink wird geteilt (WhatsApp, etc.)
   ↓
4. Guest klickt → Backend tracked:
   - IP (hashed)
   - User-Agent
   - Shortlink-ID
   - Timestamp
   ↓
5. Redirect zu /i/[slug] + Cookie
```

**Vorteile**:
- ✅ Kurze, merkbare URLs
- ✅ Channel-Attribution (WhatsApp vs. Email)
- ✅ Click-Tracking
- ✅ UNLISTED-Schutz via Cookie

---

### RSVP-System

**Workflow**:
```typescript
// Frontend
POST /invitations/slug/hochzeit-mueller/rsvp
{
  status: "YES",
  name: "Max Mustermann",
  password: "geheim123"  // wenn erforderlich
}

// Backend
1. Validation (Zod-Schema)
2. Password-Check (bcrypt)
3. IP-Hashing (HMAC-SHA256)
4. DB-Insert
5. Aggregate Counts (YES/NO/MAYBE)
6. Return updated counts
```

**Response**:
```json
{
  "ok": true,
  "rsvp": {
    "yes": 42,
    "no": 5,
    "maybe": 8
  }
}
```

---

### Password-Protection

**Features**:
- ✅ bcrypt-hashed (10 rounds)
- ✅ Rate-Limited (passwordLimiter middleware)
- ✅ Optional per Invitation
- ✅ Visibility-Toggle in UI
- ✅ Can be removed/changed

**States**:
```typescript
PASSWORD_REQUIRED  → 401 (show password screen)
INVALID_PASSWORD   → 403 (show error)
No Password        → Direkter Zugriff
```

---

### ICS-Kalender-Export

**Endpoint**: `GET /invitations/slug/:slug/ics`

**Features**:
- ✅ RFC-5545 compliant
- ✅ VEVENT with DTSTART, DTEND
- ✅ SUMMARY (Event-Titel)
- ✅ LOCATION (Ort)
- ✅ DESCRIPTION
- ✅ URL (Einladungslink)
- ✅ UTF-8 encoding
- ✅ Text-Escaping (\\n, \\,, etc.)

**Response-Header**:
```
Content-Type: text/calendar; charset=utf-8
Content-Disposition: attachment; filename="einladung-hochzeit-mueller.ics"
```

---

### Visibility-Modes

**UNLISTED** (Default):
- Nur über Shortlink erreichbar
- Cookie-basierter Zugriff
- Nicht in PUBLIC-Liste
- Ideal für exklusive Gästelisten

**PUBLIC**:
- Direktlink funktioniert
- In PUBLIC-Liste enthalten
- Kein Cookie erforderlich
- Für offene Events

---

## 📈 ANALYTICS & TRACKING

**Metriken**:
- ✅ **Opens**: Anzahl unique Visits (pro Invitation)
- ✅ **Shortlink-Clicks**: Per Shortlink-ID
- ✅ **Channel-Attribution**: WhatsApp, Email, Direct, etc.
- ✅ **RSVP-Counts**: YES/NO/MAYBE breakdown
- ✅ **Last-Accessed**: Timestamp per Shortlink

**Privacy**:
- ✅ IP-Hashing (HMAC-SHA256)
- ✅ Kein PII-Storage
- ✅ DSGVO-konform
- ✅ User-Agent anonymisiert

---

## 🎭 USE-CASES

### 1. Hochzeit (Private)
```
Familie-Einladung:
- UNLISTED
- Password: "Familie2026"
- Shortlink via WhatsApp
- RSVP: 35 Ja

Freunde-Einladung:
- UNLISTED
- Kein Password
- Shortlink via Email
- RSVP: 18 Ja, 2 Nein
```

### 2. Firmen-Event (Public)
```
Alle-Mitarbeiter:
- PUBLIC
- Kein Password
- Direktlink im Intranet
- RSVP: 120 Ja, 15 Nein
```

### 3. Geburtstag (Mixed)
```
Familie:
- UNLISTED, Password

Freunde:
- UNLISTED, kein Password

Öffentlich:
- PUBLIC, jeder kann kommen
```

---

## ✅ FEATURES-CHECKLIST

### Backend
- [x] DB-Schema (5 Tables)
- [x] CRUD-APIs (Create, Read, Update)
- [x] Shortlink-Generation
- [x] RSVP-System
- [x] Password-Protection
- [x] ICS-Export
- [x] IP-Hashing
- [x] Rate-Limiting
- [x] Cookie-based Access
- [x] Analytics-Tracking

### Frontend
- [x] Gäste-Ansicht
- [x] Host-Management
- [x] RSVP-Buttons
- [x] Share-Integration
- [x] Kalender-Download
- [x] Password-Screen
- [x] Shortlink-Copy
- [x] Config-Editor
- [x] Inline-Editing
- [x] Real-time Counts

---

## 🚀 WAS FEHLT?

**Minimale Gaps** (Nice-to-Have):

1. **Gäste-Gruppen** (aus Lovable-Audit)
   - Aktuell: Jede Einladung = separate Entity
   - Fehlend: Gruppierung (z.B. "Familie" mit Untergruppen)
   - Workaround: Mehrere Einladungen erstellen

2. **Template-System** (DB vorhanden, UI fehlt)
   - DB: `invitation_templates` Table existiert
   - API: `templateId` Parameter vorhanden
   - UI: Kein Template-Picker im Host-UI

3. **Erweiterte Config-UI**
   - Aktuell: `InvitationConfigEditor` basic
   - Fehlend: WYSIWYG-Editor für Sections
   - Workaround: JSON-Edit über API

4. **Email-Versand**
   - Aktuell: Nur Shortlink-Sharing
   - Fehlend: Bulk-Email mit Einladung
   - Roadmap: EmailTemplateKind.INVITATION vorhanden

---

## 💡 EMPFEHLUNG

**Phase 2 = ABGESCHLOSSEN**

Das Einladungsseiten-System ist **produktionsreif** und erfüllt alle kritischen Requirements:
- ✅ Host kann Einladungen erstellen
- ✅ Host kann Shortlinks teilen
- ✅ Gäste können RSVP abgeben
- ✅ Gäste können Kalender-Download
- ✅ Analytics & Tracking vorhanden

**Nächste Schritte**:
→ **Phase 3: Admin-Tools Enterprise** starten

---

## 📚 WEITERFÜHRENDE LINKS

- Backend-Route: `/packages/backend/src/routes/invitations.ts`
- Gäste-View: `/packages/frontend/src/app/i/[slug]/page.tsx`
- Host-Management: `/packages/frontend/src/app/events/[id]/invitations/page.tsx`
- DB-Schema: `/packages/backend/prisma/schema.prisma` (Zeile 588-672)
- Migrations: `/packages/backend/prisma/migrations/20251220123712_invitations/`

---

**Status**: Production-Ready ✅  
**Dokumentiert**: 2026-01-21  
**Review**: Pending
