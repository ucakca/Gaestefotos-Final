# Vollständige Analyse: Dynamische Einladungen & QR-Code Designer

**Datum:** 2026-01-10  
**Ziel:** Integration von Gästegruppen, dynamischen Einladungsseiten und QR-Code Designer

---

## 1. Bestehende Strukturen & Überschneidungen

### 1.1 Datenbank-Models (Prisma Schema)

#### ✅ **Bereits vorhanden:**

1. **`Invitation` Model** (Zeile 622-642)
   - `id`, `eventId`, `slug`, `name`, `config` (JSON), `passwordHash`, `isActive`, `visibility`
   - **Konflikt:** `config` JSON wird bereits für Basis-Konfiguration genutzt (z.B. `title`, `dateTime`, `locationName`, `sections`)
   - **Empfehlung:** `config` JSON erweitern ODER neue Models für Sektionen/Content

2. **`QrDesign` Model** (Zeile 551-568)
   - `id`, `eventId` (unique), `templateSlug`, `format`, `headline`, `subline`, `eventName`, `callToAction`, `bgColor`, `textColor`, `accentColor`, `logoUrl`
   - **Problem:** Sehr basic, keine Storage-Pfade für generierte Assets (PNG/SVG/PDF)
   - **Konflikt:** Keine Verknüpfung zu `Invitation` (sollte pro Event mehrere Designs erlauben)
   - **Empfehlung:** Model erweitern ODER neues `QRCodeDesign` Model (wie vorgeschlagen)

3. **`design_projects` Model** (Zeile 870-888)
   - `id`, `event_id`, `type`, `name`, `config` (JSON), `template_id`, `is_published`, `is_draft`, `version`
   - **Konflikt:** Generisches Design-Projekt-System, könnte QR-Designs enthalten
   - **Empfehlung:** Prüfen ob QR-Designs hier reinpassen ODER separate Models

4. **`design_templates` Model** (Zeile 890-909)
   - `id`, `name`, `description`, `type`, `category`, `preview_image_url`, `config` (JSON), `tags`, `is_premium`, `popularity`, `is_active`
   - **Konflikt:** Generisches Template-System
   - **Empfehlung:** Könnte QR-Templates enthalten, aber `qr_templates` existiert separat

5. **`qr_templates` Model** (Zeile 911-929)
   - `id`, `name`, `description`, `category`, `isPremium`, `isPublic`, `previewUrl`, `templateImageUrl`, `config` (String), `usageCount`, `rating`
   - **Konflikt:** Template-System existiert bereits, aber `config` ist String (nicht JSON)
   - **Empfehlung:** Template-System nutzen, aber `config` zu JSON migrieren

6. **`Guest` Model** (Zeile 261-281)
   - `id`, `eventId`, `firstName`, `lastName`, `email`, `status`, `dietaryRequirements`, `plusOneCount`, `accessToken`
   - **Fehlend:** Keine Verknüpfung zu Gästegruppen
   - **Empfehlung:** `guestGroupId` optional hinzufügen

7. **`InvitationRsvp` Model** (Zeile 645-658)
   - `id`, `invitationId`, `status` (YES/NO/MAYBE), `name`, `ipHash`, `userAgent`
   - **Fehlend:** Keine gruppenspezifischen Fragen/Answers
   - **Empfehlung:** `guestGroupId` und `answers` JSON hinzufügen

#### ❌ **Nicht vorhanden (muss erstellt werden):**

1. **`GuestGroup` Model** - Gästegruppen (Familie, Freunde, etc.)
2. **`InvitationSection` Model** - Sektionen der Einladungsseite (Trauung, Party, etc.)
3. **`InvitationContent` Model** - Content pro Sektion (Zeitplan, Dresscode, etc.)
4. **`SectionAccess` Model** - Berechtigungen (welche Gruppe sieht welche Sektion)

---

## 2. Backend API-Routes

### 2.1 Bestehende Routes

#### ✅ **`/routes/invitations.ts`** (vollständig implementiert)

- `GET /events/:eventId/invitations` - Liste aller Invitations
- `POST /events/:eventId/invitations` - Neue Invitation erstellen
- `PUT /events/:eventId/invitations/:invitationId` - Invitation aktualisieren
- `GET /invitations/slug/:slug` - Public: Invitation abrufen
- `POST /invitations/slug/:slug/rsvp` - Public: RSVP absenden
- `GET /invitations/slug/:slug/ics` - Public: ICS-Datei downloaden
- `GET /shortlinks/:code` - Shortlink auflösen

**Konflikt:** Keine Endpoints für:
- Gästegruppen-Management
- Sektionen-Management
- Section-Access-Management
- Gruppenspezifische RSVP-Fragen

**Empfehlung:** Neue Routes hinzufügen:
- `GET /events/:eventId/guest-groups`
- `POST /events/:eventId/guest-groups`
- `PUT /events/:eventId/guest-groups/:groupId`
- `GET /invitations/slug/:slug/sections` (public, mit `?group=accessCode`)
- `POST /invitations/slug/:slug/sections/:sectionId/content`
- `GET /invitations/slug/:slug/rsvp-questions` (gruppenspezifisch)

#### ✅ **`/routes/qrDesigns.ts`** (teilweise implementiert)

- `GET /events/:eventId/qr-designs` - Liste aller QR-Designs
- `PUT /events/:eventId/qr-designs/:designId` - QR-Design speichern
- `DELETE /events/:eventId/qr-designs/:designId` - QR-Design löschen

**Problem:** Designs werden in `event.designConfig.qrDesigns` JSON-Array gespeichert (nicht in `QrDesign` Model)

**Konflikt:** 
- `QrDesign` Model existiert, wird aber nicht genutzt
- `qrDesigns.ts` Route nutzt `event.designConfig` JSON statt Prisma Model

**Empfehlung:** 
- Entweder: `QrDesign` Model nutzen (migrieren von JSON zu Model)
- Oder: `QrDesign` Model löschen und bei JSON bleiben

#### ✅ **`/routes/events.ts`** (QR-Export vorhanden)

- `POST /events/:eventId/qr/export` - QR-Code als SVG exportieren
- `POST /events/:eventId/qr/pdf` - QR-Code als PDF exportieren
- `POST /events/:eventId/qr/template` - QR-Template konfigurieren

**Konflikt:** QR-Export nutzt `qrTemplateConfigSchema`, aber keine Verknüpfung zu `QrDesign` Model

**Empfehlung:** QR-Export mit `QrDesign` Model verknüpfen

---

## 3. Frontend-Routing

### 3.1 Bestehende Routes

#### ✅ **`/app/i/[slug]/page.tsx`** (vollständig implementiert)

**Aktuelle Features:**
- Password-geschützte Einladungen
- RSVP (YES/NO/MAYBE)
- ICS-Download
- Sharing (WhatsApp, Email, Social Media)
- Link zur Event-Galerie (`/e/[slug]`)

**Fehlend:**
- Dynamische Sektionen (Trauung, Party, Timeline, etc.)
- Gruppenspezifische Inhalte
- QR-Code Designer UI
- Gruppenspezifische RSVP-Fragen

**Routing-Strategie:**
- ✅ Einladungen auf Hauptdomain: `/i/[slug]` (funktioniert bereits)
- ✅ App auf Subdomain: `/e/[slug]` (funktioniert bereits)
- ❌ Gruppenspezifische URLs: `/i/[slug]?group=[accessCode]` (muss implementiert werden)

### 3.2 Fehlende Frontend-Komponenten

1. **QR-Code Designer UI**
   - Route: `/dashboard/events/[id]/qr-designer` (muss erstellt werden)
   - Komponenten: ColorPicker, TemplateSelector, Preview, Export (PNG/SVG/PDF)

2. **Dynamische Einladungsseite**
   - Sektionen-Rendering (Hero, Timeline, Location, RSVP, etc.)
   - Gruppenspezifische Filterung
   - Responsive Design

3. **Gästegruppen-Management**
   - Route: `/dashboard/events/[id]/guest-groups` (muss erstellt werden)
   - CRUD für Gästegruppen
   - Gast-Zuordnung zu Gruppen

---

## 4. Konflikte & Risiken

### 4.1 Datenbank-Konflikte

#### **Konflikt 1: `QrDesign` Model vs. `event.designConfig.qrDesigns` JSON**

**Problem:**
- `QrDesign` Model existiert in Schema (Zeile 551-568)
- `qrDesigns.ts` Route nutzt aber `event.designConfig.qrDesigns` JSON-Array
- Model wird nicht genutzt → Inkonsistenz

**Lösungsoptionen:**
1. **Option A:** `QrDesign` Model nutzen (empfohlen)
   - Migration: JSON → Model migrieren
   - Vorteil: Type-Safety, Queries, Relations
   - Nachteil: Migration nötig

2. **Option B:** `QrDesign` Model löschen
   - Bei JSON bleiben
   - Vorteil: Keine Migration
   - Nachteil: Keine Type-Safety, schwierige Queries

**Empfehlung:** Option A (Model nutzen, Migration schreiben)

#### **Konflikt 2: `Invitation.config` JSON vs. neue Models**

**Problem:**
- `Invitation.config` wird bereits für Basis-Konfiguration genutzt (z.B. `sections: { hero: { enabled: true } }`)
- Neue Models (`InvitationSection`, `InvitationContent`) würden das ersetzen

**Lösungsoptionen:**
1. **Option A:** Models nutzen (empfohlen)
   - `Invitation.config` für Basis-Metadaten behalten
   - Sektionen/Content in Models auslagern
   - Vorteil: Type-Safety, Queries, Relations

2. **Option B:** Bei JSON bleiben
   - `Invitation.config` erweitern
   - Vorteil: Keine Migration
   - Nachteil: Keine Type-Safety, schwierige Queries

**Empfehlung:** Option A (Models nutzen, `config` für Metadaten behalten)

#### **Konflikt 3: `design_projects` vs. `QRCodeDesign`**

**Problem:**
- `design_projects` ist generisches Design-Projekt-System
- Könnte QR-Designs enthalten (`type: "qr"`)

**Lösungsoptionen:**
1. **Option A:** Separate Models (empfohlen)
   - `QRCodeDesign` für QR-spezifische Features
   - `design_projects` für andere Design-Projekte
   - Vorteil: Klare Trennung, QR-spezifische Features

2. **Option B:** `design_projects` nutzen
   - QR-Designs als `type: "qr"` speichern
   - Vorteil: Einheitliches System
   - Nachteil: Generisch, QR-spezifische Features schwierig

**Empfehlung:** Option A (Separate Models)

### 4.2 API-Konflikte

#### **Konflikt 4: QR-Design Routes**

**Problem:**
- `qrDesigns.ts` nutzt `event.designConfig.qrDesigns` JSON
- `events.ts` QR-Export nutzt `qrTemplateConfigSchema`
- Keine Verknüpfung zwischen beiden

**Empfehlung:**
- QR-Export mit `QrDesign` Model verknüpfen
- Oder: QR-Designs in `QrDesign` Model migrieren

### 4.3 Frontend-Konflikte

#### **Konflikt 5: Einladungsseite Routing**

**Problem:**
- `/i/[slug]` existiert bereits
- Gruppenspezifische URLs (`?group=accessCode`) müssen hinzugefügt werden

**Empfehlung:**
- Query-Parameter `group` hinzufügen
- Backend: Gruppenspezifische Inhalte filtern

---

## 5. Migration-Strategie

### 5.1 Phase 1: Datenbank-Erweiterungen (NON-BREAKING)

1. **Neue Models hinzufügen:**
   - `GuestGroup` (optional `guestGroupId` in `Guest`)
   - `InvitationSection`
   - `InvitationContent`
   - `SectionAccess`
   - `QRCodeDesign` (oder `QrDesign` erweitern)

2. **Bestehende Models erweitern:**
   - `Guest.guestGroupId` (optional, nullable)
   - `InvitationRsvp.guestGroupId` (optional, nullable)
   - `InvitationRsvp.answers` (JSON, optional)

3. **Migration:**
   - `prisma migrate dev --name add_guest_groups_and_sections`
   - Keine Breaking Changes (alle neuen Felder optional)

### 5.2 Phase 2: Backend API-Erweiterungen

1. **Neue Routes:**
   - `/routes/guestGroups.ts` - Gästegruppen-Management
   - `/routes/invitationSections.ts` - Sektionen-Management
   - Erweiterte `/routes/invitations.ts` - Gruppenspezifische Inhalte

2. **Bestehende Routes erweitern:**
   - `/invitations/slug/:slug` - Gruppenspezifische Filterung
   - `/invitations/slug/:slug/rsvp` - Gruppenspezifische Fragen

3. **QR-Design Migration:**
   - `event.designConfig.qrDesigns` → `QrDesign` Model migrieren
   - Oder: Bei JSON bleiben, aber Model für neue Designs nutzen

### 5.3 Phase 3: Frontend-Implementierung

1. **QR-Code Designer UI:**
   - Route: `/dashboard/events/[id]/qr-designer`
   - Komponenten: Designer, Preview, Export

2. **Dynamische Einladungsseite:**
   - Sektionen-Rendering
   - Gruppenspezifische Filterung
   - Responsive Design

3. **Gästegruppen-Management:**
   - Route: `/dashboard/events/[id]/guest-groups`
   - CRUD für Gästegruppen

### 5.4 Phase 4: Testing & Rollout

1. **Staging-Tests:**
   - Gruppenspezifische Einladungen testen
   - QR-Designer testen
   - Migration testen

2. **Production-Rollout:**
   - Migration ausführen
   - Features aktivieren
   - Monitoring

---

## 6. Empfohlene Implementierungsreihenfolge

### Schritt 1: Datenbank-Schema (NON-BREAKING)
1. ✅ `GuestGroup` Model hinzufügen
2. ✅ `InvitationSection` Model hinzufügen
3. ✅ `InvitationContent` Model hinzufügen
4. ✅ `SectionAccess` Model hinzufügen
5. ✅ `Guest.guestGroupId` hinzufügen (optional)
6. ✅ `InvitationRsvp.guestGroupId` + `answers` hinzufügen (optional)
7. ✅ `QRCodeDesign` Model erweitern ODER neues Model

### Schritt 2: Backend API (NON-BREAKING)
1. ✅ Gästegruppen-Routes (`/routes/guestGroups.ts`)
2. ✅ Sektionen-Routes (`/routes/invitationSections.ts`)
3. ✅ Erweiterte Invitations-Routes (gruppenspezifisch)
4. ✅ QR-Design Migration (JSON → Model ODER beides parallel)

### Schritt 3: Frontend (NON-BREAKING)
1. ✅ QR-Code Designer UI
2. ✅ Dynamische Einladungsseite (Sektionen)
3. ✅ Gästegruppen-Management UI

### Schritt 4: Migration (BREAKING, aber optional)
1. ⚠️ Bestehende `event.designConfig.qrDesigns` → `QrDesign` Model migrieren
2. ⚠️ Bestehende `Invitation.config.sections` → `InvitationSection` Models migrieren

---

## 7. Risiken & Fallbacks

### 7.1 Risiko: Migration von JSON zu Models

**Risiko:** Bestehende Daten in JSON könnten verloren gehen

**Fallback:**
- Migration-Script schreiben, das JSON → Models konvertiert
- Rollback-Plan: JSON behalten, Models optional nutzen

### 7.2 Risiko: Performance bei vielen Sektionen

**Risiko:** Viele Sektionen könnten langsame Queries verursachen

**Fallback:**
- Indexes auf `invitationId`, `order`
- Caching für öffentliche Einladungsseiten
- Lazy Loading für Sektionen

### 7.3 Risiko: CORS/Origin-Probleme

**Risiko:** Gruppenspezifische URLs könnten CORS-Probleme verursachen

**Fallback:**
- Backend CORS-Config prüfen (`index.ts` Zeile 135-150)
- `FRONTEND_URL` muss alle Domains enthalten

---

## 8. Offene Fragen

1. **Soll `QrDesign` Model genutzt werden oder bei JSON bleiben?**
   - **Empfehlung:** Model nutzen (Type-Safety, Queries)

2. **Soll `design_projects` für QR-Designs genutzt werden?**
   - **Empfehlung:** Nein, separate `QRCodeDesign` Model

3. **Soll `Invitation.config` JSON erweitert werden oder Models nutzen?**
   - **Empfehlung:** Models nutzen, `config` für Metadaten

4. **Wie sollen bestehende QR-Designs migriert werden?**
   - **Empfehlung:** Migration-Script schreiben

5. **Sollen Gästegruppen optional oder required sein?**
   - **Empfehlung:** Optional (Backward-Compatible)

---

## 9. Nächste Schritte

1. ✅ **Datenbank-Schema finalisieren** (siehe `SCHEMA_PROPOSAL.md`)
2. ✅ **Migration-Script schreiben** (JSON → Models)
3. ✅ **Backend API implementieren** (Gästegruppen, Sektionen)
4. ✅ **Frontend UI implementieren** (Designer, Einladungsseite)
5. ✅ **Testing** (Staging → Production)

---

**Status:** ✅ Analyse abgeschlossen  
**Nächster Schritt:** Schema-Proposal finalisieren und Migration-Plan erstellen
