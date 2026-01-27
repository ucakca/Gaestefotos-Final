# V0 Design 1:1 Rekonstruktion - Checkliste

## REFERENZ: v0-event-guest-gallery-main

---

## 1. EVENT HERO (`event-hero.tsx`)

### 1.1 Cover Image Bereich
- [ ] **Höhe:** `h-56` (224px)
- [ ] **Overflow:** `overflow-hidden bg-muted`
- [ ] **Bild:** Next.js `<Image>` mit `fill`, `object-cover`
- [ ] **Blur-Effekt beim Laden:** `scale-110 blur-lg` → `scale-100 blur-0`
- [ ] **Gradient Overlay:** `bg-gradient-to-b from-black/30 via-transparent to-background`

### 1.2 Branding Logo
- [ ] **Position:** `absolute top-4 left-1/2 -translate-x-1/2 z-10`
- [ ] **Styling:** `text-white drop-shadow-lg text-sm font-bold tracking-wide`
- [ ] **Text:** "Gästefotos.com"
- [ ] **Link:** `href="https://gaestefotos.com"`

### 1.3 Host Dashboard Button (links oben)
- [ ] **Position:** `absolute top-4 left-4 z-10`
- [ ] **Styling:** `rounded-full bg-black/40 p-2.5 text-white backdrop-blur-sm`
- [ ] **Icon:** `<User className="h-5 w-5" />`

### 1.4 Share Button (rechts oben)
- [ ] **Position:** `absolute top-4 right-4 z-10`
- [ ] **Styling:** `rounded-full bg-black/40 p-2.5 text-white backdrop-blur-sm`
- [ ] **Icon:** `<Share2 className="h-5 w-5" />`

### 1.5 Profil Avatar
- [ ] **Container:** `-mt-16` (überlappt Cover)
- [ ] **Größe:** `h-28 w-28` (112x112px)
- [ ] **Story Ring:** Gradient `from-primary via-red-400 to-orange-400` wenn hasActiveStory
- [ ] **Ohne Story:** `bg-border`
- [ ] **Inner Ring:** `ring-4 ring-background`
- [ ] **Hover:** `scale-105`

### 1.6 Add Story Button
- [ ] **Position:** `absolute -bottom-1 left-1/2 -translate-x-1/2`
- [ ] **Styling:** `rounded-full shadow-lg`
- [ ] **Icon:** `<Plus className="h-4 w-4" />`

### 1.7 Host Name
- [ ] **Position:** Unter Avatar, zentriert
- [ ] **Styling:** `mt-4 text-sm font-medium text-muted-foreground`

### 1.8 Event Info Card
- [ ] **Container:** `mx-4 mt-4 rounded-2xl border bg-card shadow-lg overflow-hidden`
- [ ] **Header:** Event Titel + Stats (Gäste, Fotos)
- [ ] **Stats Icons:** `<Users>` + `<Camera>` mit `text-primary`
- [ ] **Welcome Message:** `mt-2 text-sm text-muted-foreground leading-relaxed`
- [ ] **Details Accordion:** "Details anzeigen" expandable
- [ ] **Accordion Content:** Date, Location, Schedule, Dress Code, Wishlist

---

## 2. ALBUM FILTER (`album-filter.tsx`)

### 2.1 Container
- [ ] **Layout:** `flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide`
- [ ] **Sticky:** `sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b`

### 2.2 Pills/Buttons
- [ ] **Layout:** `flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2`
- [ ] **Typography:** `text-sm font-medium`
- [ ] **Active:** `bg-primary text-primary-foreground shadow-md`
- [ ] **Inactive:** `border border-border bg-card text-muted-foreground hover:bg-accent`

### 2.3 Icons
- [ ] **Icon Map:** Images, Church, PartyPopper, Music, Utensils, Heart, Gift, etc.
- [ ] **Size:** `h-4 w-4`
- [ ] **Count:** `text-xs opacity-70` in Klammern

---

## 3. PHOTO GRID (`photo-grid.tsx`)

### 3.1 Masonry Layout (CSS)
- [ ] **Container:** `masonry-grid px-4`
- [ ] **CSS:** `column-count: 2; column-gap: 0.5rem;`
- [ ] **Item:** `break-inside: avoid; margin-bottom: 0.5rem;`
- [ ] **Responsive:** 3 columns @768px, 4 columns @1024px

### 3.2 Photo Item
- [ ] **Container:** `rounded-xl bg-muted overflow-hidden`
- [ ] **Aspect Ratio:** Dynamic based on `photo.height / photo.width`
- [ ] **Hover:** `shadow-lg`, `scale-[0.98]` on active

### 3.3 Like Overlay
- [ ] **Position:** `absolute bottom-2 left-2`
- [ ] **Styling:** `rounded-full bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm`
- [ ] **Heart Icon:** `h-3 w-3`, filled red wenn isLiked

### 3.4 Interactions
- [ ] **Double-tap to like:** Heart animation
- [ ] **Long-press:** Context menu (500ms)
- [ ] **Vibration:** `navigator.vibrate(50)`

---

## 4. UPLOAD FAB (`upload-fab.tsx`)

### 4.1 Position & Styling
- [ ] **Position:** `fixed bottom-24 left-1/2 z-40 -translate-x-1/2`
- [ ] **Button:** `h-14 gap-2 rounded-full px-6 shadow-xl shadow-primary/25`
- [ ] **Hover:** `scale-105`, Active: `scale-95`

### 4.2 Content
- [ ] **Icon:** `<Plus className="h-5 w-5" />`
- [ ] **Text:** `<span className="font-semibold">Upload</span>`

### 4.3 Dropdown Menu
- [ ] **Items:** Foto aufnehmen, Foto auswählen, Video aufnehmen
- [ ] **Icons:** Camera, ImageIcon, Video mit `text-primary`

---

## 5. BOTTOM NAV (`bottom-nav.tsx`)

### 5.1 Container
- [ ] **Position:** `fixed bottom-0 left-0 right-0 z-50`
- [ ] **Styling:** `border-t bg-background/80 backdrop-blur-xl safe-area-bottom`

### 5.2 Layout
- [ ] **Inner:** `mx-auto flex h-16 max-w-lg items-center justify-around`

### 5.3 Tab Buttons
- [ ] **Layout:** `flex flex-1 flex-col items-center justify-center gap-1 py-2`
- [ ] **Active:** `text-primary`, icon `scale-110`
- [ ] **Inactive:** `text-muted-foreground hover:text-foreground`

### 5.4 Tabs
- [ ] **Feed:** Home icon, "Feed"
- [ ] **Challenges:** Trophy icon, "Challenges"
- [ ] **Gästebuch:** BookOpen icon, "Gästebuch"
- [ ] **Info:** Info icon, "Info"

---

## 6. STICKY HEADER (`sticky-header.tsx`)

### 6.1 Container
- [ ] **Position:** `fixed top-0 left-0 right-0 z-40`
- [ ] **Styling:** `bg-background/95 backdrop-blur-lg border-b safe-area-top`
- [ ] **Animation:** `translate-y-0 opacity-100` ↔ `-translate-y-full opacity-0`

### 6.2 Content
- [ ] **Left:** Avatar (h-8 w-8) + Event Title + Host Name
- [ ] **Right:** Play (Slideshow), Share2, ChevronUp buttons
- [ ] **Button Size:** `h-8 w-8 size="icon"`

---

## 7. JUMP TO TOP (`jump-to-top.tsx`)

- [ ] **Position:** `fixed bottom-40 right-4 z-40`
- [ ] **Styling:** `rounded-full shadow-lg`
- [ ] **Icon:** `<ChevronUp className="h-5 w-5" />`
- [ ] **Animation:** Fade in/out based on scroll

---

## 8. GLOBAL CSS

### 8.1 Safe Areas
```css
.safe-area-top { padding-top: env(safe-area-inset-top); }
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
```

### 8.2 Masonry Grid
```css
.masonry-grid { column-count: 2; column-gap: 0.5rem; }
.masonry-item { break-inside: avoid; margin-bottom: 0.5rem; }
@media (min-width: 768px) { .masonry-grid { column-count: 3; } }
@media (min-width: 1024px) { .masonry-grid { column-count: 4; } }
```

### 8.3 Scrollbar Hide
```css
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
```

### 8.4 Gradient Ring Animation
```css
@keyframes rotate-gradient { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.animate-gradient-ring { animation: rotate-gradient 3s linear infinite; }
```

---

## 9. PAGE STRUCTURE (`app/e3/[slug]/page.tsx`)

```tsx
<main ref={containerRef} className="relative min-h-screen bg-background pb-24">
  <StickyHeader ... />
  <PullToRefreshIndicator ... />
  
  <div style={{ transform: `translateY(${pullDistance}px)` }}>
    {activeTab === "feed" && (
      <>
        {isLoading ? <Skeletons /> : (
          <>
            <EventHero ... />
            <AlbumFilter ... />
            <PhotoGrid ... />
          </>
        )}
      </>
    )}
    {activeTab === "challenges" && <ChallengesTab />}
    {activeTab === "guestbook" && <GuestbookTab />}
    {activeTab === "info" && <InfoTab />}
  </div>

  <StoryViewer ... />
  <PhotoLightbox ... />
  <QRCodeShare ... />
  <SlideshowMode ... />
  <JumpToTop ... />
  <UploadFAB ... />
  <UploadModal ... />
  <BottomNav ... />
</main>
```

---

## IMPLEMENTIERUNGS-REIHENFOLGE

1. **CSS:** Masonry, Safe-Area, Scrollbar-Hide zu globals.css
2. **EventHero:** Komplett neu nach v0 Vorlage
3. **AlbumFilter:** Pill-Style statt Story-Style
4. **PhotoGrid:** Masonry mit Like-Overlay
5. **BottomNav:** Simplified, immer sichtbar
6. **UploadFAB:** Centered, mit Dropdown
7. **page.tsx:** Neu strukturieren mit Tab-System
8. **Build & Test**

