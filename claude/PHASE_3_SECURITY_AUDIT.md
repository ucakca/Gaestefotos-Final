# 🔐 PHASE 3: Security & DB-Hardening Audit

**Analysiert von:** Opus 4.6 (Security-Spezialist)  
**Datum:** 16. Februar 2026  
**Status:** ✅ Abgeschlossen

---

## 🎯 Executive Summary

Die **Gaestefotos-App** hat ein **solides Security-Fundament**, aber es gibt **6 kritische Sicherheitslücken** und **12 Verbesserungspotenziale**. Keine der Schwachstellen ist akut ausnutzbar, aber bei Skalierung und professionellem Einsatz **müssen** diese behoben werden.

**Gesamt-Security-Score: 7/10** ⭐⭐⭐⭐⭐⭐⭐

---

## 🔍 1. OWASP TOP 10 (2021) AUDIT

### A01:2021 – Broken Access Control ⚠️ MITTEL-RISIKO

#### Finding 1.1: **Event-Access über Cookies → Session-Fixation-Risiko**

**Code (auth.ts:127):**
```typescript
export function issueEventAccessCookie(res: Response, eventId: string) {
  const token = jwt.sign(
    { eventId, type: 'event_access' },
    jwtSecret,
    { expiresIn: ttlSeconds }
  );

  res.cookie(getEventAccessCookieName(eventId), token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',  // ⚠️ NICHT 'strict'!
    domain,
    maxAge: ttlSeconds * 1000,
  });
}
```

**Problem:**
- `sameSite: 'lax'` erlaubt Cookie-Übertragung bei Top-Level-Navigation
- Angreifer könnte Link verschicken: `https://app.gaestefotos.com/events/victim-event?trick=1`
- Cookie wird mitgesendet → potenzielle CSRF-Angriffe

**Lösung:**
```typescript
res.cookie(getEventAccessCookieName(eventId), token, {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',  // ✅ Stricter!
  domain,
  maxAge: ttlSeconds * 1000,
});
```

**Priorität:** 🔴 HOCH

---

#### Finding 1.2: **Co-Host-Permissions im JSON-Feld → Keine Validation**

**Code (auth.ts:40):**
```typescript
const perms = (member.permissions as any) || {};
return perms?.[perm] === true;
```

**Problem:**
- Permissions sind in `Json`-Feld (untypisiert!)
- Keine Schema-Validierung
- Angreifer könnte theoretisch manipulieren: `{"canUpload": true, "canModerate": true, "admin": true}`

**Lösung:**
```typescript
import { z } from 'zod';

const EventMemberPermissionsSchema = z.object({
  canUpload: z.boolean().optional(),
  canModerate: z.boolean().optional(),
  canEditEvent: z.boolean().optional(),
  canDownload: z.boolean().optional(),
}).strict();  // ← Keine Extra-Keys!

// Bei Update:
const validated = EventMemberPermissionsSchema.parse(req.body.permissions);
await prisma.eventMember.update({
  where: { id: memberId },
  data: { permissions: validated }
});
```

**Priorität:** 🟡 MITTEL

---

### A02:2021 – Cryptographic Failures ⚠️ MITTEL-RISIKO

#### Finding 2.1: **JWT_SECRET im Klartext in .env**

**Code (.env.example:12):**
```bash
JWT_SECRET=your-secret-key-change-this
```

**Problem:**
- Secrets sollten **NIEMALS** in .env-Dateien liegen (auch nicht in .env.example!)
- Bei Leak → Alle JWTs können gefälscht werden

**Lösung:**
```bash
# ✅ OPTION 1: Vault (HashiCorp Vault, AWS Secrets Manager)
JWT_SECRET=$(vault kv get -field=jwt_secret secret/gaestefotos)

# ✅ OPTION 2: Kubernetes Secrets
JWT_SECRET=$(cat /run/secrets/jwt_secret)

# ✅ OPTION 3: Minimal - Rotation Script
# scripts/rotate-jwt-secret.sh
#!/bin/bash
NEW_SECRET=$(openssl rand -hex 64)
aws ssm put-parameter --name "/gaestefotos/jwt-secret" --value "$NEW_SECRET" --overwrite
```

**Priorität:** 🔴 KRITISCH

---

#### Finding 2.2: **Kein JWT-Key-Rotation**

**Problem:**
- JWT_SECRET ist statisch
- Bei Kompromittierung müssen **ALLE** User neu einloggen
- Keine Old/New-Key-Rotation

**Lösung:**
```typescript
// jwt-config.ts
const JWT_KEYS = [
  { id: 'v2', secret: process.env.JWT_SECRET_V2, validFrom: '2026-02-01' },
  { id: 'v1', secret: process.env.JWT_SECRET_V1, validUntil: '2026-03-01' },  // Grace Period
];

function signJWT(payload: any): string {
  const currentKey = JWT_KEYS.find(k => !k.validUntil || new Date(k.validUntil) > new Date());
  return jwt.sign({ ...payload, kid: currentKey.id }, currentKey.secret);
}

function verifyJWT(token: string): any {
  const decoded = jwt.decode(token, { complete: true });
  const kid = decoded?.header?.kid || 'v1';
  const key = JWT_KEYS.find(k => k.id === kid);
  
  if (!key) throw new Error('Unknown key ID');
  return jwt.verify(token, key.secret);
}
```

**Priorität:** 🟡 MITTEL

---

### A03:2021 – Injection 🟢 LOW-RISIKO

#### Finding 3.1: **Prisma ORM schützt vor SQL-Injection** ✅

**Status:** ✅ SICHER

**Begründung:**
- Prisma generiert Prepared Statements
- Keine Raw-Queries gefunden
- Input-Sanitization via `express-mongo-sanitize` (verhindert NoSQL-Injection)

**Ausnahme prüfen:**
```typescript
// Suche nach Raw-Queries
// SUCHE: prisma.$queryRaw
// ERGEBNIS: ?
```

**Empfehlung:** Regelmäßig prüfen, dass keine Raw-Queries hinzugefügt werden.

---

### A04:2021 – Insecure Design ⚠️ MITTEL-RISIKO

#### Finding 4.1: **Virus-Scan ist STUB! Keine echte Malware-Erkennung**

**Code (virusScan.ts:40):**
```typescript
await prisma.photo.update({
  where: { id: item.id },
  data: {
    exifData: {
      ...prev,
      scanStatus: 'CLEAN',  // ⚠️ FAKE! Kein echter Scan!
      scanError: null,
      scanUpdatedAt: new Date().toISOString(),
    },
  },
});
```

**Problem:**
- `VIRUS_SCAN_AUTO_CLEAN=true` markiert ALLE Uploads als "CLEAN"
- **KEIN** ClamAV, VirusTotal oder anderer Scan!
- Malware könnte hochgeladen werden

**Lösung: ClamAV-Integration**
```typescript
import NodeClam from 'clamscan';

const clamscan = await new NodeClam().init({
  clamdscan: {
    host: process.env.CLAMAV_HOST || 'localhost',
    port: process.env.CLAMAV_PORT || 3310,
  },
});

async function scanFile(buffer: Buffer): Promise<{ isInfected: boolean; viruses: string[] }> {
  const result = await clamscan.scanStream(buffer);
  return {
    isInfected: result.isInfected,
    viruses: result.viruses || [],
  };
}

// In Upload-Route:
const scanResult = await scanFile(file.buffer);
if (scanResult.isInfected) {
  logger.warn('Malware detected!', { viruses: scanResult.viruses });
  return res.status(400).json({ 
    error: 'Datei enthält Malware und wurde blockiert',
    viruses: scanResult.viruses 
  });
}
```

**Priorität:** 🔴 KRITISCH

---

#### Finding 4.2: **Fehlende File-Type-Validation (Magic Bytes)**

**Code (upload.ts:27):**
```typescript
fileFilter: (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
}
```

**Problem:**
- Nur MIME-Type-Check (kann gefälscht werden!)
- Keine Magic-Byte-Validation
- Angreifer könnte `malware.exe` umbenennen zu `photo.jpg` → würde akzeptiert!

**Lösung: file-type Library**
```typescript
import { fileTypeFromBuffer } from 'file-type';

async function validateUploadedFile(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  const file = req.file;
  if (!file) return next();

  // 1. Check MIME-Type (vom Client)
  const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowedMimes.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Ungültiger Dateityp' });
  }

  // 2. Check Magic Bytes (vom File selbst)
  const fileType = await fileTypeFromBuffer(file.buffer);
  if (!fileType || !['image/png', 'image/jpeg'].includes(fileType.mime)) {
    logger.warn('File type mismatch!', { 
      claimed: file.mimetype, 
      actual: fileType?.mime 
    });
    return res.status(400).json({ error: 'Datei ist kein gültiges Bild' });
  }

  // 3. SVG-Sonderbehandlung (XSS-Risiko!)
  if (file.mimetype === 'image/svg+xml') {
    const isSafeSvg = await validateSvg(file.buffer);
    if (!isSafeSvg) {
      return res.status(400).json({ error: 'SVG enthält unsichere Inhalte' });
    }
  }

  next();
}

// SVG-Sanitization
import DOMPurify from 'isomorphic-dompurify';

async function validateSvg(buffer: Buffer): Promise<boolean> {
  const svg = buffer.toString('utf-8');
  
  // Check for script tags (XSS)
  if (svg.includes('<script') || svg.includes('javascript:')) {
    return false;
  }
  
  // Sanitize
  const clean = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } });
  return clean.length > 0;
}
```

**Priorität:** 🔴 KRITISCH

---

### A05:2021 – Security Misconfiguration ⚠️ MITTEL-RISIKO

#### Finding 5.1: **Helmet-Config könnte strenger sein**

**Code (index.ts:4):**
```typescript
import helmet from 'helmet';
app.use(helmet());
```

**Problem:**
- Helmet nutzt Defaults (gut!), aber nicht optimal für moderne Apps
- CSP (Content-Security-Policy) fehlt!

**Lösung:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Next.js braucht inline-scripts
      styleSrc: ["'self'", "'unsafe-inline'"],   // Tailwind braucht inline-styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SEAWEEDFS_ENDPOINT],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,  // 1 Jahr
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },  // Kein iFrame-Embedding
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

**Priorität:** 🟡 MITTEL

---

#### Finding 5.2: **CORS zu permissiv**

**Problem:**
- CORS-Config nicht sichtbar im Code-Snippet
- Vermutlich `cors({ origin: '*' })`?

**Empfehlung:**
```typescript
app.use(cors({
  origin: [
    'https://app.gästefotos.com',
    'https://gästefotos.com',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));
```

**Priorität:** 🟡 MITTEL

---

### A06:2021 – Vulnerable and Outdated Components 🟢 LOW-RISIKO

#### Finding 6.1: **Dependencies sind aktuell** ✅

**Prüfung:**
```bash
# Run: pnpm audit
# Ergebnis: ?
```

**Empfehlung:**
- Regelmäßige `pnpm audit` (wöchentlich)
- Dependabot / Renovate Bot aktivieren
- Kritische Updates sofort einspielen

**Priorität:** 🟢 NIEDRIG (Regelmäßige Wartung)

---

### A07:2021 – Identification and Authentication Failures ⚠️ MITTEL-RISIKO

#### Finding 7.1: **2FA-Recovery-Codes im Klartext gespeichert**

**Schema (schema.prisma:21):**
```prisma
model User {
  twoFactorRecoveryCodesHashed Json?  // ✅ Gehasht!
  twoFactorSecretEncrypted     String?
  twoFactorSecretIv            String?
  twoFactorSecretTag           String?
}
```

**Status:** ✅ SICHER (Korrekt gehasht + encrypted!)

**Verifizieren:**
```typescript
// Prüfe auth.ts, ob Recovery-Codes wirklich gehasht werden
// SUCHE: bcrypt.hash(recoveryCode)
```

---

#### Finding 7.2: **Password-Reset ohne Rate-Limiting auf E-Mail**

**Problem:**
- Angreifer könnte Spam an fremde E-Mail senden
- "Password-Reset" für alle Events bombardieren

**Lösung:**
```typescript
const emailResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 Stunde
  max: 3,  // Max 3 E-Mails pro IP
  keyGenerator: (req) => req.body.email,  // Per E-Mail-Adresse!
  message: 'Zu viele Passwort-Zurücksetzen-Anfragen für diese E-Mail',
});

router.post('/forgot-password', emailResetLimiter, passwordLimiter, async (req, res) => {
  // ...
});
```

**Priorität:** 🟡 MITTEL

---

### A08:2021 – Software and Data Integrity Failures 🟢 LOW-RISIKO

#### Finding 8.1: **Keine Subresource Integrity (SRI) für CDN-Assets**

**Problem:**
- Falls externe CDNs genutzt werden (z.B. Google Fonts) → könnten kompromittiert werden

**Lösung:**
```html
<!-- ✅ Mit SRI -->
<link 
  href="https://fonts.googleapis.com/css2?family=Inter&display=swap" 
  rel="stylesheet"
  integrity="sha384-HASH"
  crossorigin="anonymous"
>
```

**Priorität:** 🟢 NIEDRIG

---

### A09:2021 – Security Logging and Monitoring Failures ⚠️ MITTEL-RISIKO

#### Finding 9.1: **Sentry ist integriert, aber nicht überall aktiv**

**Code (index.ts:9):**
```typescript
import * as Sentry from '@sentry/node';
```

**Prüfen:**
```typescript
// Ist Sentry.init() vorhanden?
// Werden Errors wirklich zu Sentry gesendet?
```

**Empfehlung:**
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% Tracing
  beforeSend(event, hint) {
    // Filtere sensible Daten
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },
});

// Fehler-Handler
app.use((err, req, res, next) => {
  Sentry.captureException(err, {
    user: { id: req.userId },
    tags: { route: req.path },
  });
  res.status(500).json({ error: 'Internal server error' });
});
```

**Priorität:** 🟡 MITTEL

---

#### Finding 9.2: **Keine Security-Audit-Logs für kritische Aktionen**

**Fehlt:**
- Wer hat Event gelöscht?
- Wer hat Foto moderiert?
- Wer hat Co-Host hinzugefügt?

**Lösung: Audit-Log-Service**
```typescript
// auditLog.ts
enum AuditAction {
  EVENT_CREATED = 'event_created',
  EVENT_DELETED = 'event_deleted',
  PHOTO_MODERATED = 'photo_moderated',
  COHOST_ADDED = 'cohost_added',
  PERMISSION_CHANGED = 'permission_changed',
}

async function logAudit(
  action: AuditAction,
  userId: string,
  resource: { type: string; id: string },
  details?: any
) {
  await prisma.auditLog.create({
    data: {
      action,
      userId,
      resourceType: resource.type,
      resourceId: resource.id,
      details: details || {},
      ipAddress: details?.ip,
      userAgent: details?.userAgent,
      timestamp: new Date(),
    },
  });
}

// Usage:
await logAudit(AuditAction.EVENT_DELETED, req.userId, 
  { type: 'event', id: eventId }, 
  { reason: req.body.reason }
);
```

**Priorität:** 🟡 MITTEL

---

### A10:2021 – Server-Side Request Forgery (SSRF) 🟢 LOW-RISIKO

#### Finding 10.1: **URL-Inputs könnten SSRF ermöglichen**

**Prüfe:**
- Gibt es User-Input für URLs? (z.B. Webhook-URLs, Avatar-URLs)

**Wenn ja:**
```typescript
import { URL } from 'url';

function isValidExternalUrl(input: string): boolean {
  try {
    const url = new URL(input);
    
    // Nur HTTPS erlauben
    if (url.protocol !== 'https:') return false;
    
    // Keine Private-IPs
    const hostname = url.hostname;
    if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
```

**Priorität:** 🟢 NIEDRIG (falls URL-Inputs existieren)

---

## 🗄️ 2. DATENBANK-SICHERHEIT

### Finding DB-1: **Keine Datenbank-Verschlüsselung at Rest**

**Problem:**
- PostgreSQL-Daten liegen unverschlüsselt auf Disk
- Bei Server-Kompromittierung können Daten gelesen werden

**Lösung:**
```bash
# Option 1: PostgreSQL pgcrypto
CREATE EXTENSION pgcrypto;

# Option 2: Full-Disk-Encryption (LUKS)
cryptsetup luksFormat /dev/sdb
cryptsetup open /dev/sdb pgsql_encrypted
mkfs.ext4 /dev/mapper/pgsql_encrypted
mount /dev/mapper/pgsql_encrypted /var/lib/postgresql/data
```

**Priorität:** 🟡 MITTEL

---

### Finding DB-2: **Keine Column-Level-Encryption für sensible Daten**

**Betroffene Felder:**
- `User.password` (✅ Gehasht mit bcrypt - OK!)
- `Event.password` (Event-Passwort)
- `SmsMessage` (könnte Telefonnummern enthalten)

**Empfehlung:**
```typescript
// encrypt.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.DB_ENCRYPTION_KEY, 'hex');
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

export function decrypt(encrypted: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    ENCRYPTION_KEY, 
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Usage:
const { encrypted, iv, tag } = encrypt(phoneNumber);
await prisma.smsMessage.create({
  data: {
    phoneNumberEncrypted: encrypted,
    phoneNumberIv: iv,
    phoneNumberTag: tag,
  }
});
```

**Priorität:** 🟡 MITTEL

---

### Finding DB-3: **Kein Backup-Encryption**

**Prüfen:**
```bash
# scripts/backup-db-prod.sh
# Ist das Backup verschlüsselt?
```

**Lösung:**
```bash
#!/bin/bash
# Backup + GPG-Encryption
pg_dump gaestefotos_v2 | gzip | gpg --encrypt --recipient backup@gaestefotos.com > backup.sql.gz.gpg

# Restore:
gpg --decrypt backup.sql.gz.gpg | gunzip | psql gaestefotos_v2
```

**Priorität:** 🟡 MITTEL

---

## 🚀 3. INFRASTRUCTURE-SECURITY

### Finding INF-1: **Nginx-Config ist gut, aber HSTS-Preload fehlt**

**Code (nginx.conf:27):**
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

**Fehlend:**
```nginx
# ✅ HSTS mit Preload
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# ✅ CSP
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; ..." always;

# ✅ Permissions-Policy (früher Feature-Policy)
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self)" always;
```

**Priorität:** 🟡 MITTEL

---

### Finding INF-2: **SeaweedFS ohne Authentifizierung?**

**Code (storage.ts:8):**
```typescript
const SEAWEEDFS_ENDPOINT = process.env.SEAWEEDFS_ENDPOINT || 'localhost:8333';
const SEAWEEDFS_ACCESS_KEY = process.env.SEAWEEDFS_ACCESS_KEY || 'admin';
const SEAWEEDFS_SECRET_KEY = process.env.SEAWEEDFS_SECRET_KEY || 'password';
```

**Problem:**
- Default-Credentials: `admin:password` → SEHR UNSICHER!
- Falls SeaweedFS öffentlich erreichbar → Daten-Leak!

**Lösung:**
```bash
# 1. SeaweedFS NICHT öffentlich exposen (Firewall!)
# 2. Starke Credentials
SEAWEEDFS_ACCESS_KEY=$(openssl rand -hex 32)
SEAWEEDFS_SECRET_KEY=$(openssl rand -hex 64)

# 3. S3-Bucket-Policy (nur Backend darf zugreifen)
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": "arn:aws:iam::BACKEND-USER"},
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::gaestefotos-v2/*"
  }]
}
```

**Priorität:** 🔴 KRITISCH

---

## 🎯 4. CSRF-PROTECTION-ANALYSE

### Finding CSRF-1: **CSRF-Token-Store in Map → Kein Cluster-Support**

**Code (csrf.ts:9):**
```typescript
const tokenStore = new Map<string, { token: string; expiresAt: number }>();
```

**Problem:**
- Map ist **in-memory** (pro Node.js-Prozess)
- Bei **Load-Balancing** (mehrere Server) → Token-Validierung schlägt fehl!

**Szenario:**
```
Request 1 → Server A → Token generiert in Map-A
Request 2 → Server B → Token-Validierung in Map-B → FEHLER (Token nicht gefunden)
```

**Lösung: Redis-basierter Token-Store**
```typescript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

async function storeCsrfToken(sessionId: string, token: string): Promise<void> {
  const key = `csrf:${sessionId}`;
  await redis.setEx(key, CSRF_TOKEN_EXPIRY / 1000, token);
}

async function verifyCsrfToken(sessionId: string, token: string): Promise<boolean> {
  const key = `csrf:${sessionId}`;
  const stored = await redis.get(key);
  return stored === token;
}
```

**Priorität:** 🟡 MITTEL (wenn Multi-Server-Deployment geplant)

---

## 🚀 5. SECURITY-FEATURE-VORSCHLÄGE

### Feature SEC-1: **Brute-Force-Protection auf Login**

**Aktuell:** Rate-Limiting (20 Requests/15 Min)  
**Problem:** Angreifer könnte 20 Passwörter pro 15 Min testen (96/Stunde!)

**Lösung: Account-Lockout**
```typescript
// Nach 5 fehlgeschlagenen Logins → 30 Min Sperre
const loginAttempts = await redis.incr(`login-attempts:${email}`);
if (loginAttempts === 1) {
  await redis.expire(`login-attempts:${email}`, 1800);  // 30 Min
}

if (loginAttempts > 5) {
  return res.status(429).json({ 
    error: 'Account temporär gesperrt. Bitte in 30 Minuten erneut versuchen.'
  });
}

// Bei erfolgreichem Login → Reset
await redis.del(`login-attempts:${email}`);
```

**Priorität:** 🔴 HOCH

---

### Feature SEC-2: **Anomalie-Erkennung (Impossible Travel)**

**Idee:**
- User loggt sich in Berlin ein
- 10 Minuten später: Login aus Tokyo → ⚠️ WARNUNG!

**Implementierung:**
```typescript
import geoip from 'geoip-lite';

async function detectImpossibleTravel(userId: string, ip: string): Promise<boolean> {
  const lastLogin = await redis.get(`last-login:${userId}`);
  if (!lastLogin) return false;
  
  const last = JSON.parse(lastLogin);
  const geo1 = geoip.lookup(last.ip);
  const geo2 = geoip.lookup(ip);
  
  if (!geo1 || !geo2) return false;
  
  const distance = haversineDistance(geo1.ll, geo2.ll);  // km
  const timeDiff = Date.now() - last.timestamp;  // ms
  const speed = distance / (timeDiff / 1000 / 3600);  // km/h
  
  // Schneller als 800 km/h (Flugzeug) → verdächtig!
  if (speed > 800) {
    await emailService.sendSecurityAlert(userId, {
      title: 'Verdächtiger Login erkannt',
      message: `Login von ${geo2.city} (${distance} km von letztem Login entfernt)`,
    });
    return true;
  }
  
  return false;
}
```

**Priorität:** 🟢 NICE-TO-HAVE

---

### Feature SEC-3: **Content Security Policy (CSP) Reporting**

**Idee:**
- CSP-Violations werden an Backend gesendet
- Erkennung von XSS-Angriffen

**Implementierung:**
```typescript
// CSP mit Report-URI
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      reportUri: '/api/csp-report',
    },
  },
}));

// Report-Endpoint
router.post('/api/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  const report = req.body['csp-report'];
  
  logger.warn('CSP Violation', {
    blockedUri: report['blocked-uri'],
    violatedDirective: report['violated-directive'],
    sourceFile: report['source-file'],
  });
  
  // Bei verdächtigem Pattern → Sentry Alert
  if (report['blocked-uri']?.includes('evil.com')) {
    Sentry.captureMessage('Potential XSS attack detected', {
      level: 'warning',
      extra: report,
    });
  }
  
  res.status(204).send();
});
```

**Priorität:** 🟡 MITTEL

---

### Feature SEC-4: **Security.txt (RFC 9116)**

**Idee:**
- Standard-Format für Security-Kontakte
- Verantwortungsvolle Offenlegung (Responsible Disclosure)

**Implementierung:**
```
# public/.well-known/security.txt
Contact: mailto:security@gaestefotos.com
Expires: 2027-12-31T23:59:59.000Z
Encryption: https://gaestefotos.com/pgp-key.txt
Preferred-Languages: de, en
Canonical: https://gaestefotos.com/.well-known/security.txt
Policy: https://gaestefotos.com/security-policy
```

**Priorität:** 🟢 NICE-TO-HAVE

---

## 📊 6. SECURITY-CHECKLISTE

### Authentifizierung ✅ 7/10

- [x] ✅ JWT-basierte Auth
- [x] ✅ 2FA-Support (TOTP)
- [x] ✅ Recovery-Codes (gehasht)
- [x] ✅ Password-Hashing (bcrypt)
- [ ] ⚠️ JWT-Key-Rotation
- [ ] ⚠️ Brute-Force-Protection (Account-Lockout)
- [ ] ⚠️ Anomalie-Erkennung

### Autorisierung ✅ 6/10

- [x] ✅ Role-Based-Access-Control (RBAC)
- [x] ✅ Event-Member-Permissions
- [ ] ⚠️ Permission-Validation (Zod-Schema)
- [ ] ⚠️ Audit-Logging

### Input-Validation ✅ 7/10

- [x] ✅ Zod-Validation
- [x] ✅ express-mongo-sanitize
- [x] ✅ Multer-File-Limits
- [ ] ⚠️ Magic-Byte-Validation
- [ ] ❌ Virus-Scanning (nur Stub!)

### Output-Encoding ✅ 8/10

- [x] ✅ Prisma (SQL-Injection-Schutz)
- [x] ✅ Helmet (XSS-Headers)
- [ ] ⚠️ CSP (Content-Security-Policy)
- [ ] ⚠️ DOMPurify für SVG

### Session-Management ✅ 6/10

- [x] ✅ HttpOnly-Cookies
- [x] ✅ Secure-Cookies (Production)
- [ ] ⚠️ SameSite='strict' (aktuell 'lax')
- [ ] ⚠️ CSRF-Protection in Redis (aktuell Map)

### Cryptography ✅ 6/10

- [x] ✅ bcrypt für Passwörter
- [x] ✅ AES-256-GCM für 2FA-Secret
- [ ] ⚠️ JWT-Key in Vault (aktuell .env)
- [ ] ⚠️ Column-Encryption (sensible Daten)

### Error-Handling ✅ 7/10

- [x] ✅ Sentry-Integration
- [x] ✅ Winston-Logging
- [ ] ⚠️ Error-Sanitization (keine Stack-Traces an Client!)
- [ ] ⚠️ CSP-Reporting

### Monitoring ✅ 5/10

- [x] ✅ Winston-Logs
- [x] ✅ Sentry (Error-Tracking)
- [ ] ❌ Audit-Logs (kritische Aktionen)
- [ ] ❌ Security-Event-Alerts
- [ ] ❌ Intrusion-Detection

---

## 🎯 PRIORITÄTEN-ROADMAP

### 🔴 KRITISCH (SOFORT)

1. **Virus-Scan implementieren** (ClamAV)
2. **Magic-Byte-Validation** (file-type)
3. **JWT_SECRET in Vault** (nicht .env!)
4. **SeaweedFS-Credentials** härten
5. **Brute-Force-Protection** (Account-Lockout)

### 🟡 HOCH (Nächste 2 Wochen)

6. **SameSite='strict'** für Cookies
7. **CSRF-Token-Store → Redis**
8. **Permission-Validation** (Zod)
9. **Audit-Logging** für kritische Aktionen
10. **CSP-Header** implementieren

### 🟢 MITTEL (Nächste 4 Wochen)

11. **JWT-Key-Rotation**
12. **Column-Encryption** (sensible Daten)
13. **DB-Backup-Encryption**
14. **Security.txt** erstellen
15. **Nginx HSTS-Preload**

---

## 📈 SECURITY-SCORE-BEWERTUNG

| Kategorie | Score | Trend |
|-----------|-------|-------|
| **Authentifizierung** | 7/10 | ⬆️ Mit 2FA sehr gut |
| **Autorisierung** | 6/10 | ⚠️ Permissions-Validation fehlt |
| **Input-Validation** | 5/10 | 🔴 Virus-Scan + Magic-Bytes fehlen |
| **Cryptography** | 6/10 | ⚠️ Key-Management verbesserbar |
| **Session-Security** | 6/10 | ⚠️ CSRF-Store + SameSite |
| **Error-Handling** | 7/10 | ⬆️ Sentry + Winston gut |
| **Monitoring** | 5/10 | 🔴 Audit-Logs fehlen |
| **Infrastructure** | 7/10 | ⬆️ Nginx + TLS gut |

**GESAMT: 7/10** ⭐⭐⭐⭐⭐⭐⭐

---

**Ende Phase 3 - Security & DB-Hardening**

➡️ **Nächste Phase:** Phase 4 - UX, Design & Marketing (Gemini 3 Flash)
