# Authentication Flows - Gästefotos App

## Übersicht

Dieses Dokument beschreibt die implementierten Authentifizierungs-Flows der Gästefotos-App, einschließlich Login, Password Reset und Registration.

---

## 1. Password Reset Flow

### Funktionsweise

Der Password-Reset-Flow ermöglicht es Benutzern, ihr Passwort zurückzusetzen, wenn sie es vergessen haben. Der Flow besteht aus zwei Hauptschritten:

1. **Forgot Password**: Benutzer fordert Reset-Link an
2. **Reset Password**: Benutzer setzt neues Passwort mit Token

### Backend API

#### POST `/api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "Falls ein Konto existiert, wurde eine E-Mail versendet."
}
```

**Features:**
- ✅ Email-Normalisierung (case-insensitive, trimmed)
- ✅ Timing-Attack-Schutz (konstante Response-Zeit)
- ✅ Rate-Limiting (passwordLimiter)
- ✅ Automatisches Cleanup alter Tokens
- ✅ Token-Gültigkeit: 1 Stunde
- ✅ Sicherer 64-Zeichen-Token (crypto.randomBytes)

**Sicherheit:**
- Gibt immer dieselbe Antwort zurück, unabhängig davon, ob Email existiert
- Jitter zwischen 200-500ms für konsistente Response-Zeit
- Alte/abgelaufene Tokens werden vor Erstellung gelöscht

#### POST `/api/auth/reset-password`

**Request Body:**
```json
{
  "token": "64-character-hex-token",
  "password": "newPassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Passwort erfolgreich zurückgesetzt",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "HOST",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt-token"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Ungültiger oder abgelaufener Reset-Link"
}
```

**Features:**
- ✅ Token-Validierung (eindeutig, nicht verwendet, nicht abgelaufen)
- ✅ Passwort-Hashing mit bcrypt (Salting-Rounds: 10)
- ✅ Automatisches Login nach Reset
- ✅ Cleanup aller anderen Reset-Tokens des Users
- ✅ One-Time-Use: Token wird nach Verwendung markiert

**Sicherheit:**
- Token kann nur einmal verwendet werden (`usedAt` Timestamp)
- Alle anderen Reset-Tokens des Users werden invalidiert
- Rate-Limiting verhindert Brute-Force
- Jitter bei Fehlern (250-600ms)

### Email Template

Die Email für Password-Reset enthält:
- ✅ Personalisierte Anrede (User-Name)
- ✅ Klickbarer Reset-Link mit Button
- ✅ Plain-Text-Fallback für Email-Clients
- ✅ Sicherheitshinweise (1h Gültigkeit, einmalige Verwendung)
- ✅ Branded Design (Gästefotos-Farben)

**Template-Location:** `packages/backend/src/services/email.ts` → `sendPasswordReset()`

**Email-Features:**
- HTML + Text Version
- Escape-Protection gegen XSS
- Warning-Box für Sicherheitshinweise
- Responsive Design

### Frontend Pages

#### `/forgot-password`

**Features:**
- ✅ Email-Input mit HTML5-Validierung
- ✅ Loading-State während API-Call
- ✅ Success-Message (security-conscious)
- ✅ Error-Handling
- ✅ Navigation zurück zu Login
- ✅ Link zur Registration

**UI-Components:**
- Gradient Background (sage-50 → terracotta-50)
- Card-Layout mit Shadow
- Responsive Design
- Disabled-State während Submit

**File:** `packages/frontend/src/app/forgot-password/page.tsx`

#### `/reset-password`

**Features:**
- ✅ Token-Extraktion aus URL Query-Parameter
- ✅ Passwort + Bestätigungs-Input
- ✅ Client-Side-Validierung (Länge, Match)
- ✅ Auto-Login nach erfolgreichem Reset
- ✅ Error-State für ungültige/abgelaufene Tokens
- ✅ Redirect zu Dashboard nach Success
- ✅ Suspense-Boundary für Loading-State

**Validierung:**
- Mindestlänge: 6 Zeichen
- Passwörter müssen übereinstimmen
- Token muss vorhanden sein

**File:** `packages/frontend/src/app/reset-password/page.tsx`

### Datenbank-Schema

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
  @@index([expiresAt])
  @@map("password_reset_tokens")
}
```

**Indizes:**
- `token`: Schnelle Lookup bei Reset
- `userId`: Cleanup alter Tokens
- `expiresAt`: Cleanup-Jobs

**Cascade Delete:**
- Wenn User gelöscht wird, werden alle Reset-Tokens automatisch gelöscht

---

## 2. Login Flow

### Verbesserungen

#### Forgot-Password-Link

**Vorher:**
```tsx
<a href="https://gästefotos.com/wp-login.php?action=lostpassword">
  Passwort vergessen?
</a>
```

**Nachher:**
```tsx
<button onClick={() => router.push('/forgot-password')}>
  Passwort vergessen?
</button>
```

**Vorteile:**
- ✅ In-App Navigation (keine externe Seite)
- ✅ Bessere UX (kein Tab-Wechsel)
- ✅ Konsistentes Branding
- ✅ Volle Kontrolle über Flow

#### Registration-Link

**Vorher:**
```tsx
<div>
  Kein Konto? Bitte auf <strong>gästefotos.com</strong> anlegen.
</div>
```

**Nachher:**
```tsx
<div>
  Kein Konto?{' '}
  <a href="https://gästefotos.com/registrieren" target="_blank">
    Jetzt registrieren
  </a>
</div>
```

**Vorteile:**
- ✅ Klarer Call-to-Action
- ✅ Direkter Link zur Registration
- ✅ Target="_blank" für neue Tab
- ✅ Bessere Conversion

**File:** `packages/frontend/src/app/login/page.tsx`

---

## 3. E2E Tests

### Test-Suite: `auth-flows.spec.ts`

**Testabdeckung:**

#### Password Reset Flow
- ✅ Forgot-Password-Page rendert korrekt
- ✅ Success-Message nach Email-Submit
- ✅ Email-Format-Validierung
- ✅ Navigation zurück zu Login
- ✅ Reset-Password zeigt Error ohne Token
- ✅ Form angezeigt mit gültigem Token
- ✅ Passwort-Match-Validierung
- ✅ Mindestlängen-Validierung

#### Login Page Enhancements
- ✅ Forgot-Password-Link vorhanden und funktional
- ✅ Registration-Link vorhanden und korrekt
- ✅ Alle Navigation-Elemente sichtbar

#### Integration Tests
- ✅ Kompletter Navigation-Flow (Login → Forgot → Reset → Login)
- ✅ API-Integration für Email-Submit
- ✅ Response-Handling

#### UI/UX Tests
- ✅ Proper Styling (Gradient, Border-Radius)
- ✅ Loading States
- ✅ Disabled States während Submit

#### Accessibility Tests
- ✅ Proper Labels mit for-Attributen
- ✅ Meaningful Button-Text
- ✅ Input-IDs korrekt

**File:** `e2e/auth-flows.spec.ts`

**Test ausführen:**
```bash
cd e2e
pnpm playwright test auth-flows.spec.ts
```

---

## 4. Sicherheitsaspekte

### Token-Sicherheit

1. **Kryptographisch sicher:** `crypto.randomBytes(32)` → 64-Zeichen Hex
2. **Einmalige Verwendung:** `usedAt` Timestamp verhindert Replay-Attacks
3. **Zeitliche Begrenzung:** 1 Stunde Gültigkeit
4. **Automatisches Cleanup:** Alte Tokens werden gelöscht

### Rate-Limiting

- **Forgot-Password:** `passwordLimiter` (definiert in `middleware/rateLimit.ts`)
- **Reset-Password:** `passwordLimiter`
- Verhindert Brute-Force und Email-Bombing

### Timing-Attack-Schutz

- Konsistente Response-Zeiten
- Jitter bei Erfolg und Fehler
- Keine Information über Existenz von Email-Adressen

### Password-Hashing

- **Algorithmus:** bcrypt
- **Rounds:** 10 (guter Balance zwischen Sicherheit und Performance)
- **Salting:** Automatisch durch bcrypt

### Email-Security

- **XSS-Protection:** Alle User-Inputs werden escaped
- **SMTP-Security:** TLS/SSL-Verbindung (konfigurierbar)
- **From-Address:** Verifizierbar und branded

---

## 5. User Journey

### Passwort vergessen - Happy Path

1. **User auf Login-Page** → Klickt "Passwort vergessen?"
2. **Forgot-Password-Page** → Gibt Email ein
3. **Email erhalten** → Klickt Reset-Link
4. **Reset-Password-Page** → Gibt neues Passwort ein
5. **Auto-Login** → Redirect zu Dashboard
6. **Fertig** → User ist eingeloggt mit neuem Passwort

### Zeitaufwand
- Total: ~2-3 Minuten (abhängig von Email-Zustellung)
- Email-Zustellung: ~30 Sekunden
- User-Interaktion: ~1 Minute

### Error Cases

**Email existiert nicht:**
- ✅ Keine Information an User (Security)
- ✅ Success-Message trotzdem angezeigt

**Token abgelaufen:**
- ✅ Klare Error-Message
- ✅ Link zu Forgot-Password für neuen Token

**Token bereits verwendet:**
- ✅ Error-Message
- ✅ Schutz vor Replay-Attacks

**Passwort zu kurz:**
- ✅ Client-Side-Validierung (Sofort-Feedback)
- ✅ Server-Side-Validierung (Fallback)

---

## 6. API-Endpoints Übersicht

| Endpoint | Method | Auth | Rate-Limit | Beschreibung |
|----------|--------|------|------------|--------------|
| `/api/auth/forgot-password` | POST | ❌ | ✅ | Reset-Link anfordern |
| `/api/auth/reset-password` | POST | ❌ | ✅ | Passwort zurücksetzen |
| `/api/auth/login` | POST | ❌ | ✅ | User einloggen |
| `/api/auth/register` | POST | ❌ | ✅ | Neuen User registrieren |
| `/api/auth/logout` | POST | ✅ | ❌ | User ausloggen |
| `/api/auth/me` | GET | ✅ | ❌ | Aktuellen User abrufen |

---

## 7. Environment Variables

**Backend (.env):**
```env
# Email-Service (für Password-Reset)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@gästefotos.com
SMTP_PASSWORD=secret
SMTP_FROM=Gästefotos <noreply@gästefotos.com>

# Frontend-URL (für Email-Links)
FRONTEND_URL=https://app.gästefotos.com

# JWT (für Auto-Login nach Reset)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

---

## 8. Deployment Checklist

- [x] Prisma Migration ausgeführt (`db push`)
- [x] SMTP-Credentials konfiguriert
- [x] FRONTEND_URL gesetzt
- [x] E2E Tests erfolgreich
- [x] Frontend Build erfolgreich
- [x] Backend Build erfolgreich
- [ ] Email-Template getestet (Produktion)
- [ ] Rate-Limits verifiziert
- [ ] Monitoring für Failed-Email-Sends

---

## 9. Monitoring & Logging

### Backend-Logs

**Erfolgreicher Flow:**
```
[auth] password reset email sent { userId: 'uuid', email: 'user@example.com' }
[auth] password reset successful { userId: 'uuid', ip: '1.2.3.4' }
```

**Fehler:**
```
[auth] forgot-password: user not found { email: 'unknown@example.com' }
[auth] password reset email failed { userId: 'uuid', error: 'SMTP connection failed' }
[auth] reset-password: invalid or expired token { token: 'abc...', ip: '1.2.3.4' }
```

### Metriken zum Überwachen

1. **Email-Delivery-Rate**: % erfolgreicher Email-Versendungen
2. **Token-Success-Rate**: % erfolgreicher Resets vs. Anfragen
3. **Time-to-Reset**: Durchschnittliche Zeit von Forgot → Reset
4. **Abandoned-Resets**: Tokens angefordert aber nicht verwendet
5. **Failed-Login-After-Reset**: Probleme nach Reset

---

## 10. Troubleshooting

### Email wird nicht versendet

**Checken:**
1. SMTP-Credentials korrekt? → `.env` File
2. SMTP-Host erreichbar? → `telnet smtp.example.com 587`
3. Email-Service konfiguriert? → Backend-Logs
4. Firewall blockiert Port? → Network-Config

**Debug:**
```typescript
// Test Email-Connection
const isConnected = await emailService.testConnection();
console.log('Email-Service:', isConnected ? 'OK' : 'FAILED');
```

### Token ungültig/abgelaufen

**Häufige Ursachen:**
1. User hat Link zu spät geklickt (>1h)
2. Token wurde bereits verwendet
3. User-Account wurde gelöscht

**Lösung:**
- Neuen Reset-Link anfordern
- Token-Gültigkeit erhöhen (nicht empfohlen)

### Auto-Login funktioniert nicht

**Checken:**
1. JWT_SECRET gesetzt?
2. Cookie-Domain korrekt?
3. HTTPS in Produktion?
4. Browser erlaubt Cookies?

---

## 11. Future Improvements

### Geplant
- [ ] Email-Templates via CMS editierbar
- [ ] 2FA-Integration in Reset-Flow
- [ ] Email-Throttling (max. 3 Resets/24h)
- [ ] SMS-basierter Reset als Alternative
- [ ] Passwort-Stärke-Meter
- [ ] Compromised-Password-Check (haveibeenpwned API)

### Nice-to-Have
- [ ] Magic-Link-Login (passwordless)
- [ ] Social-Login-Integration
- [ ] Biometric-Auth für Mobile
- [ ] Session-Management (aktive Sessions anzeigen/beenden)

---

## 12. Related Documentation

- [FEATURES.md](./FEATURES.md) - Gesamtübersicht aller Features
- [TODO_TRACKING.md](../TODO_TRACKING.md) - Offene Aufgaben
- [Email Service](../packages/backend/src/services/email.ts) - Email-Implementation
- [Auth Routes](../packages/backend/src/routes/auth.ts) - Backend API
- [Prisma Schema](../packages/backend/prisma/schema.prisma) - Datenbank-Schema

---

**Letzte Aktualisierung:** Januar 2024  
**Status:** ✅ Implementiert und getestet  
**Version:** 1.0
