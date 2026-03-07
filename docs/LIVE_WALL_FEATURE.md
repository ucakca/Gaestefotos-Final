# Live-Wall Feature - Dokumentation

**Datum:** 20.01.2026 (aktualisiert 02.03.2026)  
**Status:** ✅ LIVE  
**Routes:**
- Dashboard: `/events/[id]/live-wall`
- Public Wall: `/live/[slug]/wall` (Realtime via Socket.IO)
- Admin-Modus: `/live/[slug]/wall?admin=1`

---

## 🎯 Überblick

Die **Live-Wall** ist eine responsive Foto-Wall, die alle Event-Fotos in Echtzeit anzeigt - perfekt für:
- **Beamer/TV auf Events** (Fullscreen-Mode)
- **Teilen mit Freunden** die nicht dabei sein können
- **Social Wall** mit Gästebuch-Kommentaren, Challenge-Badges & Stories

---

## 🚀 Features

### 1. Responsive Masonry Grid
- **CSS Columns Layout** (1-4 Spalten je nach Screensize)
- Mobile: 1 Spalte
- Tablet: 2 Spalten
- Desktop: 3 Spalten
- Large: 4 Spalten

### 2. Auto-Refresh (5 Sekunden)
```typescript
setInterval(() => {
  loadPhotos(); // Lädt alle Foto-Quellen neu
}, 5000);
```

### 3. Animierte Photo Cards
- **Framer Motion** Animations
- Fade-in + Scale-up beim Erscheinen
- Staggered Animation (verzögert pro Foto)
- Hover-Effekte

### 4. Content-Overlays

#### 📖 Gästebuch-Einträge
```tsx
{photo.isGuestbookEntry && (
  <div className="bg-white/95 rounded-full">
    <MessageCircle /> 
    {photo.guestbookEntry.authorName}: {photo.guestbookEntry.message}
  </div>
)}
```

#### 🏆 Challenge-Badges
```tsx
{photo.isChallengeCompletion && (
  <div className="bg-yellow-400">
    <Trophy /> {photo.challenge.title}
  </div>
)}
```

#### 📱 Story-Indicator
```tsx
{photo.isStory && (
  <div className="bg-gradient-to-r from-purple-500 to-pink-500">
    <Video /> {photo.story.uploaderName}
  </div>
)}
```

### 5. Fullscreen-Mode
- Native Browser Fullscreen API
- Toggle-Button im Header
- Perfekt für Beamer-Projektion

### 6. Share & QR-Code
- **Web Share API** (Mobile)
- **QR-Code Modal** zum Scannen
- Clipboard-Fallback (Desktop)

---

## 📊 Datenquellen

Die Live-Wall lädt Fotos aus **4 Quellen**:

| Quelle | Endpoint | Filter |
|--------|----------|--------|
| Regular Photos | `GET /events/:id/photos` | `status=APPROVED&limit=50` |
| Gästebuch | `GET /events/:id/feed` | Mit `photoUrl` |
| Challenges | `GET /events/:id/challenges/completions` | Mit Foto |
| Stories | `GET /events/:id/stories` | `mediaType=image` |

**Merge-Logik:**
1. Alle Quellen parallel laden (`Promise.allSettled`)
2. In gemeinsames Array mergen
3. Nach `createdAt` sortieren (neueste zuerst)
4. Limit: 50 Fotos

---

## 🎨 UI/UX Details

### Header
- **Sticky** (bleibt beim Scrollen sichtbar)
- Blur-Effekt (`backdrop-blur-sm`)
- Event-Titel + "Live Foto-Wall"
- Action-Buttons: QR-Code, Teilen, Fullscreen

### Foto-Cards
- **White Background** (besserer Kontrast)
- Shadow-lg mit Hover-Effekt
- Rounded Corners (xl)
- Lazy Loading für Performance

### Loading States
- Spinner mit Text "Lade Fotos..."
- Empty State: "Noch keine Fotos"
- Error-Handling (graceful degradation)

---

## 🔗 Integration

### Event-Dashboard Link
```tsx
// packages/frontend/src/app/events/[id]/dashboard/page.tsx
<ActionCard
  icon={<Monitor />}
  title="Live-Wall"
  description="Foto-Wall für Beamer & Teilen"
  onClick={() => router.push(`/events/${eventId}/live-wall`)}
  color="blue"
/>
```

### Direkt-URL
```
https://gästefotos.com/events/{eventId}/live-wall
```

---

## 🎯 Use Cases

### 1. Event mit Beamer
1. Host öffnet Live-Wall auf Laptop
2. Fullscreen aktivieren
3. HDMI/Airplay zum Beamer
4. Gäste sehen ihre Uploads **live**

### 2. Remote Teilnahme
1. Host teilt Live-Wall Link
2. Freunde/Familie öffnen auf Handy/Tablet
3. Sehen Event-Fotos in Echtzeit
4. Fühlen sich "dabei"

### 3. Social Wall auf Hochzeit
- Großer Screen im Eingangsbereich
- Gästebuch-Kommentare werden angezeigt
- Challenge-Erfüllungen gefeiert
- Animierte Einblendung neuer Fotos

---

## 🔧 Technische Details

### Dependencies
```json
{
  "qrcode": "^1.x",
  "@types/qrcode": "^1.x",
  "framer-motion": "^11.x"
}
```

### Performance
- **Lazy Loading** für Bilder
- **CSS Columns** statt JS-Masonry (native Performance)
- **Promise.allSettled** für parallele API-Calls
- **Limit: 50 Fotos** (verhindert Memory-Issues)

### Responsive Breakpoints
```css
columns-1          /* Mobile (< 640px) */
sm:columns-2       /* Tablet (640px+) */
lg:columns-3       /* Desktop (1024px+) */
xl:columns-4       /* Large (1280px+) */
```

---

## 🚀 Erweiterungen (Future)

### Implementiert (01.03.2026)
- [x] Filter (Content-Typ: Fotos / Gästebuch / Challenges / Stories) — in Grid + Slideshow
- [x] Slideshow-Mode (Auto-Advance 3-15s konfigurierbar, 5 Animationstypen, Shuffle)
- [x] Konfetti-Animation bei Challenge-Fotos
- [x] Photo-Stats Counter (Anzahl pro Typ im Filter-UI)
- [x] Reaction-Emojis (Floating Hearts via WebSocket bei Likes)
- [x] Live-Kommentare (Photo Comments als Speech Bubbles)
- [x] Top-Fotografen Leaderboard (alle 10 Fotos in SlideshowMode.tsx)
- [x] Ken Burns Effect (SlideshowMode.tsx)

### Implementiert (02.03.2026)
- [x] **Themed Overlays** — 6 Typen: `particles`, `confetti`, `hearts`, `snowflakes`, `stars`, `bubbles`
  - Komponente: `packages/frontend/src/components/event-theme/WallThemeOverlay.tsx`
  - Props: `overlayType` (OverlayType), `intensity` (0–1)
  - Particles: glowing orbs mit Event-Theme-Farben (primary/secondary/accent)
  - Symbols: Emoji-basierte Animationen (fallend mit Wobble + Rotation)
  - Inferred from theme oder manuell per Admin-Control
- [x] **Sound-Effekte** — Prozeduraler Web Audio API Synthesizer
  - Hook: `packages/frontend/src/hooks/useWallSounds.ts`
  - Sounds: `ding` (neue Fotos), `whoosh` (Slide-Wechsel), `pop` (Reaktion), `chime` (Achievement)
  - Kein externer Audio-Download — alle Sounds werden per OscillatorNode + GainNode erzeugt
  - Aktivierbar per Admin-Control oder Sound-Toggle im Dashboard
- [x] **Admin-Fernsteuerung** (Wall Remote Control)
  - Hook: `packages/frontend/src/hooks/useWallControl.ts`
  - Panel: `packages/frontend/src/components/wall/WallAdminControl.tsx`
  - Zugang: `/live/[slug]/wall?admin=1` (Floating Panel unten-links)
  - Features:
    - Play/Pause Slideshow
    - Sound ein/aus
    - QR-Code ein/aus
    - Intervall-Slider (3–20s)
    - View-Mode-Wechsel (Grid, Slideshow, Masonry, Collage, Cinematic, Polaroid, CoverFlow, Bento, Mosaik, Mixed)
    - Overlay-Typ + Intensität
    - Ankündigungs-Nachricht (live auf der Wall angezeigt, z.B. "Torte wird angeschnitten!")
  - WebSocket-Relay: `wall:control` Event (Backend: `packages/backend/src/index.ts`)
    - Admin sendet → Server broadcastet an alle Clients im Event-Room
  - Dashboard-Link: Button in `/events/[id]/live-wall` öffnet Public Wall im Admin-Modus

### Alle 13 Features komplett ✔️

---

## ✅ Testing

### Manual Tests
1. **Responsive:** Verschiedene Screengrößen testen
2. **Auto-Refresh:** Neues Foto hochladen → erscheint nach 5s
3. **Fullscreen:** F11 / Fullscreen-Button
4. **Share:** Web Share API / QR-Code
5. **Performance:** 50+ Fotos → kein Lag

### Edge Cases
- [ ] Event ohne Fotos → Empty State
- [ ] Event mit nur 1 Foto → Single Column
- [ ] Sehr lange Gästebuch-Kommentare → Truncate
- [ ] Offline → Graceful Error

---

## 📝 Fazit

Die Live-Wall ist ein **Alleinstellungsmerkmal** für gästefotos.com:
- ✅ **Niemand** im Event-Foto-Markt hat das so
- ✅ **Responsive** für alle Devices
- ✅ **Teilbar** für Remote-Teilnahme
- ✅ **Beamer-tauglich** für Events
- ✅ **Animiert & Modern** (nicht nur static grid)

**Status:** PRODUCTION READY 🎉
