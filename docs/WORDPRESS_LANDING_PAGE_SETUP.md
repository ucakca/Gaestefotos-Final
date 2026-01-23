# WordPress Landing Page Setup Guide

## 🎯 Ziel
Eine editierbare Landing Page für **gästefotos.com** im WordPress CMS erstellen, die automatisch in die Next.js App synchronisiert wird.

---

## 📋 Voraussetzungen

- ✅ WordPress Admin-Zugang
- ✅ CMS Sync Tool funktioniert
- ✅ Frontend läuft auf Production

---

## 🔧 Schritt-für-Schritt Anleitung

### **1. WordPress Seite erstellen**

1. **Login:** WordPress Admin Dashboard öffnen
   - URL: `https://gästefotos.com/wp-admin`
   
2. **Neue Seite:** 
   - Menü: **Seiten** → **Erstellen**
   - Titel: `Landing Page` (oder beliebig)
   
3. **Slug setzen (WICHTIG!):**
   - Rechte Sidebar: **Permalink**
   - URL-Slug: `landing` (exakt so!)
   - ⚠️ **Der Slug MUSS `landing` sein**, sonst findet die App die Seite nicht

### **2. Inhalt gestalten**

**Empfohlene Struktur:**

```html
<!-- Hero Section -->
<div class="hero">
  <h1>📸 Gästefotos - Deine Hochzeitsfotos live!</h1>
  <p>Upload. Share. Celebrate. Alle Hochzeitsfotos an einem Ort.</p>
  <a href="/register" class="cta-button">Jetzt kostenlos starten</a>
</div>

<!-- Features Section -->
<div class="features">
  <h2>Warum Gästefotos?</h2>
  
  <div class="feature">
    <h3>🚀 Blitzschneller Upload</h3>
    <p>Gäste laden Fotos direkt vom Smartphone hoch - ohne App!</p>
  </div>
  
  <div class="feature">
    <h3>🔒 Sicher & Privat</h3>
    <p>DSGVO-konform gehostet in Deutschland.</p>
  </div>
  
  <div class="feature">
    <h3>🎨 Individuell gestaltbar</h3>
    <p>QR-Codes mit deinem Logo und deinen Farben.</p>
  </div>
</div>

<!-- CTA Section -->
<div class="cta">
  <h2>Bereit für deine perfekte Hochzeit?</h2>
  <a href="/create-event" class="cta-button">Event erstellen</a>
  <a href="/faq" class="cta-button-secondary">FAQ ansehen</a>
</div>
```

**Design-Tipps:**
- Nutze den WordPress Block Editor
- **Gutenberg Blocks:** Spalten, Hero, Call-to-Action
- **Plugins (optional):** Elementor, Beaver Builder für WYSIWYG
- **Bilder:** Hochauflösende Hochzeitsfotos (max. 2MB)

### **3. Veröffentlichen**

1. **Vorschau:** Klick auf "Vorschau" → Überprüfen
2. **Veröffentlichen:** Button oben rechts
3. **Status:** Sicherstellen dass Status = "Veröffentlicht" ist

---

## 🔄 CMS Sync durchführen

### **Methode 1: Admin Dashboard (Empfohlen)**

1. Login auf `https://gästefotos.com/login` als Admin
2. Navigiere zu: **Dashboard** → **CMS Sync**
3. Klick auf: **"WordPress Content synchronisieren"**
4. Warte auf: ✅ Success-Meldung

### **Methode 2: Backend API Call**

```bash
# Als Admin authentifiziert
curl -X POST https://gästefotos.com/api/cms/sync \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### **Methode 3: Automatisch (Cronjob)**

Bereits eingerichtet:
```bash
# Läuft automatisch alle 4 Stunden
0 */4 * * * curl -X POST http://localhost:8001/api/cms/sync
```

---

## ✅ Überprüfung

### **1. CMS Snapshot prüfen**

**API Call:**
```bash
curl https://gästefotos.com/api/cms/pages/landing | jq
```

**Erwartete Response:**
```json
{
  "kind": "pages",
  "slug": "landing",
  "title": "Landing Page",
  "html": "<div class=\"hero\">...</div>",
  "sourceUrl": "https://gästefotos.com/landing",
  "fetchedAt": "2026-01-23T18:00:00.000Z"
}
```

### **2. Frontend testen**

1. Öffne: `https://gästefotos.com/`
2. **Erwartung:** Dein WordPress Content wird angezeigt
3. **Fallback:** Falls kein Content → Default Landing Page mit Hero + Features

---

## 🎨 Styling & Customization

### **WordPress Theme anpassen**

Die Landing Page übernimmt automatisch das Frontend-Styling via `localizeCmsHtml()`:

**Unterstützte CSS Classes:**
```css
.hero { /* Hero Section */ }
.features { /* Feature Grid */ }
.feature { /* Single Feature */ }
.cta { /* Call-to-Action */ }
.cta-button { /* Primary Button */ }
.cta-button-secondary { /* Secondary Button */ }
```

**Farben (Design Tokens):**
- `--app-bg`: Background
- `--app-fg`: Text
- `--app-accent`: Accent Color
- `--app-card`: Card Background

### **Custom CSS hinzufügen**

**In WordPress:**
1. Design → Customizer → Zusätzliches CSS
2. Oder nutze ein Child Theme

**Beispiel:**
```css
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 4rem 2rem;
  text-align: center;
  color: white;
}

.cta-button {
  background: var(--app-accent);
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  text-decoration: none;
  display: inline-block;
  font-weight: 600;
}
```

---

## 🔗 Interne Links

**Automatische Umschreibung:**

WordPress-Links werden automatisch lokalisiert:
```html
<!-- WordPress -->
<a href="https://gästefotos.com/faq">FAQ</a>

<!-- Frontend (automatisch) -->
<a href="/faq">FAQ</a>
```

**Wichtige Links:**
- `/login` - Login
- `/register` - Registrierung
- `/create-event` - Event erstellen
- `/faq` - FAQ
- `/datenschutz` - Datenschutz
- `/impressum` - Impressum

---

## 🐛 Troubleshooting

### **Problem: Landing Page zeigt Fallback statt WordPress Content**

**Ursachen:**
1. ❌ Slug ist nicht `landing`
2. ❌ Seite ist nicht veröffentlicht
3. ❌ CMS Sync noch nicht ausgeführt
4. ❌ WordPress API nicht erreichbar

**Lösung:**
```bash
# 1. Slug prüfen
curl https://gästefotos.com/wp-json/wp/v2/pages?slug=landing

# 2. CMS Snapshot prüfen
curl https://gästefotos.com/api/cms/pages/landing

# 3. Manuell syncen
curl -X POST https://gästefotos.com/api/cms/sync

# 4. Frontend Cache leeren
systemctl restart gaestefotos-frontend
```

### **Problem: Styling sieht kaputt aus**

**Check:**
1. WordPress Theme kompatibel?
2. Custom CSS hat Konflikte?
3. Inline Styles in WordPress entfernen

**Fix:**
- Nutze nur Block-Editor ohne Theme-Styles
- Oder schreibe reines HTML ohne Theme-Klassen

### **Problem: Bilder werden nicht angezeigt**

**Ursache:** WordPress hostet Bilder unter `/wp-content/uploads/`

**Fix:**
```html
<!-- Absolute URLs nutzen -->
<img src="https://gästefotos.com/wp-content/uploads/2026/01/hero.jpg" alt="Hero" />
```

---

## 📊 Performance & SEO

### **Optimierung**

✅ **Bereits implementiert:**
- ETag Caching
- Cache-Control Header
- Server-side Rendering (SSR)
- Lazy Loading für Bilder

### **SEO Meta Tags hinzufügen**

**In WordPress:**
1. Plugin installieren: **Rank Math** oder **Yoast SEO**
2. Seite bearbeiten → SEO Einstellungen
3. Meta Title, Description, Keywords setzen

**Beispiel:**
```html
<meta name="title" content="Gästefotos - Hochzeitsfotos live teilen" />
<meta name="description" content="Die einfachste Art, Hochzeitsfotos von Gästen zu sammeln und zu teilen. DSGVO-konform, schnell, sicher." />
<meta property="og:image" content="https://gästefotos.com/og-image.jpg" />
```

---

## 🚀 Best Practices

### **Content Updates**

1. **Regelmäßig:** Landing Page alle 1-2 Monate aktualisieren
2. **Seasonal:** Weihnachten, Sommer, Hochzeitssaison
3. **A/B Testing:** Verschiedene CTA-Texte testen
4. **Analytics:** Google Analytics oder Matomo einbinden

### **Multisprache (Optional)**

**WordPress Plugin:** Polylang oder WPML
```
/landing (Deutsch)
/en/landing (Englisch)
```

**Frontend Anpassung:**
```tsx
// packages/frontend/src/app/page.tsx
const locale = cookies().get('locale')?.value || 'de';
const slug = locale === 'en' ? 'landing-en' : 'landing';
```

---

## 📞 Support

**Dokumentation:**
- CMS Integration: `docs/LANDING_PAGE_CMS.md`
- Features: `docs/FEATURES.md`

**API Endpoints:**
- `GET /api/cms/pages/:slug` - Content abrufen
- `POST /api/cms/sync` - WordPress syncen
- `GET /api/cms/status` - Sync Status

**Logs prüfen:**
```bash
journalctl -u gaestefotos-frontend -f
journalctl -u gaestefotos-backend -f
```

---

## ✅ Checkliste

- [ ] WordPress Seite "landing" erstellt
- [ ] Slug ist exakt `landing`
- [ ] Inhalt mit Hero + Features + CTA
- [ ] Bilder hochgeladen (max. 2MB)
- [ ] Seite veröffentlicht
- [ ] CMS Sync durchgeführt
- [ ] Frontend Test: https://gästefotos.com/
- [ ] Mobile Responsive Test
- [ ] SEO Meta Tags gesetzt
- [ ] Analytics eingebunden

---

**Ready to go! 🚀**
