# 🔍 Test & Fix Plan

## 🔴 Gefundene Probleme

1. **Login-Seite verwendet direkten fetch statt authApi**
   - Inkonsistent mit Rest der App
   - Fehlerbehandlung nicht optimal

2. **Register-Seite verwendet noch Framer Motion**
   - Kann Rendering-Probleme verursachen
   - Sollte konsistent mit Login sein

3. **Backend Middleware Inkonsistenzen**
   - `authMiddleware` vs `authenticateToken`
   - `userId` vs `user.id` in Routes

4. **Prisma Client muss generiert werden**
   - `npx prisma generate` notwendig

5. **Fehlende Validierung**
   - Error Messages auf Deutsch
   - Konsistente Error-Handling

## ✅ Zu testende Features

### Backend
- [ ] POST /api/auth/login
- [ ] POST /api/auth/register
- [ ] GET /api/auth/me
- [ ] GET /api/events
- [ ] POST /api/events
- [ ] GET /api/events/:id
- [ ] PUT /api/events/:id
- [ ] DELETE /api/events/:id
- [ ] GET /api/events/:eventId/guests
- [ ] POST /api/events/:eventId/guests
- [ ] GET /api/events/:eventId/photos
- [ ] POST /api/events/:eventId/photos/upload

### Frontend
- [ ] Login funktioniert
- [ ] Register funktioniert
- [ ] Dashboard lädt Events
- [ ] Event erstellen funktioniert
- [ ] Event bearbeiten funktioniert
- [ ] Navigation funktioniert

## 🔧 Fixes notwendig

1. Login-Seite auf authApi umstellen
2. Register-Seite von Framer Motion befreien
3. Backend Middleware konsistent machen
4. Error Messages auf Deutsch
5. Prisma Client generieren
6. Alle Dependencies installieren















