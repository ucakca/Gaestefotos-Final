# 🧪 Umfassender Smoke-Test-Plan

**Letzte Aktualisierung:** 2026-01-11  
**Version:** 1.0

---

## Übersicht

Dieser Smoke-Test-Plan deckt die kritischen Funktionen der Gästefotos-Plattform ab. Ziel ist es, nach einem Deployment schnell zu verifizieren, dass alle Kernfunktionen korrekt arbeiten.

### Laienerklärung
Ein Smoke-Test ist wie ein "Schnellcheck" nach einer Änderung. Statt alles im Detail zu testen, prüfen wir nur die wichtigsten Funktionen: Kann man sich einloggen? Funktioniert der Upload? Werden Bilder angezeigt? Wenn diese Basisfunktionen gehen, ist die App grundsätzlich einsatzbereit.

---

## Umgebungen

| Umgebung | App URL | Dashboard URL | API URL | DB |
|----------|---------|---------------|---------|-----|
| **Produktion** | `https://app.gästefotos.com` | `https://dash.gästefotos.com` | `https://app.gästefotos.com/api` | `gaestefotos_v2` |
| **Staging** | `https://staging.app.gästefotos.com` | `https://staging.dash.gästefotos.com` | `https://staging.app.gästefotos.com/api` | `gaestefotos_v2_staging` |

**Punycode-Varianten:**
- `app.xn--gstefotos-v2a.com` = `app.gästefotos.com`
- `dash.xn--gstefotos-v2a.com` = `dash.gästefotos.com`

---

## 1. Cross-Domain-Login Tests

### 1.1 Technischer Hintergrund

**Cookie-Domain-Konfiguration:**
```
COOKIE_DOMAIN=.xn--gstefotos-v2a.com
```

Das Cookie wird auf der **Parent-Domain** gesetzt (mit führendem Punkt), sodass es von allen Subdomains gelesen werden kann:
- `app.gästefotos.com` ✅
- `dash.gästefotos.com` ✅

**Laienerklärung:**
Wenn du dich auf der App einloggst, wird ein "Ausweis" (Cookie) erstellt, der für die gesamte gästefotos.com-Familie gilt. Dadurch bist du automatisch auch im Dashboard eingeloggt, ohne dich nochmal anmelden zu müssen.

### 1.2 Test-Cases

#### TC-AUTH-001: Login auf App → Dashboard Session
| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Browser öffnen, alle Cookies löschen | Sauberer Zustand |
| 2 | `https://app.gästefotos.com/login` öffnen | Login-Seite wird angezeigt |
| 3 | Mit Admin-Credentials einloggen | Redirect zu Dashboard/Events |
| 4 | Neuen Tab: `https://dash.gästefotos.com` öffnen | **Bereits eingeloggt** (kein Login-Redirect) |
| 5 | Dashboard-Navigation prüfen | Alle Menüpunkte erreichbar |

#### TC-AUTH-002: Login auf Dashboard → App Session
| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Browser öffnen, alle Cookies löschen | Sauberer Zustand |
| 2 | `https://dash.gästefotos.com/login` öffnen | Login-Seite wird angezeigt |
| 3 | Mit Admin-Credentials einloggen | Redirect zu Dashboard |
| 4 | Neuen Tab: `https://app.gästefotos.com` öffnen | **Bereits eingeloggt** |
| 5 | Host-Funktionen prüfen (z.B. Event erstellen) | Funktioniert ohne erneuten Login |

#### TC-AUTH-003: Logout Propagation
| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | In App eingeloggt sein | Session aktiv |
| 2 | Dashboard in zweitem Tab öffnen | Eingeloggt |
| 3 | In App ausloggen | Redirect zu Login |
| 4 | Dashboard-Tab refreshen | **Auch ausgeloggt** (Redirect zu Login) |

#### TC-AUTH-004: Cookie SameSite/Secure Validierung
| Prüfung | Erwartung |
|---------|-----------|
| Cookie `auth_token` vorhanden | ✅ |
| `HttpOnly` Flag | ✅ true |
| `Secure` Flag | ✅ true (Produktion) |
| `SameSite` | `Lax` |
| `Domain` | `.xn--gstefotos-v2a.com` |

**DevTools-Check:**
```
Application → Cookies → auth_token
- Domain: .xn--gstefotos-v2a.com
- HttpOnly: ✓
- Secure: ✓
- SameSite: Lax
```

#### TC-AUTH-005: Unicode Domain Handling
| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | `https://app.gästefotos.com/login` aufrufen | Funktioniert |
| 2 | `https://app.xn--gstefotos-v2a.com/login` aufrufen | Funktioniert (gleiche Session) |
| 3 | Cookie-Domain prüfen | Punycode-Format (`.xn--gstefotos-v2a.com`) |

---

## 2. SeaweedFS Bucket-Validierung

### 2.1 Technischer Hintergrund

**Konfiguration:**
```env
SEAWEEDFS_ENDPOINT=localhost:8333
SEAWEEDFS_BUCKET=gaestefotos-v2
```

**Bucket-Struktur:**
```
gaestefotos-v2/
├── events/
│   ├── {eventId-1}/
│   │   ├── {timestamp}-{uuid}-{filename}.jpg
│   │   └── ...
│   ├── {eventId-2}/
│   │   └── ...
│   └── ...
└── (ggf. weitere Pfade für Thumbnails, etc.)
```

**Laienerklärung:**
SeaweedFS ist unser "Foto-Lager". Alle hochgeladenen Bilder werden dort gespeichert, organisiert nach Events. Jedes Event hat seinen eigenen "Ordner", sodass Bilder verschiedener Events nicht durcheinander kommen.

### 2.2 Test-Cases

#### TC-STORAGE-001: Bucket Existenz & Zugriff
```bash
# CLI-Test (auf Server)
curl -s "http://localhost:8333/gaestefotos-v2?list" | head -20
```
| Erwartung | Ergebnis |
|-----------|----------|
| HTTP 200 | ✅ |
| Bucket existiert | ✅ |
| Lesezugriff möglich | ✅ |

#### TC-STORAGE-002: Event-Isolation (Kritisch!)
| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Foto zu Event A hochladen | Upload erfolgreich |
| 2 | Key notieren (z.B. `events/abc123/...`) | Pfad enthält Event-ID |
| 3 | Foto zu Event B hochladen | Upload erfolgreich |
| 4 | Key notieren | **Andere Event-ID im Pfad** |
| 5 | Event A Galerie öffnen | **Nur Fotos von Event A** |
| 6 | Event B Galerie öffnen | **Nur Fotos von Event B** |

**Laienerklärung:**
Dieser Test prüft, ob Fotos verschiedener Events sauber getrennt sind. Ein Gast von Hochzeit A darf niemals die Fotos von Geburtstagsfeier B sehen.

#### TC-STORAGE-003: Upload-Pfad-Validierung
```bash
# Nach Upload prüfen (DB)
SELECT storage_key FROM photos WHERE event_id = '{eventId}' ORDER BY created_at DESC LIMIT 1;
```
| Prüfung | Erwartetes Format |
|---------|-------------------|
| Pfad-Prefix | `events/{eventId}/` |
| Timestamp | Unix-Timestamp (ms) |
| UUID | Valid UUID v4 |
| Dateiname | Sanitized (keine Sonderzeichen) |

**Beispiel valider Key:**
```
events/550e8400-e29b-41d4-a716-446655440000/1736585123456-a1b2c3d4-foto.jpg
```

#### TC-STORAGE-004: Signed URL Security
| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Bild in Galerie anzeigen | URL enthält Signatur |
| 2 | URL-Parameter `X-Amz-Signature` vorhanden | ✅ |
| 3 | URL-Parameter `X-Amz-Expires` vorhanden | ✅ |
| 4 | Nach Ablauf URL aufrufen | **403 Forbidden** |
| 5 | Signatur manipulieren | **403 Forbidden** |

#### TC-STORAGE-005: Cross-Event-Zugriff (Security)
| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Als Gast Event A beitreten | Zugriff auf Event A |
| 2 | Storage-Key von Event B erraten | N/A (Keys sind UUIDs) |
| 3 | API `/api/events/{eventB}/photos` aufrufen | **401/403 Unauthorized** |
| 4 | Direkte SeaweedFS URL (ohne Signatur) | **Nicht erreichbar** (kein Public Access) |

---

## 3. Basis-Funktionalitäts-Tests

### 3.1 Event-Lifecycle

#### TC-EVENT-001: Event erstellen
| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Als Host einloggen | Dashboard |
| 2 | "Neues Event" klicken | Formular |
| 3 | Titel, Datum eingeben | Validierung OK |
| 4 | Speichern | Event erstellt, Redirect zu Event-Detail |

#### TC-EVENT-002: Event-Zugang (Gast)
| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Event-Link öffnen (nicht eingeloggt) | Event-Landing-Page |
| 2 | "Galerie öffnen" oder Passwort eingeben | Zugang zur Galerie |
| 3 | Fotos sichtbar | ✅ |

### 3.2 Foto-Upload

#### TC-UPLOAD-001: Standard-Upload
| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Event-Galerie öffnen | Upload-Button sichtbar |
| 2 | Foto auswählen (< 20MB, JPEG) | Upload startet |
| 3 | Progress-Anzeige | 0% → 100% |
| 4 | Upload abgeschlossen | Foto in Galerie sichtbar |
| 5 | Thumbnail generiert | ✅ |

#### TC-UPLOAD-002: Upload-Limits (Package-abhängig)
| Package | Storage Limit | Erwartung bei Überschreitung |
|---------|---------------|------------------------------|
| Free | 50 Fotos | Fehler: "Limit erreicht" |
| Basic | 500 Fotos | Fehler bei > 500 |
| Smart | Unbegrenzt | Kein Limit |
| Premium | Unbegrenzt | Kein Limit |

### 3.3 Feature Gates

#### TC-GATE-001: Co-Host Feature Gate
| Package | allowCoHosts | maxCoHosts | Test-Aktion | Erwartung |
|---------|--------------|------------|-------------|-----------|
| Free | false | 0 | Co-Host hinzufügen | **403 Forbidden** |
| Basic | false | 0 | Co-Host hinzufügen | **403 Forbidden** |
| Smart | true | 2 | 1. Co-Host hinzufügen | ✅ OK |
| Smart | true | 2 | 3. Co-Host hinzufügen | **403 Limit erreicht** |
| Premium | true | null | 10 Co-Hosts hinzufügen | ✅ OK |

#### TC-GATE-002: Face Search Feature Gate
| Package | allowFaceSearch | Test-Aktion | Erwartung |
|---------|-----------------|-------------|-----------|
| Free | false | Face Search nutzen | **403 Forbidden** |
| Basic | false | Face Search nutzen | **403 Forbidden** |
| Smart | false | Face Search nutzen | **403 Forbidden** |
| Premium | true | Face Search nutzen | ✅ OK |

---

## 4. API Health Checks

### 4.1 Automatisierte Checks

```bash
# Backend Health
curl -s https://app.gästefotos.com/api/health | jq
# Erwartung: { "status": "ok", "timestamp": "..." }

# Version
curl -s https://app.gästefotos.com/api/version | jq
# Erwartung: { "version": "...", "commit": "...", "buildTime": "..." }

# DB Connection
curl -s https://app.gästefotos.com/api/health/db | jq
# Erwartung: { "status": "ok", "responseTimeMs": ... }
```

### 4.2 Service Status

```bash
# Systemd Services
systemctl status gaestefotos-backend.service
systemctl status gaestefotos-frontend.service
systemctl status gaestefotos-admin-dashboard.service

# Ports
ss -tlnp | grep -E '8001|3000|3001'
# Erwartung: 8001 (Backend), 3000 (Frontend), 3001 (Dashboard)
```

---

## 5. Co-Host Invite Flow (E2E)

### TC-COHOST-001: Kompletter Invite-Flow

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | **Setup**: Als Host in Dashboard einloggen | Dashboard sichtbar |
| 2 | Event mit Smart-Package öffnen | Event-Detail |
| 3 | "Co-Hosts" Tab → "Invite-Link erzeugen" | Link wird generiert |
| 4 | Link kopieren | `https://app.../e2/{slug}?cohostInvite=...` |
| 5 | **Privates Fenster**: Link öffnen | Event-Seite + Login-Aufforderung |
| 6 | Mit anderem User einloggen | Redirect zurück zur Event-Seite |
| 7 | Toast: "Du bist jetzt Co-Host" | ✅ |
| 8 | **Rechte-Check**: Event verwalten können | Manage-Seiten erreichbar |
| 9 | **Host**: Co-Host Liste prüfen | Neuer Co-Host sichtbar |
| 10 | **Host**: Co-Host entfernen | Co-Host aus Liste entfernt |
| 11 | **Ex-Co-Host**: Seite refreshen | **403 / Redirect** (kein Zugriff mehr) |

---

## 6. Staging vs. Produktion Validierung

### TC-ENV-001: Umgebungs-Isolation

| Prüfung | Staging | Produktion |
|---------|---------|------------|
| DB Name | `gaestefotos_v2_staging` | `gaestefotos_v2` |
| Cookie Domain | `.staging.xn--gstefotos-v2a.com` | `.xn--gstefotos-v2a.com` |
| Backend Port | 8101 | 8001 |
| SeaweedFS Bucket | `gaestefotos-v2` (shared) | `gaestefotos-v2` (shared) |

**Wichtig:** Staging und Produktion teilen denselben SeaweedFS-Bucket! Events sind durch Event-IDs getrennt, aber Vorsicht bei Lösch-Operationen.

### TC-ENV-002: Package-Definitionen Sync
```bash
# Prod
psql -U gaestefotos -d gaestefotos_v2 -c "SELECT sku, \"allowCoHosts\", \"maxCoHosts\" FROM package_definitions WHERE type='BASE' ORDER BY \"displayOrder\";"

# Staging
psql -U gaestefotos -d gaestefotos_v2_staging -c "SELECT sku, \"allowCoHosts\", \"maxCoHosts\" FROM package_definitions WHERE type='BASE' ORDER BY \"displayOrder\";"
```
**Erwartung:** Identische Werte

---

## 7. Schnell-Checkliste (5-Minuten-Smoke)

Für schnelle Deployments - nur die kritischsten Punkte:

- [ ] **API Health**: `curl https://app.gästefotos.com/api/health` → `{"status":"ok"}`
- [ ] **Login App**: Einloggen auf `app.gästefotos.com` funktioniert
- [ ] **Cross-Domain**: Nach Login `dash.gästefotos.com` → bereits eingeloggt
- [ ] **Event öffnen**: Ein bestehendes Event kann geöffnet werden
- [ ] **Galerie laden**: Fotos werden angezeigt
- [ ] **Upload**: Ein Testfoto kann hochgeladen werden
- [ ] **Logout**: Ausloggen funktioniert

---

## 8. Bekannte Einschränkungen

1. **SeaweedFS Bucket Sharing**: Staging und Produktion nutzen denselben Bucket. Event-IDs sind unterschiedlich, aber bei Bucket-weiten Operationen aufpassen.

2. **Cookie-Domain bei localhost**: Lokale Entwicklung benötigt separate Cookie-Handling (kein `.localhost` Domain-Cookie möglich).

3. **Unicode/Punycode**: Einige Browser zeigen `gästefotos.com`, andere `xn--gstefotos-v2a.com`. Beide sollten funktionieren.

---

## Anhang: CLI-Befehle für Server-Tests

### A. Database Quick-Check
```bash
psql -U gaestefotos -d gaestefotos_v2 -c "SELECT COUNT(*) FROM events WHERE \"deletedAt\" IS NULL;"
psql -U gaestefotos -d gaestefotos_v2 -c "SELECT COUNT(*) FROM photos;"
psql -U gaestefotos -d gaestefotos_v2 -c "SELECT sku, \"isActive\" FROM package_definitions;"
```

### B. SeaweedFS Check
```bash
# Bucket List
curl -s "http://localhost:8333/gaestefotos-v2?list&limit=5"

# Specific Event Files
curl -s "http://localhost:8333/gaestefotos-v2?list&prefix=events/{eventId}/&limit=10"
```

### C. Service Logs
```bash
journalctl -u gaestefotos-backend.service -n 50 --no-pager
journalctl -u gaestefotos-frontend.service -n 50 --no-pager
journalctl -u gaestefotos-admin-dashboard.service -n 50 --no-pager
```

---

**Erstellt:** 2026-01-11  
**Autor:** Cascade AI  
**Nächste Review:** Nach größeren Deployments
