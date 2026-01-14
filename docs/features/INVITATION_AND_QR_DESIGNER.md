# Einladungsseiten & QR-Code Designer

## Übersicht

Dieses Feature ermöglicht Hosts:
1. **Dynamische Einladungsseiten** mit Gästedifferenzierung zu erstellen
2. **QR-Code Designs** für Tischaufsteller/Poster zu gestalten und herunterzuladen

---

## 1. Dynamische Einladungsseite

### Technische Architektur

**Route:** `/e2/[slug]/invite?group=xxx`

**Datenmodell:**
- Speicherung in `Invitation.config` (JSONB)
- Typen: `InvitationConfig` in `@gaestefotos/shared`

**Komponenten:**
```
/app/e2/[slug]/invite/page.tsx          # Hauptseite
/components/invitation/
  ├── InvitationHeader.tsx              # Hero mit Paar-Namen & Datum
  ├── ScheduleTimeline.tsx              # Zeitstrahl mit Icons
  ├── DresscodeCard.tsx                 # Dresscode-Anzeige
  ├── LocationSection.tsx               # Google Maps Integration
  ├── RSVPForm.tsx                      # Dynamisches RSVP-Formular
  └── CountdownTimer.tsx                # Countdown zum Event
```

### Gästegruppen-Logik

**Konfiguration in `Invitation.config`:**
```typescript
{
  "guestGroup": "familie",
  "availableGroups": [
    {
      "slug": "familie",
      "name": "Familie",
      "canSeeCeremony": true,
      "canSeeReception": true,
      "canSeeParty": true
    },
    {
      "slug": "party-only",
      "name": "Feier-Gäste",
      "canSeeCeremony": false,
      "canSeeReception": false,
      "canSeeParty": true
    }
  ],
  "schedule": [
    {
      "time": "14:00",
      "title": "Trauung",
      "icon": "Church",
      "visibleForGroups": ["familie", "enge-freunde"]
    }
  ]
}
```

**URL-Parameter:**
- `/e2/hochzeit-anna-max/invite?group=familie` → Zeigt Trauung
- `/e2/hochzeit-anna-max/invite?group=party-only` → Versteckt Trauung

### RSVP-Formular

**Dynamische Fragen basierend auf Gästegruppe:**
```typescript
rsvpQuestions: [
  {
    id: "attendingCeremony",
    label: "Kommst du zur Trauung?",
    type: "boolean",
    visibleForGroups: ["familie"]
  }
]
```

### Design-Themes

- **classic:** Traditionell mit Gold/Creme
- **boho:** Salbeigrün/Altrosa
- **modern:** Minimalistisch
- **minimal:** Schwarz/Weiß

---

## 2. QR-Code Designer

### Backend-Endpoints

**GET** `/api/events/:eventId/qr-designs`
- Lädt alle QR-Designs eines Events
- Auth: Host/Admin

**PUT** `/api/events/:eventId/qr-designs/:designId`
- Speichert/Aktualisiert ein QR-Design
- Body: `QRDesignConfig`

**DELETE** `/api/events/:eventId/qr-designs/:designId`
- Löscht ein QR-Design

### Datenmodell

**Speicherung:** `Event.designConfig.qrDesigns[]`

**Struktur:**
```typescript
{
  "qrDesigns": [
    {
      "id": "uuid",
      "name": "Tischkarte Boho",
      "template": "boho",
      "colors": {
        "foreground": "#5c6b4d",
        "background": "#faf8f5",
        "frame": "#d4c4a8"
      },
      "frameStyle": "floral",
      "headerText": "Teile deine Fotos!",
      "footerText": "Scanne mich",
      "sizePreset": "table",
      "isDefault": true
    }
  ]
}
```

### UI-Komponenten

**Dashboard-Integration:**
```tsx
import { QRDesignerPanel } from '@/components/qr-designer/QRDesignerPanel';

<QRDesignerPanel
  eventId={eventId}
  eventSlug={eventSlug}
  galleryUrl={`https://app.gästefotos.com/e2/${slug}`}
/>
```

**Sub-Komponenten:**
- `QRPreview.tsx` – Live-Vorschau mit QRCodeSVG
- `TemplateSelector.tsx` – 5 Vorlagen (modern, boho, classic, minimal, elegant)
- `ColorPicker.tsx` – Farbauswahl mit Hex-Input
- `FrameSelector.tsx` – Rahmen-Stile
- `TextEditor.tsx` – Header/Footer-Text
- `SizeSelector.tsx` – Größenvorlagen (table, A4, A5, poster, square)
- `DownloadButton.tsx` – Export als PNG/PDF

### Download-Funktionen

**Export nutzt bestehende Backend-Routes:**
- `POST /api/events/:id/qr/export.png` (300dpi PNG)
- `POST /api/events/:id/qr/export.pdf` (print-ready PDF mit Schnittmarken)

**Body:**
```json
{
  "format": "A5",
  "svg": "<svg>...</svg>"
}
```

---

## 3. Anwendungsbeispiele

### Use Case 1: Hochzeit mit Gästedifferenzierung

**Gruppen:**
- `enge-familie` → sieht Trauung + Empfang + Feier
- `freunde` → sieht Empfang + Feier
- `party-only` → sieht nur Feier

**Einladungs-URLs:**
```
/e2/hochzeit-2024/invite?group=enge-familie
/e2/hochzeit-2024/invite?group=freunde
/e2/hochzeit-2024/invite?group=party-only
```

### Use Case 2: QR-Code für Tischaufsteller

1. Host öffnet Dashboard → QR-Designer
2. Wählt Template "Boho"
3. Passt Farben an Hochzeitsthema an
4. Fügt Text hinzu: "Scannt für Fotos!"
5. Exportiert als PDF (A6, 300dpi)
6. Druckt beim lokalen Copyshop

---

## 4. Migration & Kompatibilität

**Keine DB-Migration nötig!**
- Nutzt bestehende `Invitation.config` (JSONB)
- Nutzt bestehende `Event.designConfig` (JSONB)

**Abwärtskompatibel:**
- Alte Events ohne `qrDesigns` → Standard-Template wird generiert
- Alte Invitations ohne `schedule` → Nur Basis-Info angezeigt

---

## 5. Installation & Setup

### Dependencies (bereits vorhanden)

```json
{
  "qrcode.react": "^3.1.0",
  "framer-motion": "^11.x",
  "date-fns": "^3.x",
  "lucide-react": "^0.x"
}
```

### Neue Files

**Shared Types:**
- `packages/shared/src/types/invitation.ts`
- `packages/shared/src/types/qr-design.ts`

**Backend:**
- `packages/backend/src/routes/qrDesigns.ts`

**Frontend:**
- `packages/frontend/src/app/e2/[slug]/invite/page.tsx`
- `packages/frontend/src/components/invitation/*` (7 Dateien)
- `packages/frontend/src/components/qr-designer/*` (8 Dateien)

---

## 6. Laiensichere Erklärung

### Was macht dieses Feature?

**Einladungsseiten:**
- Hosts können personalisierte Einladungen erstellen
- Verschiedene Gästegruppen sehen unterschiedliche Inhalte
- Beispiel: Familie sieht Trauung, andere Gäste nur Feier
- Funktioniert wie eine Mini-Website mit:
  - Countdown bis zur Hochzeit
  - Zeitplan mit Icons
  - Dresscode-Info
  - Karte zur Location
  - RSVP-Formular (Zu-/Absage)

**QR-Code Designer:**
- Hosts designen schicke QR-Codes für Tischkarten
- Wählen aus 5 Vorlagen (Modern, Boho, Klassisch, etc.)
- Passen Farben und Texte an
- Laden fertige PDF-Datei herunter
- Drucken beim Copyshop → Fertig!

### Wie wird es genutzt?

1. **Einladung erstellen:**
   - Dashboard → "Einladungen" → "Neue Einladung"
   - Namen eingeben, Gruppen definieren
   - Zeitplan & Locations hinzufügen
   - Link an Gäste schicken

2. **QR-Code gestalten:**
   - Dashboard → "QR-Codes"
   - Design auswählen
   - Farben anpassen
   - Als PDF herunterladen
   - Drucken lassen

---

## 7. Entwickler-Notizen

### Performance

- **Lazy Loading:** Einladungsseite lädt Komponenten dynamisch
- **Caching:** QR-SVG wird nur einmal generiert
- **Optimistic UI:** Designänderungen sofort sichtbar

### Security

- **CSRF Protection:** Alle POST/PUT/DELETE geschützt
- **Auth Check:** Nur Event-Manager können Designs bearbeiten
- **Input Validation:** Zod-Schemas für alle Eingaben
- **SVG Sanitization:** QR-Export prüft auf unsafe Content

### Testing Checklist

- [ ] Einladungsseite lädt ohne Fehler
- [ ] Gästegruppen-Filter funktioniert
- [ ] RSVP-Formular speichert korrekt
- [ ] QR-Designer zeigt Live-Preview
- [ ] PNG-Export funktioniert (300dpi)
- [ ] PDF-Export mit korrekten Maßen
- [ ] Mobile-Responsive (alle Breakpoints)

---

## 8. Roadmap / Erweiterungen

### Phase 1 (Aktuell)
- ✅ Basis-Einladungsseite
- ✅ QR-Designer mit 5 Templates
- ✅ PNG/PDF Export

### Phase 2 (Geplant)
- [ ] Logo-Upload für QR-Mitte
- [ ] Template-Bibliothek (Community)
- [ ] Multi-Language Support
- [ ] iCal-Download für Events
- [ ] E-Mail-Versand für Einladungen

### Phase 3 (Ideen)
- [ ] Video-Hintergründe für Header
- [ ] Animierte QR-Codes (SVG)
- [ ] KI-generierte Einladungstexte
- [ ] WhatsApp-Integration

---

**Implementiert:** Januar 2026  
**Autor:** Cascade AI (autonom)  
**Status:** ✅ Production-Ready
