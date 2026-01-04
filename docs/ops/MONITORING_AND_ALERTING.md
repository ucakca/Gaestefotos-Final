# Monitoring & Alerting (Production)

## Minimalziel

- Du merkst Ausfälle und Error-Spikes schnell.

## Health/Endpoints

- Backend: `GET /api/health`
- Backend: `GET /api/version`
- Frontend: `GET /` + `/_next/static/*` Asset check

## Error Monitoring

- Backend: Sentry ist optional aktiv, wenn `SENTRY_DSN` gesetzt ist.

## Logs

- systemd/journald ist Primary Log Source
- Prüfen: Log-Retention/Rotation, damit Disk nicht vollläuft.

## Alerts (Minimal)

- Uptime Check (extern):
  - `https://app.../api/health`
  - `https://app.../`
  - `https://dash.../`
- Alarmierung per E-Mail/Push

## Dashboard (optional)

- Basic Graphs: requests/min, error rate, latency
