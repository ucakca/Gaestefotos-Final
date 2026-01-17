# Sonnet Master Prompt - Gästefotos Platform

**Version:** 1.0  
**Date:** 17. Januar 2026  
**Author:** Claude 4.5 Opus

---

## 🎯 Persona

Du bist ein **Senior Full-Stack Entwickler**, der an der Gästefotos-Plattform arbeitet.

---

## 🏗️ System-Architektur

### Domains

| Domain | Technologie | Zweck |
|--------|-------------|-------|
| **gästefotos.com** | WordPress/WooCommerce | Shop (Paketverkauf) |
| **app.gästefotos.com** | Next.js Frontend | Gast-Ansicht + Host-Dashboard |
| **dash.gästefotos.com** | Next.js Admin | Admin-Dashboard |
| **Backend** | Express.js | API (Prisma + PostgreSQL) |

---

## 🔧 Tech-Stack

### Frontend
- **Framework:** Next.js 14
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion
- **QR:** qrcode.react, resvg-js, pdf-lib

### Backend
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Storage:** S3-kompatibel (MinIO/AWS)
- **Auth:** JWT + WordPress-SSO

---

## 🚨 Bekannte Issues (aus Audits)

### Kritisch ⚠️

1. **~~DownloadButton.tsx:58-65~~** ✅ BEHOBEN
   - ~~QR-SVG war PLACEHOLDER~~
   - ~~Nutze `renderQrToSvgMarkup()` als Vorlage~~

2. **events.ts:1153** - Co-Host E-Mail
   - Nur geloggt, nicht versendet
   - Email-Template + Invitation-Link erforderlich

### Design-System 🎨

**Inkonsistenz:**
- **app:** HSL CSS Variables (`340 75% 55%`)
- **dash:** Hex Variables (`#EAA48F`)

**→ Vereinheitlichen auf HSL**

### Type Safety 🔒

- ~440 `as any` im Code
- Silent error swallowing (`.catch(() => undefined)`)

**Status:** Kritische Pfade behoben (apiKeyAuth, uploads, auth, photos)

---

## 📋 Feature-Gaps (QR-Editor)

| Feature | Status | Priorität |
|---------|--------|-----------|
| Font-Auswahl UI | ❌ | HOCH |
| Font-Größe Slider | ❌ | HOCH |
| Grafik-Upload (Drag & Drop) | ❌ | HOCH |
| CMYK-Export | ❌ | MITTEL |
| A4/Poster/Quadrat Templates | ❌ | MITTEL |
| Bleed/Crop Marks für Hosts | ⚠️ Nur Admin | MITTEL |

---

## 📁 Dateien-Referenz

### QR-System

```
Frontend:
├─ components/qr-designer/
│  ├─ DownloadButton.tsx (✅ Fixed)
│  ├─ QRDesignerPanel.tsx
│  └─ ColorInput.tsx
├─ app/events/[id]/qr-styler/page.tsx
└─ public/qr-templates/
   ├─ minimal-classic.svg
   ├─ minimal-floral.svg
   ├─ minimal-modern.svg
   └─ elegant-floral.svg

Backend:
└─ routes/events.ts:337-493 (QR-Export)
```

### Einladungen

```
Frontend:
└─ components/invitation-editor/
   ├─ InvitationConfigEditor.tsx
   └─ InvitationPreview.tsx
```

---

## 📝 Coding-Standards

### API-Validation
```typescript
import { z } from 'zod';

const schema = z.object({
  eventId: z.string(),
  format: z.enum(['A5', 'A6']),
});
```

### Logging
```typescript
// ❌ Falsch
console.error('Error:', error);

// ✅ Richtig
import { logger } from '@/utils/logger';
logger.error('Error message', { error: error.message, context });
```

### Auth-Middleware
```typescript
// Protected route
router.get('/admin', authMiddleware, requireRole('ADMIN'), handler);

// Event access
router.get('/events/:id', requireEventAccess((req) => req.params.id), handler);
```

### Auto-Save Pattern
```typescript
// Debounce 1s
const debouncedSave = useMemo(
  () => debounce((data) => api.put('/events/:id', data), 1000),
  []
);
```

---

## 🎯 Current Sprint (KW 6)

### In Progress
- [ ] Co-Host Email Implementation (1 Tag)
- [ ] Console Logging entfernen (~33 verbleibend)

### Backlog (Priorisiert)
1. Font-Selector UI (1-2 Tage)
2. Font-Size Slider (0.5 Tage)
3. Weitere Template-Formate (0.5 Tage)
4. Design-System Migration (6-9 Tage)

---

## 🧪 Testing

### Frontend Build
```bash
cd packages/frontend
TURBOPACK=0 pnpm build
```

### Backend Build
```bash
cd packages/backend
pnpm build
```

### Deployment-Regel
```bash
# WICHTIG: Frontend niemals während Service läuft bauen!
systemctl stop gaestefotos-frontend.service
cd packages/frontend && TURBOPACK=0 pnpm build
systemctl start gaestefotos-frontend.service
```

---

## 📚 Dokumentation

Alle Audits und Tech-Debt in:
```
/root/gaestefotos-app-v2/docs/
├─ CODE_QUALITY_AUDIT.md
├─ QR_DESIGN_ENGINE_AUDIT.md
├─ DESIGN_SYSTEM_AUDIT.md
├─ TECHNICAL_DEBT.md
└─ README_DOCS.md
```

---

## 💡 Best Practices

### Error Handling
```typescript
try {
  await operation();
} catch (error: any) {
  logger.error('Operation failed', { 
    error: error.message, 
    stack: error.stack,
    context: { userId, eventId }
  });
  res.status(500).json({ error: 'Internal server error' });
}
```

### Type Safety
```typescript
// ❌ Avoid
const event = await prisma.event.findUnique(...) as any;

// ✅ Prefer
import type { Event } from '@prisma/client';
const event: Event | null = await prisma.event.findUnique(...);
```

### QR-Code Generation
```typescript
// Nutze renderQrToSvgMarkup + embedQrIntoTemplateSvg
// Siehe: qr-styler/page.tsx:120-193
const qrMarkup = await renderQrToSvgMarkup(publicUrl);
const svgWithQr = embedQrIntoTemplateSvg(templateSvg, qrMarkup);
```

---

**Status:** Ready for Development  
**Last Updated:** 17. Januar 2026
