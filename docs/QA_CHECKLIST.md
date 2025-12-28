# QA Checklist

Diese Checklist ist zum schnellen „Abhaken“ gedacht. Details & Setup siehe `docs/TEST_GUIDE.md`.

## Vorbereitung

- [ ] Services gestartet (`bash ./start-local-services.sh`)
- [ ] Testdaten erzeugt (`pnpm --filter @gaestefotos/backend tsx ./scripts/setup-test-events.ts`)
- [ ] Du hast **2 Events** (Slugs/IDs aus Script-Output):
  - [ ] **Aktiv (nicht gelockt)**
  - [ ] **Gelockt (Storage-Lock aktiv)**

## Smoke (Basics)

- [ ] Backend Health ok: `curl -fsS http://localhost:8002/api/health`
- [ ] Frontend erreichbar: `curl -I http://localhost:3002`

## Host Tests (A)

### Login / Dashboard

- [ ] Host kann sich einloggen
- [ ] Login UI enthält "Passwort anzeigen" und "Passwort vergessen?"
- [ ] `/register` redirectet auf `/login`
- [ ] Dashboard lädt ohne Fehler

### Admin (falls Account vorhanden)

- [ ] Admin kann sich einloggen
- [ ] Nach Login: Redirect auf `/admin/dashboard`
- [ ] Direktaufruf `/admin/dashboard` bleibt erlaubt (kein Redirect zurück auf `/dashboard`)

### Storage-Lock Verhalten (gelocktes Event)

- [ ] Banner/Hinweis im Host-Dashboard sichtbar
- [ ] Thumbnails sind unscharf/gelockt
- [ ] Uploads sind deaktiviert (mit nachvollziehbarer Begründung)
- [ ] Downloads sind deaktiviert
  - [ ] Kein ZIP Download
  - [ ] Keine Einzel-Downloads

## Guest Tests (B)

### Öffnen (Public Page)

- [ ] Guest-Seite öffnet sich über `/e2/[slug]` (Slug vom Script)
- [ ] Seite lädt ohne 404/500 Errors

### Upload CTA (nur Sichtbarkeit/UX)

- [ ] Upload CTA ist sichtbar, wenn Uploads im Event erlaubt sind
- [ ] Bei gelocktem Event ist Upload CTA sichtbar aber disabled (mit Reason)

### Storage-Lock (gelocktes Event)

- [ ] Fotos werden weiterhin angezeigt, aber **unscharf**
- [ ] Es gibt einen **kurzen Hinweis**, warum es unscharf ist (info-only)
- [ ] Kein Upgrade/Checkout CTA für Gäste

### Stories (Instagram-like)

- [ ] Es gibt **keine** permanente Stories-Leiste
- [ ] Profilbild im Header/Hero ist klickbar
- [ ] Wenn Stories vorhanden sind: Klick öffnet Story-Viewer
- [ ] Story-Viewer Navigation:
  - [ ] Swipe links = nächste Story
  - [ ] Swipe rechts = vorherige Story
  - [ ] Tap links/rechts funktioniert ebenfalls

### Foto Viewer / Modal

- [ ] Tippen auf Foto öffnet Foto-Modal (im aktiven, nicht gelockten Event)
- [ ] Navigation im Foto-Modal:
  - [ ] Swipe links = nächstes Foto
  - [ ] Swipe rechts = vorheriges Foto
  - [ ] Pfeile links/rechts funktionieren weiterhin

