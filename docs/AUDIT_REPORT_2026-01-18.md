# AUDIT REPORT - 18.01.2026 10:57 Uhr

**Geprüft von:** Cascade (basierend auf Opus Audit-Request)  
**Status:** Re-Audit nach Admin Dashboard Implementation

---

## EXECUTIVE SUMMARY

**Kritische Issues korrigiert:** 2/3 ✅  
**Neue kritische Issues gefunden:** 1 🔴  
**Code-Qualität Issues:** Bestätigt 🟡

---

## DIE "SÜNDENLISTE" (Kritisch) - AKTUALISIERT

| # | Issue | Datei | Status | Details |
|---|-------|-------|--------|---------|
| **S-001** | ~~DownloadButton PLACEHOLDER~~ | ~~qr-designer/DownloadButton.tsx:58-65~~ | ✅ **GEFIXT** | Echter QR-Code wird generiert (Zeile 23-29) |
| **S-002** | ~~Co-Host E-Mail TODO~~ | ~~events.ts:1153~~ | ✅ **GEFIXT** | `emailService.sendCohostInvite()` vollständig implementiert |
| **S-003** | Passwort vergessen | Redirect zu WordPress (wp-login.php) | 🟡 **Workaround** | Architektur-Entscheidung beibehalten |
| **S-004** | Registrierung | "Bitte auf gästefotos.com anlegen" (extern) | 🟡 **Architektur** | Externe Registrierung gewollt |
| **S-005** | ~440 as any | Verteilt über Backend + Frontend | 🟡 **Code-Qualität** | 438 Vorkommen im eigenen Code |
| **S-006** | Kein beforeunload | QR-Styler/Editor - kein Dirty-Warning | 🟡 **UX** | Nicht implementiert |
| **S-007** | **Font-UI nicht integriert** | **QRDesignerPanel.tsx** | 🔴 **NEU KRITISCH** | Komponenten existieren, aber nicht verwendet |

---

## DETAILLIERTE FINDINGS

### ✅ S-001: DownloadButton PLACEHOLDER (GEFIXT)

**Status vor Audit:** 🔴 KRITISCH - Placeholder statt echtem QR  
**Status nach Audit:** ✅ GEFIXT

**Beweis:**
```typescript
// packages/frontend/src/components/qr-designer/DownloadButton.tsx:23-29
const publicUrl = `${window.location.origin}/e/${eventSlug}`;
const qrMarkup = await renderQrToSvgMarkup(publicUrl);

// Load template SVG and embed QR code
const templateSvg = await loadTemplateSvg(config);
const svg = embedQrIntoTemplateSvg(templateSvg, qrMarkup);
```

**Implementierung:**
- `renderQrToSvgMarkup()` nutzt `qrcode.react` (QRCodeSVG)
- `embedQrIntoTemplateSvg()` ersetzt `gf:qr` Placeholder in Template
- Backend-Export via `/api/events/:id/qr/export.{pdf|png}`

**Kein Placeholder mehr vorhanden** ✅

---

### ✅ S-002: Co-Host E-Mail TODO (GEFIXT)

**Status vor Audit:** 🔴 OFFEN - nur Logger, kein Versand  
**Status nach Audit:** ✅ GEFIXT

**Beweis:**
```typescript
// packages/backend/src/routes/events.ts:1149-1156
await emailService.sendCohostInvite({
  to: email,
  eventTitle: event.title,
  inviteUrl,
  eventSlug: event.slug || '',
  hostName,
});
logger.info('Co-host invite email sent', { eventId: event.id, email });
```

**Implementierung:**
```typescript
// packages/backend/src/services/email.ts:106-132
async sendCohostInvite(options: {
  to: string;
  eventTitle: string;
  inviteUrl: string;
  hostName?: string;
  eventSlug: string;
}) {
  if (!this.transporter || !this.config) {
    throw new Error('Email-Service nicht konfiguriert');
  }

  const tpl = await this.getActiveTemplate('COHOST_INVITE');
  // Template-basierter Versand oder Fallback-HTML
  // Vollständig implementiert mit try/catch
}
```

**Funktionalität:**
- Template-Support (`COHOST_INVITE`)
- Fallback-HTML vorhanden
- Error-Handling implementiert
- Logger nach erfolgreichem Versand

**E-Mail wird versendet** ✅

---

### 🔴 S-007: Font-UI nicht integriert (NEU KRITISCH)

**Status:** 🔴 KRITISCH - Komponenten vorhanden, aber nicht genutzt

**Problem:**
Zwei fertige UI-Komponenten existieren, werden aber in `QRDesignerPanel.tsx` nicht verwendet:

**Vorhandene Komponenten:**

1. **FontSelector.tsx** (34 Zeilen)
   ```typescript
   export function FontSelector({ value, onChange }: FontSelectorProps) {
     return (
       <Select value={value} onValueChange={(v) => onChange(v as QRFont)}>
         {Object.entries(QR_FONTS).map(([key, font]) => (
           <SelectItem key={key} value={key} style={{ fontFamily: font.fontFamily }}>
             {font.name}
           </SelectItem>
         ))}
       </Select>
     );
   }
   ```

2. **FontSizeSlider.tsx** (37 Zeilen)
   ```typescript
   export function FontSizeSlider({ value, onChange, min = 12, max = 96 }) {
     return (
       <input type="range" min={min} max={max} value={value}
         onChange={(e) => onChange(Number(e.target.value))}
       />
     );
   }
   ```

**In QRDesignerPanel.tsx verwendet:**
- ❌ FontSelector - NICHT importiert, NICHT verwendet
- ❌ FontSizeSlider - NICHT importiert, NICHT verwendet

**In QRDesignerPanel.tsx TATSÄCHLICH verwendet (Zeilen 145-180):**
- ✅ TemplateSelector
- ✅ ColorPicker
- ✅ FrameSelector
- ✅ TextEditor
- ✅ SizeSelector

**Auswirkung:**
- User kann keine Schriftart auswählen (nur Template-Default)
- User kann keine Schriftgröße anpassen (nur hardcoded Werte)
- `config.font` und `config.fontSize` werden zwar in `DownloadButton.tsx` verwendet, aber nicht editierbar

**Empfohlene Lösung:**
Integration in `QRDesignerPanel.tsx` nach Zeile 175 (nach `TextEditor`):

```typescript
import { FontSelector } from './FontSelector';
import { FontSizeSlider } from './FontSizeSlider';

// ... in render():
<FontSelector
  value={activeDesign.font || 'sans'}
  onChange={(font) => setActiveDesign({ ...activeDesign, font })}
/>

<FontSizeSlider
  value={activeDesign.fontSize || 24}
  onChange={(fontSize) => setActiveDesign({ ...activeDesign, fontSize })}
/>
```

---

### 🟡 S-005: ~440 as any (Code-Qualität)

**Status:** 🟡 Bestätigt - 438 Vorkommen im eigenen Code

**Top-Sünder:**
- `packages/backend/src/routes/events.ts` - 58 matches
- `packages/backend/src/routes/guestbook.ts` - 43 matches
- `packages/frontend/src/components/ModernPhotoGrid.tsx` - 40 matches
- `packages/backend/src/routes/videos.ts` - 32 matches
- `packages/backend/src/routes/woocommerceWebhooks.ts` - 25 matches

**Typische Patterns:**
```typescript
// Error-Handling
} catch (err: any) {
  logger.error('...', { error: err.message });
}

// Prisma _count
const photoCount = event._count?.photos || 0;

// DOM-Manipulation
(element as any).setAttribute('fill', 'transparent');
```

**Empfehlung:**
- Phase 1: Error-Types definieren (`type ApiError = { message: string; code?: string }`)
- Phase 2: Prisma-Types explizit (`Prisma.EventGetPayload<{include: {_count: true}}>`)
- Phase 3: DOM-Types korrekt (`(element as SVGRectElement).setAttribute(...)`)

**Priorität:** Niedrig - Funktioniert, aber Code-Qualität leidet

---

### 🟡 S-006: Kein beforeunload (UX)

**Status:** 🟡 Nicht implementiert - kein Dirty-State Warning

**Geprüft:**
- QR-Designer: ❌ Kein beforeunload
- Invitation Editor: ❌ Kein beforeunload
- Event Settings: ❌ Kein beforeunload

**Auswirkung:**
- User kann versehentlich Browser schließen
- Ungespeicherte Änderungen gehen verloren
- Keine Warnung beim Verlassen der Seite

**Empfehlung:**
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isDirty]);
```

**Priorität:** Mittel - UX-Verbesserung, nicht kritisch

---

## ROLLEN-MATRIX CHECK ✅

**Status:** ✅ Alle Checks bestanden

| Feature | Gast | Host | Admin | Status |
|---------|------|------|-------|--------|
| Event betrachten (öffentlich) | ✅ | ✅ | ✅ | ✅ OK |
| Fotos hochladen | ✅ (mit Code) | ✅ | ✅ | ✅ OK |
| Event bearbeiten | ❌ | ✅ (eigene) | ✅ (alle) | ✅ OK |
| Admin-Dashboard | ❌→Redirect | ❌→Dashboard | ✅ | ✅ OK |
| URL-Manipulation /admin | ❌ Redirect | ❌ Redirect | ✅ | ✅ OK |
| requireRole Backend | ✅ 403 | ✅ 403 | ✅ | ✅ OK |

**Implementierung:**
```typescript
router.get('/endpoint', 
  authMiddleware,           // JWT-Validierung
  requireRole('ADMIN'),     // Rollen-Check
  async (req: AuthRequest, res: Response) => { ... }
);
```

**Frontend Guards:**
```typescript
if (!user || user.role !== 'ADMIN') {
  redirect('/dashboard');
}
```

**Bewertung:** ✅ Sauber implementiert, keine Sicherheitslücken

---

## DESIGN-INSPEKTION ⚠️

**Status:** ⚠️ Inkonsistenzen bestätigt

| Aspekt | app.gästefotos | dash.gästefotos | Status |
|--------|----------------|-----------------|--------|
| Farbformat | HSL (340 75% 55%) | Hex (#EAA48F) | ⚠️ Inkonsistent |
| Dark Mode | Vollständig .dark | @media prefers-color-scheme | ⚠️ Unterschiedlich |
| Akzentfarbe | Rose/Pink | Peach/Pfirsich | ⚠️ Visuell anders |
| Design-System | Tailwind + Custom | Tailwind + Custom | ✅ Basis gleich |
| Toast Notifications | Sonner/Custom | ✅ vorhanden | ✅ OK |

**Empfehlung:**
- Shared Design-Tokens in `@gaestefotos/shared` definieren
- HSL-Format überall verwenden (bessere Dark-Mode-Unterstützung)
- Akzentfarbe vereinheitlichen (Rose vs. Peach)

**Priorität:** Mittel - Betrifft Brand Consistency

---

## TECHNISCHE BELASTBARKEIT ✅

**Status:** ✅ Alle Checks bestanden

| Prüfpunkt | Status | Details |
|-----------|--------|---------|
| Race Conditions (Likes) | ✅ | `@@unique([photoId, ipAddress])` in Prisma |
| Race Conditions (Votes) | ✅ | `@@unique([photoId, ipAddress])` |
| Daten-Löschung (Event) | ✅ | `retentionPurge.ts` löscht Storage + DB cascade |
| Webhook Idempotenz | ✅ | WooCommerce payload-hash + DB-Check |
| Webhook Signatur | ✅ | HMAC-SHA256 Validierung |
| Loading States | ✅ | `disabled={loading}` Pattern vorhanden |
| console.log im Backend | ✅ | 0 Treffer - nutzt Logger |

**Keine kritischen Probleme gefunden** ✅

---

## FEATURE-GAPS (noch offen)

| Feature | Status | Priorität |
|---------|--------|-----------|
| **Font-Auswahl UI** | 🔴 **FEHLT** | **HOCH** |
| **Font-Größe Slider** | 🔴 **FEHLT** | **HOCH** |
| A4/Poster/Quadrat Templates | ❌ FEHLT (nur A5, A6) | Mittel |
| CMYK Export | ❌ FEHLT | Niedrig |
| Dirty-State Warning | ❌ FEHLT | Mittel |
| Native Passwort-Reset | ❌ Extern (WordPress) | Niedrig |

**Anmerkung zu Font-UI:**
- Komponenten **existieren bereits** (`FontSelector.tsx`, `FontSizeSlider.tsx`)
- Nur Integration in `QRDesignerPanel.tsx` fehlt
- **Quick-Win:** ~5 Zeilen Code zum Einbinden

---

## REFACTORING-PLAN (Priorisiert)

### Prio 1 (Kritisch) - SOFORT

1. ✅ ~~DownloadButton.tsx - echten QR generieren~~ **BEREITS GEFIXT**
2. ✅ ~~Co-Host E-Mail implementieren mit emailService~~ **BEREITS GEFIXT**
3. 🔴 **Font-UI integrieren in QRDesignerPanel.tsx** ← **NEU KRITISCH**

### Prio 2 (Code-Qualität) - Diese Woche

4. ~440 as any → Proper Types (sukzessive)
5. Design-System vereinheitlichen (HSL überall)
6. beforeunload Warning im Editor

### Prio 3 (Features) - Next Sprint

7. A4/Poster Templates erweitern
8. CMYK Export implementieren
9. Native Passwort-Reset (wenn WordPress-Abhängigkeit entfernt werden soll)

---

## EMPFOHLENE NÄCHSTE SCHRITTE

### Immediate Action (heute)

**1. Font-UI Integration (30 Min)**
```typescript
// packages/frontend/src/components/qr-designer/QRDesignerPanel.tsx

// Add imports:
import { FontSelector } from './FontSelector';
import { FontSizeSlider } from './FontSizeSlider';

// Add after TextEditor (around line 175):
<FontSelector
  value={activeDesign.font || 'sans'}
  onChange={(font) => setActiveDesign({ ...activeDesign, font })}
/>

<FontSizeSlider
  value={activeDesign.fontSize || 24}
  onChange={(fontSize) => setActiveDesign({ ...activeDesign, fontSize })}
/>
```

### Short-term (diese Woche)

**2. beforeunload Hook (1h)**
- Dirty-State Tracking in QRDesignerPanel
- Dirty-State Tracking in InvitationEditor
- beforeunload Event-Handler

**3. Design-System Audit (2h)**
- HSL-Konvertierung für alle Hex-Farben
- Shared Design-Tokens definieren
- Dark-Mode-Strategie vereinheitlichen

### Medium-term (nächste 2 Wochen)

**4. Type-Safety Improvements (sukzessive)**
- Error-Types definieren (`ApiError`, `ValidationError`)
- Prisma-Types explizit nutzen
- DOM-Types korrekt casten

---

## FAZIT

**Positive Findings:**
- ✅ 2 kritische Issues bereits gefixt (DownloadButton, Co-Host Email)
- ✅ Sicherheit/Auth robust implementiert
- ✅ Technische Belastbarkeit gegeben
- ✅ Keine Race Conditions

**Kritische Findings:**
- 🔴 Font-UI existiert, aber nicht integriert (Quick-Win!)
- 🟡 440+ as any (Code-Qualität)
- 🟡 Kein Dirty-State Warning (UX)
- ⚠️ Design-Inkonsistenzen

**Overall Status:** 🟢 Gut - Nur 1 neues kritisches Issue gefunden (Font-UI), aber leicht zu fixen

**Next Action:** Font-UI Integration als Priorität 1

---

**Report erstellt:** 18.01.2026 10:57 Uhr  
**Geprüft von:** Cascade  
**Basis:** Opus Audit + Eigene Code-Inspektion  
**Dateien geprüft:** 15+ Dateien, 2000+ Zeilen Code
