# 🚀 PRODUKTIV-TESTS: Erweiterte Spezifikation mit meinen Findings

**Datum:** 2026-01-11  
**Basis:** PLAYWRIGHT_SPEC_FOR_SONNET.md (von Windsurf)  
**Ergänzt um:** Deep-Audit Findings (Sonnet 4.5)  
**Test-Credentials:**
- Admin: `test@admin.at` / `!qwerT123!`
- Host: `test@host.at` / `!qwerT123!`

---

## 📋 ÜBERSICHT: Windsurf-Suites + Meine Ergänzungen

### Windsurf Test-Suites (aus PLAYWRIGHT_SPEC):

| **Suite** | **Name** | **Priorität** | **Aufwand** | **Status** |
|-----------|----------|---------------|-------------|------------|
| A | Slow User Flow (Oma-Szenario) | ⚠️ P1 | 2h | 📝 Spezifiziert |
| B | Mass Upload + Visibility | 🔴 P0 | 4h | 📝 Spezifiziert |
| C | Moderation Layout-Shift | 🔴 P0 | 3h | 📝 Spezifiziert |
| D | Network Chaos | 🔴 P0 | 3h | 📝 Spezifiziert |
| E | Guestbook Edge Cases | ⚠️ P1 | 2h | 📝 Spezifiziert |
| F | Video Upload Slow (Bonus) | ⚠️ P2 | 3h | 📝 Spezifiziert |

**Gesamt:** 17 Stunden (Windsurf-Plan)

---

### Meine zusätzlichen Tests (aus Deep-Audit):

| **Suite** | **Name** | **Priorität** | **Aufwand** | **Ergänzt** |
|-----------|----------|---------------|-------------|-------------|
| **G** | **Multi-Environment Isolation** | 🔴 P0 | 2h | ✅ NEU |
| **H** | **Load Test (500 Concurrent Users)** | 🔴 P0 | 2h | ✅ NEU |
| **I** | **Security Tests (SQL/XSS/CSRF)** | 🔴 P0 | 1h | ✅ NEU |
| **J** | **Tus Resumable Upload** | 🔴 P0 | 2h | ✅ NEU |
| **K** | **Original-Quality Storage** | ⚠️ P1 | 1h | ✅ NEU |
| **L** | **EXIF/GPS Privacy** | ⚠️ P1 | 1h | ✅ NEU |

**Zusätzlich:** 9 Stunden (Sonnet-Ergänzungen)

**GESAMT:** 26 Stunden Test-Aufwand

---

## 📊 VERGLEICH: Windsurf vs. Sonnet Tests

### Overlaps (was Windsurf SCHON abdeckt):

| **Mein Test** | **Windsurf-Suite** | **Overlap?** |
|---------------|---------------------|--------------|
| Foto-Upload (verschiedene Größen) | Suite B (Mass Upload) | ✅ 80% |
| Verbindungsabbruch | Suite D (Network Chaos) | ✅ 90% |
| Rate-Limiting | Suite D (Network Chaos) | ⚠️ 50% |
| Upload-Retry | Suite D (Network Chaos) | ✅ 70% |
| Live Wall Realtime | Suite B (Visibility) | ✅ 60% |

**Fazit:** Windsurf hat schon SEHR viel abgedeckt! ✅

---

### Was Windsurf NICHT abdeckt (meine Ergänzungen):

| **Mein Test** | **Windsurf hat das?** | **Kritikalität** |
|---------------|----------------------|------------------|
| **Multi-Environment Isolation** | ❌ FEHLT | 🔴 KRITISCH |
| **Load Test (500 Users)** | ❌ FEHLT | 🔴 KRITISCH |
| **SQL-Injection Tests** | ❌ FEHLT | 🔴 KRITISCH |
| **Tus Resumable Upload** | ⚠️ Teilweise (Network Chaos) | 🔴 KRITISCH |
| **Original-Quality Download** | ❌ FEHLT | ⚠️ WICHTIG |
| **EXIF/GPS Stripping** | ❌ FEHLT | ⚠️ WICHTIG |
| **Dashboard Realtime** | ❌ FEHLT | ⚠️ WICHTIG |
| **Storage-Lock Policy** | ❌ FEHLT | ⚠️ WICHTIG |

---

## 🔥 SUITE G: Multi-Environment Isolation Tests (NEU)

**Priorität:** 🔴 P0 (KRITISCH)  
**Aufwand:** 2 Stunden  
**Ziel:** Verifizieren dass Prod/Staging komplett isoliert sind

### Test G.1: S3-Bucket Isolation
**Warum wichtig?** Staging-Test könnte Prod-Daten löschen!

```typescript
test('G.1: S3 buckets are separate', async ({ request }) => {
  // Setup: Erstelle Test-Foto in Staging
  const stagingUpload = await request.post(
    'https://staging.app.gästefotos.com/api/events/:id/photos/upload',
    { /* ... */ }
  );
  const stagingPhotoId = (await stagingUpload.json()).photo.id;

  // Test: Foto sollte NICHT in Production sichtbar sein
  const prodPhotos = await request.get(
    'https://app.gästefotos.com/api/events/:id/photos'
  );
  const prodPhotoIds = (await prodPhotos.json()).photos.map(p => p.id);
  
  expect(prodPhotoIds).not.toContain(stagingPhotoId);
  
  // Cleanup: Staging-Foto löschen
});
```

**Erwartetes Ergebnis:** ✅ Buckets sind getrennt  
**Falls Fail:** 🔥 **KRITISCHER BUG!** (Datenverlust-Risiko!)

---

### Test G.2: JWT-Token Isolation
**Warum wichtig?** Prod-Token könnte auf Staging funktionieren!

```typescript
test('G.2: JWT tokens are environment-specific', async ({ request }) => {
  // Login auf Production
  const prodLogin = await request.post(
    'https://app.gästefotos.com/api/auth/login',
    { data: { email: 'test@host.at', password: '!qwerT123!' } }
  );
  const prodToken = (await prodLogin.json()).token;

  // Versuch: Prod-Token auf Staging nutzen
  const stagingAuth = await request.get(
    'https://staging.app.gästefotos.com/api/auth/me',
    { headers: { Authorization: `Bearer ${prodToken}` } }
  );

  expect(stagingAuth.status()).toBe(401); // Unauthorized!
});
```

**Erwartetes Ergebnis:** ✅ Token wird abgelehnt  
**Falls Fail:** 🔥 **SECURITY-RISK!**

---

### Test G.3: Cookie-Domain Isolation
**Warum wichtig?** Session-Conflict zwischen Prod/Staging!

```typescript
test('G.3: Cookies are environment-specific', async ({ page }) => {
  // Login auf Production
  await page.goto('https://app.gästefotos.com/login');
  await page.fill('[name="email"]', 'test@host.at');
  await page.fill('[name="password"]', '!qwerT123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/);

  // Cookies auslesen
  const prodCookies = await page.context().cookies();
  const authCookie = prodCookies.find(c => c.name === 'auth_token');
  
  expect(authCookie?.domain).toBe('.xn--gstefotos-v2a.com');

  // Login auf Staging (neue Page)
  const stagingPage = await page.context().newPage();
  await stagingPage.goto('https://staging.app.gästefotos.com/login');
  // ... Login ...

  const stagingCookies = await stagingPage.context().cookies();
  const stagingAuthCookie = stagingCookies.find(c => c.name === 'auth_token');
  
  expect(stagingAuthCookie?.domain).toBe('.staging.xn--gstefotos-v2a.com');
  
  // Beide Cookies sollten koexistieren können
  expect(authCookie?.value).not.toBe(stagingAuthCookie?.value);
});
```

**Erwartetes Ergebnis:** ✅ Separate Cookie-Domains  
**Falls Fail:** ⚠️ Session-Conflict!

---

## 🔥 SUITE H: Load Test (500 Concurrent Users) (NEU)

**Priorität:** 🔴 P0 (KRITISCH)  
**Aufwand:** 2 Stunden  
**Ziel:** System unter realistischer Event-Last testen

### Test H.1: Baseline (50 Users)
**Artillery Config:**
```yaml
# e2e/load-tests/baseline-50.yml
config:
  target: https://app.gästefotos.com
  phases:
    - duration: 120
      arrivalRate: 5  # 50 User über 2 Minuten

scenarios:
  - name: Gast-Flow
    weight: 80
    flow:
      - get:
          url: /e/{{ $randomString() }}
      - think: 3
      - post:
          url: /api/events/{{ eventId }}/photos/upload
          beforeRequest: uploadPhoto
      - think: 5

  - name: Admin-Flow
    weight: 20
    flow:
      - post:
          url: /api/auth/login
          json:
            email: test@host.at
            password: !qwerT123!
      - get:
          url: /api/events
```

**Erfolgs-Kriterium:**
- ✅ p95 Response Time < 500ms
- ✅ Error Rate < 1%
- ✅ CPU < 50%

---

### Test H.2: Peak Load (500 Users)
**Warum wichtig?** Realistische Hochzeit mit 500 Gästen!

```yaml
# e2e/load-tests/peak-500.yml
config:
  target: https://app.gästefotos.com
  phases:
    - duration: 60
      arrivalRate: 5   # Warm-up
    - duration: 180
      arrivalRate: 20  # Ramp-up
    - duration: 300
      arrivalRate: 50  # PEAK: 500 User/10 Sekunden!

scenarios:
  - name: Browse Gallery
    weight: 60
    flow:
      - get: /e/{{ eventSlug }}
      - think: 5
      - get: /api/events/{{ eventId }}/photos

  - name: Upload Photo
    weight: 30
    flow:
      - post:
          url: /api/events/{{ eventId }}/photos/upload
          # Tus-Upload simulieren

  - name: Live Wall
    weight: 10
    flow:
      - get: /live/{{ eventSlug }}/wall
      - think: 30
```

**Erfolgs-Kriterium:**
- ✅ p95 Response Time < 2s
- ✅ Error Rate < 5%
- ✅ Keine Server-Crashes
- ✅ CPU < 80%
- ✅ RAM < 50 GB

**Falls Fail:** 🔥 Skalierungs-Problem!

---

### Test H.3: Socket.io Stress (500 Connections)
**Warum wichtig?** Live Wall muss für alle funktionieren!

```typescript
// e2e/load-tests/socket-stress.ts
import io from 'socket.io-client';

test('H.3: 500 Socket.io connections', async () => {
  const sockets = [];
  const eventId = 'test-event-id';

  for (let i = 0; i < 500; i++) {
    const socket = io('https://app.gästefotos.com', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    await new Promise((resolve) => {
      socket.on('connect', () => {
        socket.emit('join:event', eventId);
        resolve(true);
      });
    });

    sockets.push(socket);
  }

  console.log(`✅ ${sockets.length} Sockets connected!`);

  // Trigger Event: Upload Foto
  const uploadResponse = await fetch('/api/events/.../upload', { /* ... */ });

  // Warte auf Realtime-Update bei allen Clients
  let receivedCount = 0;
  await new Promise((resolve) => {
    sockets.forEach(socket => {
      socket.on('photo_uploaded', () => {
        receivedCount++;
        if (receivedCount === 500) resolve(true);
      });
    });

    setTimeout(resolve, 5000); // Timeout nach 5s
  });

  expect(receivedCount).toBe(500); // Alle haben Update erhalten!

  // Cleanup
  sockets.forEach(s => s.disconnect());
});
```

**Erwartetes Ergebnis:** ✅ Alle 500 Clients empfangen Update  
**Falls Fail:** 🔥 Socket.io skaliert nicht!

---

## 🔥 SUITE I: Security Tests (NEU)

**Priorität:** 🔴 P0 (KRITISCH)  
**Aufwand:** 1 Stunde  
**Ziel:** Sicherheits-Lücken finden

### Test I.1: SQL-Injection Versuche
```typescript
test('I.1: SQL Injection protection', async ({ request }) => {
  const maliciousInputs = [
    "test'; DROP TABLE users;--",
    "1' OR '1'='1",
    "admin'--",
    "'; DELETE FROM events WHERE '1'='1'--",
  ];

  for (const input of maliciousInputs) {
    // Test 1: Event-Slug
    const res1 = await request.get(`/api/events/slug/${input}`);
    expect([400, 404]).toContain(res1.status()); // NICHT 500!

    // Test 2: Query-Parameter
    const res2 = await request.get(`/api/events?search=${input}`);
    expect(res2.ok()).toBeTruthy(); // Prisma escaped!
  }
});
```

**Erwartetes Ergebnis:** ✅ Keine SQL-Injection möglich (Prisma!)  
**Falls Fail:** 🔥 **KRITISCHER SECURITY-BUG!**

---

### Test I.2: XSS Protection
```typescript
test('I.2: XSS protection in user inputs', async ({ page, request }) => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror="alert(1)">',
    '"><script>document.cookie</script>',
  ];

  // Login als Gast
  await page.goto('/e/test-event');

  for (const payload of xssPayloads) {
    // Upload Foto mit XSS im Namen
    await page.fill('[name="uploaderName"]', payload);
    await page.setInputFiles('input[type="file"]', 'test.jpg');
    await page.click('button:has-text("Hochladen")');

    // Warte auf Upload-Erfolg
    await page.waitForSelector('text=Upload erfolgreich');

    // Öffne Foto-Detail
    await page.click(`img[alt*="${payload}"]`);

    // Check: Script sollte NICHT im DOM sein
    const scriptTags = await page.locator('script').count();
    const dangerousScripts = await page.locator(
      `script:has-text("${payload}")`
    ).count();

    expect(dangerousScripts).toBe(0); // React hat escaped!
  }
});
```

**Erwartetes Ergebnis:** ✅ Keine XSS möglich  
**Falls Fail:** 🔥 **KRITISCHER SECURITY-BUG!**

---

### Test I.3: CSRF Protection
```typescript
test('I.3: CSRF protection on state-changing requests', async ({ request }) => {
  // Login und Token holen
  const loginRes = await request.post('/api/auth/login', {
    data: { email: 'test@host.at', password: '!qwerT123!' },
  });
  const cookies = await loginRes.headers()['set-cookie'];

  // Versuch: POST ohne korrekten Origin
  const maliciousRequest = await request.post('/api/events', {
    headers: {
      'Origin': 'https://evil.com',
      'Cookie': cookies,
    },
    data: { title: 'Evil Event' },
  });

  expect(maliciousRequest.status()).toBe(403); // Forbidden (CSRF protection)!
});
```

**Erwartetes Ergebnis:** ✅ CSRF-Schutz aktiv  
**Falls Fail:** 🔥 **KRITISCHER SECURITY-BUG!**

---

### Test I.4: Rate-Limiting Bypass-Versuche
```typescript
test('I.4: Rate limiting cannot be bypassed', async ({ request }) => {
  const attempts = [];

  // 20× Login-Versuche (Limit ist 10/15min)
  for (let i = 0; i < 20; i++) {
    const res = await request.post('/api/auth/login', {
      data: { email: 'wrong@test.com', password: 'wrong' },
    });
    attempts.push(res.status());
  }

  // Nach ~10 Versuchen sollte 429 kommen
  const rateLimited = attempts.filter(s => s === 429).length;
  expect(rateLimited).toBeGreaterThan(5); // Mind. 5× geblockt

  // Test: IP-Wechsel simulieren (Header ändern)
  const withFakeIp = await request.post('/api/auth/login', {
    headers: { 'X-Forwarded-For': '1.2.3.4' },
    data: { email: 'wrong@test.com', password: 'wrong' },
  });

  // Rate-Limiter sollte TROTZDEM greifen (kein Bypass via Header!)
  expect(withFakeIp.status()).toBe(429);
});
```

**Erwartetes Ergebnis:** ✅ Rate-Limiting nicht bypassbar  
**Falls Fail:** 🔥 DDoS-Anfällig!

---

## 🔥 SUITE J: Tus Resumable Upload (NEU)

**Priorität:** 🔴 P0 (KRITISCH)  
**Aufwand:** 2 Stunden  
**Ziel:** Tus-Integration vollständig testen

### Test J.1: Tus Upload (kleines Foto)
```typescript
test('J.1: Tus upload completes successfully', async ({ page }) => {
  await page.goto('/e/test-event');
  await page.fill('[name="uploaderName"]', 'Tus-Test-User');

  // File-Input mit Tus-Handler
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-5mb.jpg');

  // Warte auf Tus-Upload (Progress-Updates beobachten)
  const progressBar = page.locator('[role="progressbar"]');
  
  // Check: Progress steigt von 0 → 100%
  await expect(progressBar).toBeVisible();
  await page.waitForFunction(() => {
    const bar = document.querySelector('[role="progressbar"]');
    return bar?.getAttribute('aria-valuenow') === '100';
  }, { timeout: 60_000 });

  // Erfolg-Nachricht
  await expect(page.getByText(/Upload erfolgreich/i)).toBeVisible();
});
```

**Erwartetes Ergebnis:** ✅ Tus-Upload funktioniert  
**Falls Fail:** 🔥 Tus nicht aktiv!

---

### Test J.2: Tus Resume nach Verbindungsabbruch
**Warum wichtig?** Haupt-Feature von Tus!

```typescript
test('J.2: Tus resumes after connection loss', async ({ page, context }) => {
  await page.goto('/e/test-event');
  await page.fill('[name="uploaderName"]', 'Resume-Test');

  // Starte Upload (großes Foto: 50 MB)
  await page.setInputFiles('input[type="file"]', 'test-50mb.jpg');

  // Warte bis 30% Upload
  await page.waitForFunction(() => {
    const bar = document.querySelector('[role="progressbar"]');
    const value = parseInt(bar?.getAttribute('aria-valuenow') || '0');
    return value >= 30;
  }, { timeout: 30_000 });

  // SIMULIERE VERBINDUNGSABBRUCH: Offline gehen
  await context.setOffline(true);
  
  // Warte 2 Sekunden
  await page.waitForTimeout(2000);

  // WIEDER ONLINE
  await context.setOffline(false);

  // Check: Upload wird fortgesetzt (NICHT bei 0% neu gestartet!)
  const progressAfterResume = await page.locator('[role="progressbar"]')
    .getAttribute('aria-valuenow');
  
  expect(parseInt(progressAfterResume || '0')).toBeGreaterThan(30); // Fortgesetzt!

  // Upload sollte erfolgreich abschließen
  await expect(page.getByText(/Upload erfolgreich/i)).toBeVisible({ timeout: 120_000 });
});
```

**Erwartetes Ergebnis:** ✅ Upload wird fortgesetzt  
**Falls Fail:** 🔥 Tus-Resume funktioniert nicht!

---

### Test J.3: Tus Concurrent Uploads (10 parallel)
```typescript
test('J.3: Tus handles 10 concurrent uploads', async ({ page }) => {
  await page.goto('/e/test-event');
  await page.fill('[name="uploaderName"]', 'Parallel-Test');

  // Wähle 10 Fotos gleichzeitig
  await page.setInputFiles('input[type="file"]', [
    'test-1.jpg', 'test-2.jpg', 'test-3.jpg', 'test-4.jpg', 'test-5.jpg',
    'test-6.jpg', 'test-7.jpg', 'test-8.jpg', 'test-9.jpg', 'test-10.jpg',
  ]);

  // Check: 10 Progress-Bars erscheinen
  const progressBars = page.locator('[role="progressbar"]');
  await expect(progressBars).toHaveCount(10);

  // Warte bis alle fertig (max 5 Min)
  await page.waitForFunction(() => {
    const bars = Array.from(document.querySelectorAll('[role="progressbar"]'));
    return bars.every(bar => bar.getAttribute('aria-valuenow') === '100');
  }, { timeout: 300_000 });

  // Check: Alle Uploads erfolgreich
  const successMessages = page.locator('text=/Upload erfolgreich/i');
  await expect(successMessages).toHaveCount(10);
});
```

**Erwartetes Ergebnis:** ✅ Alle 10 Uploads erfolgreich  
**Falls Fail:** ⚠️ Performance-Problem!

---

## 🔥 SUITE K: Original-Quality Storage (NEU)

**Priorität:** ⚠️ P1 (WICHTIG)  
**Aufwand:** 1 Stunde  
**Ziel:** Multi-Variant Storage testen

### Test K.1: Host bekommt Original-Quality
```typescript
test('K.1: Host downloads original quality', async ({ page, request }) => {
  // Login als Host
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@host.at');
  await page.fill('[name="password"]', '!qwerT123!');
  await page.click('button[type="submit"]');

  // Upload Test-Foto (5 MB, bekannte Größe)
  const eventId = 'test-event-id';
  const uploadRes = await request.post(
    `/api/events/${eventId}/photos/upload`,
    { multipart: { file: Buffer.from('...'), uploaderName: 'Test' } }
  );
  const photoId = (await uploadRes.json()).photo.id;

  // Download als Host
  const downloadRes = await request.get(`/api/photos/${photoId}/download`);
  const downloadedBytes = (await downloadRes.body()).length;

  // Check: Download-Größe = Original-Größe (5 MB)
  expect(downloadedBytes).toBeGreaterThan(4.5 * 1024 * 1024); // > 4.5 MB
  expect(downloadedBytes).toBeLessThan(5.5 * 1024 * 1024);    // < 5.5 MB
});
```

**Erwartetes Ergebnis:** ✅ Host bekommt Original  
**Falls Fail:** ⚠️ Original-Storage funktioniert nicht!

---

### Test K.2: Gast bekommt Optimized-Version
```typescript
test('K.2: Guest downloads optimized version', async ({ page }) => {
  // Als Gast (ohne Login)
  await page.goto('/e/test-event');

  // Download Foto
  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Download")');
  const download = await downloadPromise;

  // Speichere Download
  const path = await download.path();
  const fileSize = (await fs.promises.stat(path)).size;

  // Check: Download-Größe < 1 MB (optimized!)
  expect(fileSize).toBeLessThan(1 * 1024 * 1024);
});
```

**Erwartetes Ergebnis:** ✅ Gast bekommt Optimized  
**Falls Fail:** ⚠️ Optimized-Serving funktioniert nicht!

---

## 🔥 SUITE L: EXIF/GPS Privacy (NEU)

**Priorität:** ⚠️ P1 (WICHTIG)  
**Aufwand:** 1 Stunde  
**Ziel:** GDPR-Compliance verifizieren

### Test L.1: GPS-Koordinaten werden entfernt
```typescript
test('L.1: GPS data is stripped from uploads', async ({ page, request }) => {
  // Upload Foto MIT GPS-Daten (Test-Foto mit EXIF)
  const photoWithGps = 'test-with-gps-data.jpg'; // EXIF: lat/lon vorhanden
  
  await page.goto('/e/test-event');
  await page.fill('[name="uploaderName"]', 'GPS-Test');
  await page.setInputFiles('input[type="file"]', photoWithGps);

  // Warte auf Upload
  await expect(page.getByText(/Upload erfolgreich/i)).toBeVisible();

  // Download Foto (als Gast)
  const photoId = await page.getAttribute('[data-photo-id]', 'data-photo-id');
  const downloadRes = await request.get(`/api/photos/${photoId}/download`);
  const imageBuffer = await downloadRes.body();

  // Check EXIF mit exifr
  const exifr = await import('exifr');
  const exif = await exifr.parse(imageBuffer);

  expect(exif?.GPSLatitude).toBeUndefined();  // GPS entfernt!
  expect(exif?.GPSLongitude).toBeUndefined(); // GPS entfernt!
  expect(exif?.Make).toBeUndefined();         // Camera-Marke entfernt!
});
```

**Erwartetes Ergebnis:** ✅ Alle EXIF-Daten entfernt  
**Falls Fail:** 🔥 **GDPR-COMPLIANCE-PROBLEM!**

---

## 📊 COVERAGE-MATRIX: Windsurf vs. Sonnet

### Was Windsurf BEREITS testet:

| **Bereich** | **Windsurf-Suite** | **Coverage** |
|-------------|-------------------|--------------|
| Slow User (Oma) | Suite A | ✅ 100% |
| Mass Upload + Visibility | Suite B | ✅ 90% |
| Layout-Shift (Moderation) | Suite C | ✅ 100% |
| Network Chaos | Suite D | ✅ 80% |
| Guestbook Edge Cases | Suite E | ✅ 100% |
| Video Upload | Suite F | ✅ 100% |

**Windsurf-Coverage:** ✅ Exzellent für UX + UI!

---

### Was ICH ergänze (neue Test-Bereiche):

| **Bereich** | **Sonnet-Suite** | **Warum wichtig?** |
|-------------|------------------|---------------------|
| Multi-Environment Isolation | Suite G | 🔥 Datenverlust-Risiko! |
| Load Test (500 Users) | Suite H | 🔥 Skalierung! |
| Security (SQL/XSS/CSRF) | Suite I | 🔥 Hacking-Schutz! |
| Tus Resumable Upload | Suite J | 🔥 Kern-Feature! |
| Original-Quality Storage | Suite K | ⚠️ Business-Feature |
| EXIF/GPS Privacy | Suite L | ⚠️ GDPR! |

**Sonnet-Coverage:** ✅ Infra + Security + Performance!

---

## 🎯 KOMBINIERTER TEST-PLAN

### **Phase 1: Kritische Basis-Tests** (HEUTE, 3h)
- ✅ Suite B (Mass Upload) → Windsurf
- ✅ Suite D (Network Chaos) → Windsurf
- ✅ Suite I (Security) → Sonnet NEU
- ✅ Suite J (Tus) → Sonnet NEU

**Warum diese 4 zuerst?**  
Falls diese feilen → **NO-GO für Launch!**

---

### **Phase 2: UX-Tests** (MORGEN, 4h)
- ✅ Suite A (Oma-Szenario) → Windsurf
- ✅ Suite C (Layout-Shift) → Windsurf
- ✅ Suite E (Guestbook) → Windsurf

**Warum danach?**  
UX-Probleme sind peinlich, aber nicht kritisch!

---

### **Phase 3: Performance-Tests** (ÜBERMORGEN, 2h)
- ✅ Suite H (500 Users) → Sonnet NEU

**Warum zuletzt?**  
Braucht Load-Test-Setup (Artillery, viele Test-User)

---

### **Phase 4: Nice-to-Have** (OPTIONAL, 4h)
- ✅ Suite F (Video) → Windsurf
- ✅ Suite K (Original-Quality) → Sonnet
- ✅ Suite L (EXIF/GPS) → Sonnet

---

## 🚀 READY TO START?

**Meine Empfehlung:**

### **JETZT SOFORT (5 Min):**
```bash
# Quick-Fix: Nginx Upload-Limit
sudo nano /etc/nginx/sites-available/gaestefotos-v2.conf
# Nach Zeile 28:
    client_max_body_size 128m;

sudo nginx -t && sudo systemctl reload nginx
```

### **DANN (3 Stunden):**
```bash
# Run kritische Tests
cd /root/gaestefotos-app-v2

# Phase 1: Kritische Basis-Tests
pnpm run e2e --grep "Suite B|Suite D"  # Windsurf
# Dann meine neuen Tests:
pnpm run e2e e2e/security.spec.ts      # Suite I
pnpm run e2e e2e/tus-upload.spec.ts    # Suite J
```

---

**Soll ich:**
1. 🅰️ **Die neuen Test-Suites (G-L) als Playwright-Files erstellen?**
2. 🅱️ **Nur Quick-Smoke-Tests durchführen (15 Min)?**
3. 🅲️ **Direkt zum Nginx-Fix springen und dann Tests?**

**Was bevorzugst du?** 🚀