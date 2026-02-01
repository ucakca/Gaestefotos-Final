# 🏠 Landing Page - CMS Integration

**Implementiert:** 23. Januar 2026  
**Feature:** Editierbare Landing Page via WordPress CMS

---

## 🎯 ÜBERBLICK

Die Landing Page (`/`) ist jetzt CMS-basiert und kann über WordPress aktualisiert werden - genau wie FAQ, Datenschutz, Impressum, und AGB.

### **Wie es funktioniert:**

```
User besucht gästefotos.com
    ↓
Frontend lädt /api/cms/pages/landing
    ↓
CMS Content vorhanden? → Rendert HTML
    ↓
Kein Content? → Zeigt Default Landing Page
```

---

## 📝 TECHNISCHE DETAILS

### **Frontend**
- **File:** `packages/frontend/src/app/page.tsx`
- **API Call:** `GET /api/cms/pages/landing`
- **Fallback:** Default Landing Page mit Hero + Features + CTA

### **Backend**
- **Route:** `/api/cms/pages/landing` (bereits vorhanden via `:slug`)
- **DB:** `cms_content_snapshots` (kind='pages', slug='landing')

### **Aktualisierung**
1. **WordPress:** Seite "Landing" erstellen/bearbeiten
2. **Admin Dashboard:** CMS Sync → "landing" Page syncen
3. **Frontend:** Auto-Update beim nächsten Reload

---

## 🎨 DEFAULT LANDING PAGE

**Wenn kein CMS Content vorhanden:**
- Hero Section mit Value Proposition
- Feature Grid (3 Spalten):
  - 📸 Upload & Moderation
  - 🎨 Kategorien & Alben  
  - 💾 Download & Teilen
- Call-to-Action Section
- Buttons: "Jetzt kostenlos starten" + "Login"

**Design:**
- Dark Theme (bg-app-bg)
- Responsive Layout
- Design Tokens (Theme System v1)

---

## 🔄 AKTUALISIERUNG (Für Admins)

### **Option 1: Via WordPress CMS**

1. **WordPress:** Neue Seite erstellen
   - Slug: `landing`
   - Titel: "Willkommen bei gästefotos"
   - Content: HTML/Gutenberg Editor

2. **Admin Dashboard:** CMS Sync Tool öffnen
   - URL: `/admin/cms-sync`
   - Sync: "pages/landing"

3. **Fertig!** Frontend zeigt neuen Content

### **Option 2: Direkt in DB (Advanced)**

```sql
INSERT INTO cms_content_snapshots (
  kind, slug, title, html, source_url, fetched_at
) VALUES (
  'pages',
  'landing', 
  'Willkommen',
  '<div>Dein HTML hier</div>',
  'https://example.com',
  NOW()
);
```

---

## 🌍 LOKALISIERUNG

HTML-Links zu anderen CMS-Seiten werden automatisch lokalisiert:
- `https://gästefotos.com/faq/` → `/faq`
- `https://gästefotos.com/datenschutz/` → `/datenschutz`

**Funktion:** `localizeCmsHtml()` in `page.tsx`

---

## ✅ VORTEILE

1. **Editierbar:** Admins können Landing Page ohne Code ändern
2. **Versioniert:** CMS Snapshots in DB gespeichert
3. **Fallback:** Default Page falls CMS nicht verfügbar
4. **Cache:** ETag + Cache-Control für Performance
5. **Konsistent:** Gleiche Infrastruktur wie FAQ/Datenschutz

---

## 🚀 DEPLOYMENT

**Keine zusätzlichen Schritte nötig!**
- Backend Route existiert bereits (`:kind/:slug`)
- Frontend Build und Deploy wie gewohnt
- CMS Sync im Admin Dashboard verfügbar

---

## 📊 BEISPIEL CMS CONTENT

```html
<div class="landing-hero">
  <h1>Event-Fotos professionell teilen</h1>
  <p>Die All-in-One Lösung für Hochzeiten und Events</p>
  <a href="/register" class="cta-button">Jetzt starten</a>
</div>

<div class="features">
  <div class="feature">
    <h3>📸 Upload & Moderation</h3>
    <p>Volle Kontrolle über alle Fotos</p>
  </div>
  <!-- mehr Features -->
</div>
```

---

## 🔗 RELATED FILES

- Frontend: `packages/frontend/src/app/page.tsx`
- Backend: `packages/backend/src/routes/cmsPublic.ts`
- Schema: `packages/backend/prisma/schema.prisma` (CmsContentSnapshot)
- Similar: `packages/frontend/src/app/faq/page.tsx`

---

## 📝 HINWEISE

**CSS Styling:**
- CMS Content nutzt `prose prose-invert` (Tailwind Typography)
- Custom Styles können inline im HTML sein
- Design Tokens für Konsistenz empfohlen

**SEO:**
- Title und Meta-Tags sollten im CMS HTML sein
- `<title>` wird automatisch verwendet
- Strukturierte Daten können hinzugefügt werden

---

**Dokumentation erstellt:** 23. Januar 2026  
**Letzte Aktualisierung:** 23. Januar 2026
