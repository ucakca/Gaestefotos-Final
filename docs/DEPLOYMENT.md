# Deployment

## Server

### Services starten

Im Repo Root:

```bash
bash ./start-local-services.sh
```

- **Backend**: `http://localhost:8002`
- **Frontend**: `http://localhost:3002`

### Logs

- Backend: `tail -f /tmp/backend-local.log`
- Frontend: `tail -f /tmp/frontend-local.log`

### Ports

- Backend Port: `8002`
- Frontend Port: `3002`

### Häufige Probleme

- **Port belegt**: die Start-Skripte versuchen Ports via `fuser -k` freizumachen.
- **Next ChunkLoadError / MIME issues**: bei mehreren Next Instanzen muss `NEXT_DIST_DIR` pro Port unterschiedlich sein.

## staging

`staging.gästefotos.com` ist als Reverse-Proxy auf die App gedacht (Routing/Parität prüfen).
