# QR-Wizard Logo-Upload Guide

## 🎯 Feature-Übersicht

Der QR-Wizard ermöglicht das Hochladen eines **eigenen Logos** in den QR-Code für professionelle, gebrandete QR-Aufsteller.

---

## ✅ Backend Status

**Implementiert:** ✅ Vollständig funktionsfähig

### **API Endpoints**

#### **1. Logo hochladen**
```http
POST /api/events/:eventId/qr/logo
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
  logo: <file>
```

**Response:**
```json
{
  "logoUrl": "https://storage.gaestefotos.com/events/abc123/qr-logo-xyz.png"
}
```

#### **2. Logo löschen**
```http
DELETE /api/events/:eventId/qr/logo
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true
}
```

---

## 🧪 Test-Anleitung

### **Voraussetzungen**

1. ✅ Event erstellt
2. ✅ Als Host oder Admin eingeloggt
3. ✅ Logo-Datei bereit (PNG, JPG, SVG)
   - Max. 5MB
   - Empfohlen: 512x512px, transparent PNG
   - Quadratisches Format für besten Look

### **Schritt 1: QR-Wizard öffnen**

1. Login auf `https://gästefotos.com/login`
2. Event auswählen
3. Navigiere zu: **QR-Code Designer**
   - URL: `/events/{eventId}/qr-styler`

### **Schritt 2: Logo hochladen**

1. **Wizard durchlaufen:**
   - Step 1: Link URL verifizieren
   - Step 2: Text & Layout wählen
   - Step 3: Design & Export

2. **Logo-Upload Sektion:**
   - Scroll zu "Logo im QR-Code (optional)"
   - Button: **"Logo hochladen"**
   - Datei auswählen (PNG/JPG/SVG)

3. **Vorschau:**
   - Logo erscheint in Preview-Box
   - QR-Code wird live aktualisiert mit Logo-Overlay

### **Schritt 3: QR-Code exportieren**

1. **Farben anpassen** (optional):
   - Background, Text, Accent
   - Presets verfügbar

2. **Download:**
   - **PNG:** Druckqualität (300dpi)
   - **PDF:** Druckerei-Format mit Bleed
   - **SVG:** Vektor für Weiterbearbeitung

3. **Logo wird eingebettet:**
   - Automatisch zentriert im QR-Code
   - Safe Zone wird respektiert
   - Lesbarkeit bleibt erhalten

---

## 🔧 Backend Implementation Details

### **Datei-Upload Flow**

```typescript
// packages/backend/src/routes/events.ts:468

router.post('/:id/qr/logo', 
  authMiddleware, 
  uploadSingleDesignImage('logo'), 
  async (req: AuthRequest, res: Response) => {
    // 1. Access Check
    const event = await requireEventEditAccess(req, res, eventId);
    
    // 2. File Validation
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // 3. Storage Service Upload
    const logoUrl = await storageService.uploadFile(
      eventId, 
      req.file.originalname, 
      req.file.buffer, 
      req.file.mimetype
    );
    
    // 4. Database Update
    await prisma.qrDesign.upsert({
      where: { eventId },
      create: { eventId, logoUrl },
      update: { logoUrl },
    });
    
    return res.json({ logoUrl });
});
```

### **Storage Service**

**Verwendet:** SeaweedFS (distributed file storage)

**Pfad-Struktur:**
```
/events/{eventId}/qr-logo-{timestamp}-{hash}.{ext}
```

**Beispiel:**
```
/events/cm3abc123/qr-logo-1706034567-a3b2c1.png
```

### **Multer Middleware**

```typescript
// packages/backend/src/middleware/upload.ts

export function uploadSingleDesignImage(fieldName: string) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 1
    },
    fileFilter: (req, file, cb) => {
      const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
      if (!allowed.includes(file.mimetype)) {
        return cb(new Error('Nur PNG, JPG, SVG erlaubt'));
      }
      cb(null, true);
    }
  }).single(fieldName);
}
```

---

## 🎨 Frontend Component

### **LogoUpload Component**

**Datei:** `packages/frontend/src/components/qr-designer/LogoUpload.tsx`

**Features:**
- ✅ Drag & Drop (optional via native file input)
- ✅ Preview nach Upload
- ✅ Remove Button
- ✅ Validierung: Typ & Größe
- ✅ Error Handling
- ✅ Loading States

**Props:**
```typescript
interface LogoUploadProps {
  eventId: string;
  logoUrl?: string | null;
  onLogoChange?: (url: string | null) => void;
  disabled?: boolean;
}
```

**Usage:**
```tsx
<LogoUpload
  eventId={eventId}
  logoUrl={logoUrl}
  onLogoChange={setLogoUrl}
  disabled={false}
/>
```

---

## 🧪 Manuelle Tests

### **Test 1: Upload PNG Logo**

```bash
# 1. Test-Logo herunterladen
curl -o test-logo.png https://via.placeholder.com/512

# 2. Upload via API
curl -X POST https://gästefotos.com/api/events/YOUR_EVENT_ID/qr/logo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "logo=@test-logo.png"

# Expected Response:
# {
#   "logoUrl": "https://storage.gaestefotos.com/events/.../qr-logo-....png"
# }
```

### **Test 2: Logo im QR-Code verifizieren**

1. Öffne QR-Styler: `/events/YOUR_EVENT_ID/qr-styler`
2. Navigiere zu Step 3
3. **Check Preview:** Logo sollte im QR-Code sichtbar sein
4. **Download PNG:** Logo sollte im Export enthalten sein

### **Test 3: Logo löschen**

```bash
curl -X DELETE https://gästefotos.com/api/events/YOUR_EVENT_ID/qr/logo \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected:
# { "success": true }
```

### **Test 4: Datei-Validierung**

**Upload zu große Datei (>5MB):**
```bash
# Sollte fehlschlagen mit 400 Error
curl -X POST https://gästefotos.com/api/events/YOUR_EVENT_ID/qr/logo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "logo=@large-file-10mb.png"

# Expected:
# { "error": "Datei zu groß (max. 5MB)" }
```

**Falscher Dateityp (z.B. PDF):**
```bash
curl -X POST https://gästefotos.com/api/events/YOUR_EVENT_ID/qr/logo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "logo=@document.pdf"

# Expected:
# { "error": "Nur PNG, JPG und SVG Dateien erlaubt" }
```

---

## 🎯 Best Practices

### **Logo-Design Empfehlungen**

1. **Format:** PNG mit Transparenz
2. **Größe:** 512x512px (wird automatisch skaliert)
3. **Farben:** Kontrast zum QR-Code Background beachten
4. **Einfachheit:** Klare, erkennbare Logos funktionieren am besten
5. **Dateigröße:** <500KB für schnelle Uploads

### **QR-Code Lesbarkeit**

⚠️ **Wichtig:** Logo darf nicht zu groß sein!

**Safe Zone:**
- Logo nimmt max. 20% der QR-Code Fläche ein
- Automatisch zentriert
- Error Correction Level: HIGH (30% redundant)

**Test:**
- QR-Code mit verschiedenen Scanner-Apps testen
- Auch bei schlechten Lichtverhältnissen prüfen

### **Performance**

**Upload Optimierung:**
```typescript
// Frontend: Bild vor Upload komprimieren (optional)
const compressImage = async (file: File): Promise<Blob> => {
  const img = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(512, 512);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 512, 512);
  return await canvas.convertToBlob({ type: 'image/png', quality: 0.9 });
};
```

---

## 🐛 Troubleshooting

### **Problem: Logo wird nicht angezeigt**

**Mögliche Ursachen:**
1. ❌ Upload fehlgeschlagen
2. ❌ Storage Service nicht erreichbar
3. ❌ CORS-Fehler beim Laden

**Debug:**
```bash
# 1. Check QR Design in DB
psql -d gaestefotos -c "SELECT * FROM qr_designs WHERE event_id = 'YOUR_EVENT_ID';"

# 2. Check Storage URL
curl -I https://storage.gaestefotos.com/events/.../qr-logo-....png

# 3. Frontend Console
# → DevTools → Network → Check failed requests
```

### **Problem: Upload bricht ab**

**Check:**
1. File size > 5MB?
2. Netzwerk-Timeout?
3. Backend Service running?

```bash
systemctl status gaestefotos-backend
journalctl -u gaestefotos-backend -n 50
```

### **Problem: Logo verpixelt im Export**

**Ursache:** Logo zu klein

**Fix:**
- Mindestens 512x512px nutzen
- Oder SVG Format (Vektor)

---

## 📊 Monitoring

### **Logo Upload Metrics**

```sql
-- Upload Statistik
SELECT 
  COUNT(*) as total_uploads,
  COUNT(DISTINCT event_id) as events_with_logo,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_update_time
FROM qr_designs
WHERE logo_url IS NOT NULL;
```

### **Storage Usage**

```bash
# SeaweedFS Volume Status
curl http://localhost:9333/vol/status
```

---

## 🚀 Erweiterungen (Optional)

### **Feature Requests**

1. **Logo Position:** Nicht nur zentral, sondern auch Ecken
2. **Logo Größe:** User-definierter Skalierungsfaktor
3. **Logo Effekte:** Rahmen, Schatten, Rotation
4. **Multiple Logos:** Brand + Partner Logos
5. **Template Gallery:** Vorgefertigte Logo-Layouts

### **Implementation Beispiel: Logo Position**

```typescript
// Backend: QR Config erweitern
interface QRDesignConfig {
  // ...existing
  logoPosition?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoScale?: number; // 0.1 - 0.3
}

// Frontend: QR Rendering
const logoPosition = config.logoPosition || 'center';
const logoOffsets = {
  center: { x: '50%', y: '50%' },
  'top-left': { x: '15%', y: '15%' },
  // ...
};
```

---

## ✅ Test-Checkliste

- [ ] Backend API `/qr/logo` funktioniert
- [ ] Upload PNG (< 5MB) erfolgreich
- [ ] Upload JPG erfolgreich
- [ ] Upload SVG erfolgreich
- [ ] Validierung: File > 5MB wird rejected
- [ ] Validierung: PDF wird rejected
- [ ] Logo erscheint in Frontend Preview
- [ ] Logo wird in PNG Export eingebettet
- [ ] Logo wird in PDF Export eingebettet
- [ ] Logo wird in SVG Export eingebettet
- [ ] QR-Code bleibt scanbar mit Logo
- [ ] Delete Logo funktioniert
- [ ] Error Handling zeigt korrekte Meldungen
- [ ] Loading States funktionieren
- [ ] Mobile Upload funktioniert

---

## 📞 Support & Dokumentation

**Verwandte Docs:**
- `docs/LANDING_PAGE_CMS.md` - CMS Integration
- `docs/DATERANGEFILTER_FEATURE.md` - Filter Feature
- `packages/frontend/src/components/qr-designer/` - QR Components

**API Referenz:**
- `POST /api/events/:id/qr/logo` - Upload
- `DELETE /api/events/:id/qr/logo` - Delete
- `GET /api/events/:id/qr/config` - Config abrufen

**Logs:**
```bash
# Backend Logs
journalctl -u gaestefotos-backend -f | grep "Logo upload"

# Frontend Logs
journalctl -u gaestefotos-frontend -f
```

---

**Ready to upload! 📸**
