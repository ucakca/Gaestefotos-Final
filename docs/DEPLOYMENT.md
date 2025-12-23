# Deployment

## appv2 (Server)

### Services starten

Im Repo Root:

```bash
bash ./start-appv2-services.sh
```

- **Backend**: `http://localhost:8002`
- **Frontend**: `http://localhost:3002`

### Logs

- Backend: `tail -f /tmp/backend-appv2.log`
- Frontend: `tail -f /tmp/frontend-appv2.log`

### Ports

- Backend Port: `8002`
- Frontend Port: `3002`

### Häufige Probleme

- **Port belegt**: die Start-Skripte versuchen Ports via `fuser -k` freizumachen.
- **Next ChunkLoadError / MIME issues**: bei mehreren Next Instanzen muss `NEXT_DIST_DIR` pro Port unterschiedlich sein.

## staging

`staging.gästefotos.com` ist als Reverse-Proxy auf appv2 gedacht (Routing/Parität prüfen).
