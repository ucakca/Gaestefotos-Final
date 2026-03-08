# DSGVO-Datenschutzmaßnahmen — Gästefotos v2

**Stand:** 7. März 2026  
**Verantwortlich:** Technische Dokumentation  
**Zweck:** Nachweisbarkeit der technisch-organisatorischen Maßnahmen (TOM) zum Schutz personenbezogener Daten gem. Art. 32 DSGVO.

---

## 1. Bilddaten — EXIF-Stripping

| Maßnahme | Implementierung | Datei |
|---|---|---|
| **EXIF-Strip bei Bildverarbeitung** | Sharp entfernt alle EXIF-Metadaten aus Bild-Varianten (opt, thumb, webp). `.rotate()` liest Orientierung vor dem Strip. | `imageProcessor.ts` |
| **GPS-Filter bei Metadaten-Extraktion** | 22 GPS-bezogene Keys (latitude, longitude, GPSLatitude, GPSPosition etc.) werden beim EXIF-Parsing gefiltert, bevor sie in das `exifData` JSON-Feld der DB geschrieben werden. | `imageMetadataReader.ts` |
| **Original-Bild** | Das Original (`_orig`) wird unverändert in SeaweedFS gespeichert (Host braucht Druckqualität). EXIF ist im Original erhalten, wird aber nicht über die API exponiert — nur über expliziten Download. | `uploads.ts` |

---

## 2. Biometrische Daten — Face Search

| Maßnahme | Implementierung | Datei |
|---|---|---|
| **Consent-Gate (Feature-Flag)** | Face-Embeddings werden nur gespeichert, wenn der Host das Feature `faceSearch` für sein Event aktiviert hat. Ohne Aktivierung: keine Embeddings, keine biometrischen Daten. | `uploads.ts:452-455` |
| **Consent-Text** | `faceSearchConsent.ts` liefert den Consent-Text für die Frontend-Anzeige. Admin kann den Text systemweit anpassen via `/api/admin/face-search-consent`. | `faceSearchConsent.ts`, `adminFaceSearchConsent.ts` |
| **Event-Level-Steuerung** | Host (als Verantwortlicher gem. Art. 4 Nr. 7 DSGVO) entscheidet per Event, ob Face Search aktiv ist. | `featureGate.ts` |

---

## 3. IP-Adressen

| Maßnahme | Implementierung | Datei |
|---|---|---|
| **IP-Hashing** | IP-Adressen werden nie im Klartext gespeichert. Stattdessen wird ein SHA-256-Hash mit Secret-Salt (`QA_LOG_IP_SALT` oder `JWT_SECRET`) erzeugt. | `auditLogger.ts:101-112`, `qaLogs.ts:43-53` |
| **Upload-Limit per IP** | Für Upload-Rate-Limiting wird ein gekürzter IP-Hash (16 Zeichen) verwendet, nicht die vollständige IP. | `uploads.ts` (onUploadFinish) |
| **Retention-Policy** | QA-Logs (inkl. IP-Hashes) werden automatisch gelöscht: DEBUG-Level nach 7 Tagen, IMPORTANT-Level nach 90 Tagen (konfigurierbar via `QA_LOG_RETENTION_IMPORTANT_DAYS`). | `qaLogRetention.ts` |

---

## 4. Gast-Identifikation

| Maßnahme | Implementierung | Datei |
|---|---|---|
| **`uploadedBy` Feld** | Gäste geben beim Upload freiwillig einen Namen an. Dieser wird mit dem Foto gespeichert und ist für den Host sichtbar. | `uploads.ts`, `photos.ts` |
| **Kein Account-Zwang** | Gäste brauchen keinen Account — Event-Zugang via Passwort oder QR-Code (Cookie-basiert). | `events.ts`, `middleware.ts` |
| **Email Opt-in** | E-Mail-Benachrichtigungen (Photo Delivery) nur mit explizitem Opt-in (`emailOptIn=true`, `emailOptInAt` Timestamp). Unsubscribe-Link in jeder E-Mail. | `guests.ts`, `photoDelivery.ts` |

---

## 5. Daten-Löschung & Retention

| Maßnahme | Implementierung | Datei |
|---|---|---|
| **Event-Speicherzeit** | Jedes Event hat ein `storageEndsAt`-Datum (abhängig vom Paket-Tier). Nach Ablauf werden Fotos gesperrt (`isStorageLocked`). | `packageLimits.ts`, `events.ts` |
| **Event-Purge** | `eventPurgeWorker.ts` löscht abgelaufene Events inkl. aller zugehörigen Daten (Fotos, Videos, Gästebuch, Comments, Likes, AI-Jobs). | `eventPurgeWorker.ts` |
| **Orphan-Cleanup** | Verwaiste TUS-Upload-Dateien und progressive Upload-Platzhalter werden automatisch gelöscht (15-Min-Intervall, max. 1h Alter). | `orphanCleanup.ts`, `uploads.ts:597-619` |
| **QA-Log-Retention** | Automatische Löschung alter QA-Log-Einträge (s. oben). | `qaLogRetention.ts` |

---

## 6. Transport-Sicherheit

| Maßnahme | Detail |
|---|---|
| **SSL/TLS** | Alle Verbindungen über HTTPS (Let's Encrypt via Plesk). HSTS aktiviert. |
| **Cookie-Flags** | `secure: isProd`, `httpOnly: true`, `sameSite: 'lax'` für Auth-Cookies. |
| **CSP** | Content-Security-Policy auf Nginx-Ebene gesetzt. Backend setzt zusätzlich CSP via Helmet. `unsafe-inline` für `script-src`/`style-src` (Next.js Workaround). |
| **CSRF** | CSRF-Token-Validierung auf allen mutierenden `/api/*` Routes. Constant-time Vergleich via `crypto.timingSafeEqual`. |
| **HSTS** | Strict-Transport-Security mit `max-age=31536000; includeSubDomains` auf Nginx-Ebene. |

---

## 7. Zugriffskontrolle

| Maßnahme | Detail |
|---|---|
| **Admin 2FA** | `ADMIN_2FA_REQUIRED=true` — Admin-Nutzer müssen 2FA aktivieren. |
| **Rate Limiting** | IP-basiertes Rate Limiting auf Auth-Endpoints, Upload-Endpoints, AI-Features. |
| **Event-Isolation** | Gäste haben nur Zugriff auf das jeweilige Event (Event-Access-Cookie). Host sieht nur eigene Events. |
| **ClamAV** | Virus-Scan bei Uploads. Bei Scan-Fehler: Quarantäne (nicht Freigabe). |

---

## 8. Offene Punkte

| # | Thema | Status | Bewertung |
|---|---|---|---|
| G-03 | `uploadedBy` Klarname ohne Lösch-Option für Gäste | Offen | Product-Entscheidung: Name ist für Host-Funktion essentiell. Gast kann Pseudonym verwenden. Löschung über Event-Purge. |
| G-04 | IP-Hash in QaLogEvent | ✅ Gelöst | Automatische Retention (7/90 Tage). Hash mit Salt nicht rückführbar ohne Secret. |
| S-01 | CSP `unsafe-inline` | Teilweise | Wartet auf Next.js Turbopack Nonce-Support. `unsafe-eval` bereits entfernt. CSP jetzt auch auf Nginx-Ebene gesetzt (Stand 2026-03-08). |
