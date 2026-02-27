# 🎨 KIMI Aufgaben-Queue (In Reihenfolge abarbeiten!)

Stand: 14.02.2026 — gesteuert von Opus

> **REGEL**: Jede Aufgabe abschließen (Build grün + Commit), bevor die nächste startet.
> **REGEL**: Bei Aufgaben mit ⚠️ WARTET AUF OPUS — erst starten wenn Opus das Signal gibt.

---

## 📋 Aufgabe 1/7: Design-Token Unification [P0, 16h]

```
Du arbeitest am Projekt /root/gaestefotos-app-v2.

AUFGABE: Design-Token Migration — alle Legacy-Tokens (app-*) durch moderne Tokens ersetzen.

KONTEXT:
- Das Frontend liegt in /packages/frontend/
- Es gibt Legacy CSS-Variablen mit Prefix "app-" die durch ein modernes Token-System ersetzt werden müssen
- Betroffen sind ca. 129 Dateien

SCHRITTE:
1. Analysiere alle verwendeten app-* Token in /packages/frontend/src/ (grep nach "app-" in CSS/TSX/Tailwind)
2. Erstelle eine Token-Map: app-* → neues Token (z.B. app-bg → bg-background, app-fg → text-foreground etc.)
3. Erstelle/aktualisiere die CSS-Variablen in globals.css mit dem neuen System
4. Migriere alle Dateien systematisch (Suchen-Ersetzen)
5. Stelle sicher dass KEINE app-* Tokens mehr verwendet werden
6. Build testen: cd /packages/frontend && npx next build

WICHTIG:
- Keine funktionalen Änderungen — nur Token-Umbenennung
- Tailwind config muss die neuen Tokens referenzieren
- Dark Mode Support beachten falls vorhanden
- Nach Abschluss: git add -A && git commit -m "refactor: Design-Token Unification — app-* → modern tokens"
```

---

## 📋 Aufgabe 2/7: Button-System Refactoring [P0, 10h]

```
Du arbeitest am Projekt /root/gaestefotos-app-v2.

AUFGABE: Einheitliches Button-System erstellen.

KONTEXT:
- Im Frontend gibt es mehrere Button-Implementierungen die nicht konsistent sind
- Ziel: Ein BaseButton.tsx mit Varianten (primary, secondary, ghost, destructive)

SCHRITTE:
1. Finde alle Button-Komponenten: grep -r "Button" /packages/frontend/src/components/ui/
2. Analysiere alle verwendeten Button-Patterns (Farben, Größen, States)
3. Erstelle /packages/frontend/src/components/ui/BaseButton.tsx:
   - Varianten: primary, secondary, ghost, destructive, outline
   - Größen: sm, md, lg, xl (für Touch)
   - States: loading (Spinner), disabled, icon-only
   - Basis: class-variance-authority (cva) + tailwind-merge
4. Migriere alle bestehenden Button-Nutzungen auf BaseButton
5. Entferne alte Button-Komponenten die nicht mehr gebraucht werden
6. Build testen + Commit

WICHTIG:
- shadcn/ui Button als Basis nehmen falls vorhanden
- Type-Safety: ButtonProps mit HTMLButtonElement extends
- forwardRef verwenden
- Nach Abschluss: git commit -m "refactor: Unified Button system with BaseButton + variants"
```

---

## 📋 Aufgabe 3/7: Form System Unification [P1, 9h]

```
Du arbeitest am Projekt /root/gaestefotos-app-v2.

AUFGABE: Einheitliches Form-System mit React Hook Form.

KONTEXT:
- Es gibt verschiedene Input/Select/Textarea Implementierungen im Frontend
- Ziel: Konsistente Form-Komponenten mit Validierung

SCHRITTE:
1. Analysiere bestehende Form-Patterns in /packages/frontend/src/
2. Erstelle einheitliche Komponenten:
   - FormInput.tsx (mit Label, Error, HelperText)
   - FormSelect.tsx
   - FormTextarea.tsx
   - FormCheckbox.tsx
3. Integration mit React Hook Form (useForm, Controller, zodResolver)
4. Erstelle FormField wrapper für konsistentes Layout
5. Migriere die wichtigsten Formulare (GuestbookTab, BoothSetup, Login, Register)
6. Build testen + Commit

WICHTIG:
- zod für Schema-Validierung verwenden
- Accessibility: aria-labels, aria-describedby für Fehlermeldungen
- Mobile-optimiert: große Touch-Targets (min 44px)
- Nach Abschluss: git commit -m "refactor: Unified form system with React Hook Form + zod"
```

---

## 📋 Aufgabe 4/7: PWA Polish [P1, 4h]

⚠️ **WARTET AUF OPUS** — Opus erstellt zuerst die PWA-Architektur (Service Worker, Cache-Strategie). Diese Aufgabe nur starten wenn Opus PWA-Core fertig hat.

```
Du arbeitest am Projekt /root/gaestefotos-app-v2.

AUFGABE: PWA UI-Polish — Manifest, Icons, Mobile-Optimierung.

VORAUSSETZUNG: Opus hat bereits den Service Worker und die Cache-Strategie implementiert.

SCHRITTE:
1. Erstelle/aktualisiere /packages/frontend/public/manifest.json:
   - name: "Gästefotos"
   - short_name: "Gästefotos"
   - theme_color, background_color
   - display: "standalone"
   - orientation: "portrait"
   - icons: 192x192, 512x512 (maskable + any)
2. Erstelle PWA-Icons in verschiedenen Größen (oder generiere Placeholder)
3. Füge <meta>-Tags in layout.tsx hinzu:
   - apple-mobile-web-app-capable
   - apple-mobile-web-app-status-bar-style
   - viewport mit viewport-fit=cover
4. Safe-Area CSS:
   - env(safe-area-inset-top/bottom/left/right) für Notch-Geräte
   - BottomNav padding-bottom anpassen
5. Touch-Target Audit:
   - Alle interaktiven Elemente min 44x44px
   - Tap-Highlight entfernen: -webkit-tap-highlight-color: transparent
6. Build testen + Commit

Nach Abschluss: git commit -m "feat: PWA manifest, icons, safe-area CSS, touch-targets"
```

---

## 📋 Aufgabe 5/7: Event Wall UI [P1, 12h]

⚠️ **WARTET AUF OPUS** — Opus erstellt zuerst das Event Wall Backend (WebSocket-Feed, Quellen-Aggregation). Diese Aufgabe nur starten wenn Opus Event-Wall-Backend fertig hat.

```
Du arbeitest am Projekt /root/gaestefotos-app-v2.

AUFGABE: Event Wall Frontend — Live-Diashow mit Animationen.

VORAUSSETZUNG: Opus hat das Event Wall Backend mit WebSocket-Feed implementiert.

KONTEXT:
- Route: /live/[slug]/wall
- Die Event Wall zeigt Fotos/Videos aus verschiedenen Quellen in einer Fullscreen-Diashow
- Animationen sollen zufällig gemischt werden
- Quellen: Galerie, Booth, KI-Kunst, Gästebuch (nur mit Foto)

SCHRITTE:
1. Erstelle/aktualisiere die Event Wall Seite in /packages/frontend/
2. Implementiere 6 Animations-Typen mit Framer Motion:
   - Fade (opacity 0→1→0)
   - Slide (von links/rechts/oben/unten)
   - Zoom (scale 0.5→1→0.5)
   - Flip (rotateY 180°)
   - Collage (4 Bilder gleichzeitig, random Positionen)
   - Mosaic-Spezial ("auf die Wall kleben", Gesamtbild baut sich auf)
3. WebSocket-Integration:
   - Verbinde mit dem von Opus erstellten WebSocket-Endpunkt
   - Neue Fotos automatisch in die Queue einfügen
   - "Neues Foto!" Notification-Animation
4. Fullscreen-Modus:
   - F11 / Fullscreen API
   - Cursor nach 3s Inaktivität ausblenden
   - Schwarzer Hintergrund
5. Quellen-Mixing:
   - Alle gebuchten Quellen mischen
   - Nicht gebuchte Quellen ausgegraut (wenn Admin-Preview)
   - Gewichtung: neuere Fotos häufiger
6. Build testen + Commit

WICHTIG:
- Performance: requestAnimationFrame für Transitions
- Lazy Loading für Bilder (nur aktuelle + nächste 2 vorladen)
- Reduced-Motion Support: @media (prefers-reduced-motion: reduce)
- Nach Abschluss: git commit -m "feat: Event Wall with 6 animation types + WebSocket live feed"
```

---

## 📋 Aufgabe 6/7: Mosaic Wizard UI [P1, 10h]

⚠️ **WARTET AUF OPUS** — Opus erstellt zuerst das Mosaic UX Redesign-Konzept und Backend. Diese Aufgabe nur starten wenn Opus Mosaic-Konzept + Backend fertig hat.

```
Du arbeitest am Projekt /root/gaestefotos-app-v2.

AUFGABE: Mosaic Wizard UI — 3-Step Wizard (reduziert von 5 Steps).

VORAUSSETZUNG: Opus hat das Mosaic UX Redesign-Konzept und Backend erstellt. Lies docs/MOSAIC-UX-REDESIGN.md für die Spezifikation.

SCHRITTE:
1. Lies das Opus-Konzept in docs/MOSAIC-UX-REDESIGN.md
2. Implementiere den 3-Step Wizard:
   Step 1: Modus & Grid (Digital/Print Toggle + Grid-Format Auswahl)
   Step 2: Zielbild & Overlay (Upload + Crop + KI-Scatter Auto-Modus)
   Step 3: Vorschau & Aktivieren (Live-Preview + Animations-Kacheln + Board-Designer bei Print)
3. Crop-Widget: react-image-crop oder ähnlich, mit korrektem Aspect-Ratio aus Step 1
4. Animations-Kacheln: Play-Button (zeigt Animation) + Checkbox (wählt aus):
   - 1 gewählt = einzeln, mehrere = gemischt, alle = zufällig
5. Board-Designer (nur bei Print): Logo + Text + Farben für gebrandetes Banner
6. Responsive: Mobile-first, Touch-optimiert
7. Build testen + Commit

WICHTIG:
- Folge EXAKT dem Opus-Konzept — keine eigenen UX-Entscheidungen treffen
- Scatter-Wert: Auto-Modus default, optionaler Slider mit Live-Preview
- Grid-Formate als visuelle Kacheln (nicht Dropdown)
- Nach Abschluss: git commit -m "feat: Mosaic 3-Step Wizard UI (redesigned from 5 steps)"
```

---

## 📋 Aufgabe 7/7: Gamification + KI-Kunst + Upsell UI [P2, 22h]

```
Du arbeitest am Projekt /root/gaestefotos-app-v2.

AUFGABE: Phase 4 UI Features — Gamification, KI-Kunst Gast-Flow, Upsell UI.

### Teil A: Gamification UI (10h)
1. Badge-System: Erstelle Badge-Komponenten pro Medium (Foto-Badge, Video-Badge, Spiel-Badge etc.)
2. Achievement-Popups: Vollbild-Animation mit Confetti wenn Achievement freigeschaltet
3. Leaderboard: Erweitert (Fotos, Spiele, Champion) — Tabbed View
4. Frequenz konfigurierbar (nicht jede Aktion triggert)

### Teil B: KI-Kunst Gast-Flow (8h)
1. Selfie-Only Capture (KEIN Fotoauswahl aus Galerie!)
2. Vorlagen-Carousel: Horizontale Scroll-Ansicht mit Beispiel-Stilen
3. Stil-Preview: Vorher/Nachher Slider
4. Ergebnis-Share: In Galerie teilen Button
5. Route: innerhalb des Foto-Spaß Tabs

### Teil C: Upsell UI (4h)
1. Nicht gebuchte Features: ausgegraut + 🔒 Badge
2. ❓ Button öffnet Erklärungs-Modal:
   - Feature-Erklärung
   - Animation/Video Preview
   - Preis anzeigen
   - CTA Button "Jetzt freischalten"
3. Addons als Übersicht im Package-Tab

Build testen + Commit nach jedem Teil.
```

---

## 🔄 Status-Tracking

| # | Aufgabe | Status | Details |
|---|---------|--------|---------|
| 1 | Design-Token Unification | ✅ Fertig | 67 Dateien, 234 app-* Tokens → moderne Tokens |
| 2 | Button-System Refactoring | ✅ Fertig | 5→2 Dateien, -204 LOC, unified Button + IconButton |
| 3 | Form System Unification | ✅ Fertig | FormField + RHF/zod, 3 Auth-Seiten migriert |
| 4 | PWA Polish | ✅ Fertig | Kimi + Opus Fixes |
| 5 | Event Wall UI | ✅ Fertig | Kimi + Opus Fixes + Gamification Integration |
| 6 | Mosaic Wizard UI | ✅ Fertig | Kimi |
| 7 | Gamification + KI-Kunst + Upsell | ✅ Fertig | Kimi + Opus Fixes + Integration |
