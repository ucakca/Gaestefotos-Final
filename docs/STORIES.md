# Stories (Guest UI)

Dieses Dokument beschreibt die Stories-Funktion (Foto/Video) für die Guest-Seite (`/e2/<slug>`): Datenmodell, API, Produktlogik und typische Flows.

---

## Laiensicher (kurz erklärt)

Stories sind kurze Foto- oder Video-Beiträge, die oben im Event als „Story-Ring“ angezeigt werden. Du kannst eine Story direkt über den `+Story` Button erstellen.

- Eine Story kann ein Foto **oder** ein Video sein.
- Videos in Stories sind auf **maximal 15 Sekunden** begrenzt.
- Story-Medien erscheinen **nicht** in der normalen Foto-Übersicht (Grid). Sie sind „Story-only“.
- Wenn Uploads deaktiviert sind oder die Speicherzeit abgelaufen ist, ist `+Story` deaktiviert und zeigt den Grund.

---

## Produkt-/UX-Logik

- **Story-Ring**:
  - Wenn Stories existieren: animierter Gradient-Ring.
  - Wenn keine Stories existieren: grauer Ring + Hinweis („Sei der Erste“).
- **`+Story` Button**:
  - Immer sichtbar.
  - Öffnet einen Upload-Dialog (Foto oder Video).
  - Blockiert mit Hinweis, wenn `uploadDisabled=true` oder `isStorageLocked=true`.
- **Grid-Exclusion**:
  - Medien, die als Story erstellt wurden, werden als `isStoryOnly=true` markiert und standardmäßig aus Grid-/Feed-Listen ausgeschlossen.

---

## Datenmodell (Prisma)

Siehe auch: `docs/DB_FIELD_MEANINGS.md`.

- `Event.profileDescription` (optional)
  - Beschreibungstext in der Guest-Header-Info.

- `Photo.isStoryOnly` / `Video.isStoryOnly`
  - `true` => Medium ist ausschließlich für Stories gedacht (nicht im Grid).

- `Story`
  - Referenziert **entweder** `photoId` **oder** `videoId`.

---

## API (relevant für Stories)

### Stories laden

- `GET /api/events/:eventId/stories`
  - Gibt aktive Stories eines Events zurück.
  - Jede Story enthält entweder `photo` oder `video`.

### Story aus Foto erstellen

- `POST /api/photos/:photoId/story`
  - Erstellt/aktualisiert eine Story für ein bereits vorhandenes (und i.d.R. `APPROVED`) Foto.
  - Setzt `Photo.isStoryOnly=true`.

### Story aus Video erstellen

- `POST /api/videos/:videoId/story`
  - Erstellt/aktualisiert eine Story für ein bereits vorhandenes (und i.d.R. `APPROVED`) Video.
  - Setzt `Video.isStoryOnly=true`.

---

## Upload-Flow (Frontend)

1. User klickt `+Story`
2. Upload-Dialog: Foto oder Video wählen
3. Bei Video: Duration check im UI (max 15s)
4. Upload des Mediums über bestehenden Upload-Endpunkt:
   - Foto: `POST /api/events/:eventId/photos/upload`
   - Video: `POST /api/events/:eventId/videos/upload`
5. Danach Story-Erstellung über:
   - Foto: `POST /api/photos/:photoId/story`
   - Video: `POST /api/videos/:videoId/story`
6. UI reload:
   - `reloadStories()`
   - `reloadPhotos()` (damit Story-only aus dem Grid rausfällt)

---

## Wichtige Invarianten

- Story-Medien dürfen **nicht** im Haupt-Grid erscheinen.
  - Backend: Listing filtert `isStoryOnly` standardmäßig heraus.
  - Frontend: defensive Filterung (falls API ausnahmsweise Story-only liefert).
- Video-Story-Länge: Frontend enforced (max 15s), Backend sollte defensiv bleiben.

---

## Verwandte Dateien

- Backend:
  - `packages/backend/prisma/schema.prisma`
  - `packages/backend/src/routes/stories.ts`
  - `packages/backend/src/routes/photos.ts`
  - `packages/backend/src/routes/videos.ts`
- Frontend:
  - `packages/frontend/src/components/EventHeader.tsx`
  - `packages/frontend/src/components/guest/StoryViewer.tsx`
  - `packages/frontend/src/hooks/useStoriesViewer.ts`
  - `packages/frontend/src/app/e2/[slug]/page.tsx`
  - `packages/frontend/src/hooks/useGuestEventData.ts`
