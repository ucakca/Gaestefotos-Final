# Test Guide

## Vorbereitung

### 1) Services

```bash
bash ./start-local-services.sh
```

### 2) Testdaten (2 Events)

Wir verwenden 2 Test-Events:

- **Aktiv (nicht abgelaufen)**: Uploads/Downloads abhängig von Settings, Storage nicht gelockt
- **Abgelaufen (Storage-Lock)**: Media blur + Upload/Download deaktiviert

Setup per Script (siehe unten):

```bash
pnpm --filter @gaestefotos/backend tsx ./scripts/setup-test-events.ts
```

Das Script erzeugt:

- Host User + Passwort (Konsole Output)
- 2 Events (Slugs/IDs im Output)
- je Event: Fotos + Videos

## Checks: Host (A)

### Dashboard

- Banner bei Storage-Lock
- Upload-Window Hinweis (wenn außerhalb `±1 Tag`)

### Photos/Videos

- **Storage-Lock**:
  - Banner sichtbar
  - Thumbnails blured
  - Upload disabled (mit Reason/Toast)
  - Download disabled (kein ZIP, keine Einzel-Downloads)

## Checks: Guest (B)

- Zugriff via Public Page (Slug)
- Upload/Download Verhalten abhängig von `featuresConfig` und Storage-Lock
- Storage-Lock: blur + disabled

### Stories (Instagram-like)

- **Öffnen**:
  - Auf der Guest-Seite (`/e2/[slug]`) ist **keine Stories-Leiste** sichtbar.
  - Klicke auf das **Profilbild im Header/Hero**.
  - Erwartung:
    - Wenn Stories vorhanden sind, öffnet sich der Story-Viewer im Vollbild.
    - Wenn keine Stories vorhanden sind, passiert nichts.

- **Swipe / Navigation**:
  - Im Story-Viewer:
    - **Swipe nach links**: nächste Story
    - **Swipe nach rechts**: vorherige Story
    - Alternativ: **Tap links/rechts** im Bildbereich
  - Erwartung:
    - Wechsel passiert sofort und flüssig
    - Progress-Bar oben läuft weiter

### Foto Viewer (Modal) + Swipe

- **Öffnen**:
  - Tippe in der Grid-Ansicht ein Foto an.
  - Erwartung: Vollbild/Modal öffnet sich.

- **Swipe links/rechts**:
  - Im Foto-Modal:
    - **Swipe nach links**: nächstes Foto
    - **Swipe nach rechts**: vorheriges Foto
  - Erwartung:
    - Das Foto wechselt im Modal ohne das Modal zu schließen.
    - Pfeile links/rechts funktionieren weiterhin.

- **Storage-Lock Verhalten**:
  - Bei gelocktem Event:
    - Grid zeigt Fotos weiterhin, aber **unscharf**.
    - Upload CTA ist sichtbar, aber disabled.
    - Das Öffnen einzelner Fotos (Modal) kann gesperrt sein (je nach aktueller Policy in der UI).

## Smoke (C)

- Backend:

```bash
curl -fsS http://localhost:8002/api/health
```

- Frontend:

```bash
curl -I http://localhost:3002
```

---

## E2E (Playwright)

### Browser-Binaries installieren (Server)

Falls E2E mit `Executable doesn't exist ...` fehlschlägt:

```bash
pnpm exec playwright install
```

### Port-Konflikte vermeiden

Wenn `http://localhost:3000 is already used` kommt, nimm einen freien Port für die E2E WebServer:

```bash
E2E_BASE_URL=http://localhost:3100 pnpm e2e
```

### Pre-Push Hook (e2e:stable) überspringen

Der Repo-Pre-Push Hook führt standardmäßig `pnpm run e2e:stable` aus. Wenn das auf einem Server gerade nicht sinnvoll ist:

```bash
SKIP_E2E_HOOK=1 git push
```

---

## Produktiv Smoke (Prod)

Hinweis: In der Server-Umgebung ist „localhost im Browser“ oft nicht sinnvoll. Für Prod-Checks nutze eine **echte, öffentliche URL** (oder eine interne Domain/Ingress-URL).

### 1) Verfügbarkeit (HTTP)

- Frontend (HTML)
  - Beispiel:

    ```bash
    curl -I https://<FRONTEND_DOMAIN>/
    ```

- Backend Health (falls öffentlich erreichbar)
  - Beispiel:

    ```bash
    curl -fsS https://<FRONTEND_DOMAIN>/api/health
    ```

### 2) Smoke: Host (A) – kritische Wege

- Login
- Dashboard lädt
- Event-Dashboard lädt
- Share/Invite Link erzeugen + kopieren
- Upload Foto/Video (mind. 1x)
- Moderation (falls aktiv): approve/reject
- Download (Einzel + ZIP, wenn Storage nicht locked)

### 3) Smoke: Guest (B) – kritische Wege

- Öffnen per `/e/<slug>` oder `/e2/<slug>` (je nach kanonischer URL im Projekt)
- Upload (Name, optional Album)
- Gästebuch: Text-Eintrag + optional Foto/Audio
- Stories/Photo-Viewer Navigation (falls vorhanden)

### 4) Storage-Lock Szenario

- Gelocktes Event:
  - Blur/Preview sichtbar
  - Upload CTA disabled + Reason
  - Download deaktiviert

### 5) Monitoring / Logs (nach Smoke)

- Backend Logs: 5xx, Upload/Storage-Lock Errors
- Frontend Browser-Konsole: ChunkLoadError / React Errors
- Server Metrics (falls vorhanden): CPU/Mem, 5xx Rate
