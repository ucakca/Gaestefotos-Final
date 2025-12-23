# Test Guide

## Vorbereitung

### 1) appv2 Services

```bash
bash ./start-appv2-services.sh
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

## Smoke (C)

- Backend:

```bash
curl -fsS http://localhost:8002/api/health
```

- Frontend:

```bash
curl -I http://localhost:3002
```
