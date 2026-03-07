# RunPod EU ComfyUI — gästefotos.com

## Übersicht

Selbst-gehostete KI-Bildverarbeitung auf RunPod EU (Amsterdam) als Ersatz für fal.ai (US).
Alle Bild- und Video-Daten werden ausschließlich in der EU verarbeitet.

## Architektur

```
Backend (Hetzner DE) → RunPod Serverless EU (Amsterdam) → Ergebnis → SeaweedFS
                        ├── Flux.1 Dev img2img (Style Transfer)
                        ├── ReActor (Face Swap)
                        ├── WAN 2.1 (Image-to-Video)
                        └── InstantID (Identity-Preserving Styles)
```

## Features

| Feature | Workflow | Modell | Im Image? |
|---------|----------|--------|-----------|
| Style Transfer | flux-img2img | Flux.1 Dev fp8 | ✅ |
| Face Swap | reactor-faceswap | inswapper_128 + CodeFormer | ✅ |
| Video Gen | wan-i2v | WAN 2.1 I2V 14B fp8 | ❌ Network Volume |
| InstantID | instantid-style | InstantID + Flux.1 Dev | ✅ |

## Deployment (GitHub Integration)

### 1. GitHub Repo erstellen

```bash
# Im runpod/ Verzeichnis
git init
git add Dockerfile setup_network_volume.sh workflows/ README.md
git commit -m "ComfyUI worker for gaestefotos.com"
git remote add origin git@github.com:YOUR_USER/gaestefotos-comfyui-worker.git
git push -u origin main
```

### 2. RunPod GitHub Integration

1. RunPod Console → Serverless → Endpoint "ComfyUI-Gaestefotos-EU-A6000"
2. Settings → Source → Connect GitHub
3. Repo auswählen, Branch `main`
4. RunPod baut das Image automatisch bei jedem `git push`

### 3. Network Volume (WAN 2.1 Modelle)

Die WAN 2.1 Modelle sind zu groß für das Docker Image.
Sie müssen einmalig auf dem Network Volume installiert werden:

```bash
# Temporären Pod mit Network Volume starten, dann:
bash setup_network_volume.sh
```

Die Modelle landen unter `/runpod-volume/models/` und werden
beim Worker-Start automatisch von worker-comfyui v5.x erkannt.

### 4. Backend konfigurieren

```bash
# packages/backend/.env
RUNPOD_API_KEY=rpa_...
RUNPOD_ENDPOINT_ID=fkyvpdld673jrf
```

## Node Editor Workflow

1. ComfyUI auf RunPod Pod öffnen (oder lokal installieren)
2. Workflow visuell im Node Editor bauen
3. `File → Export` → `workflow.json`
4. Workflow-JSON als API-Input an den Serverless Endpoint senden
5. Oder in `comfyuiWorkflows.ts` als Template hinterlegen

## API Nutzung

```typescript
import { runFluxImg2Img, runReactorFaceSwap, runWanI2V, runInstantIdStyle } from './comfyuiWorkflows';

// Style Transfer
const result = await runFluxImg2Img(imageBuffer, { prompt: 'oil painting style' });

// Face Swap  
const result = await runReactorFaceSwap(sourceFace, targetImage);

// Video Generation (nutzt Network Volume Modelle)
const result = await runWanI2V(imageBuffer, { duration: 5 });

// InstantID Style
const result = await runInstantIdStyle(imageBuffer, { prompt: 'cyberpunk portrait' });
```

## VRAM-Budget (A6000 48GB)

| Workflow | VRAM | Dauer |
|----------|------|-------|
| Flux img2img | ~12GB | ~15-25s |
| ReActor Face Swap | ~4GB | ~5-10s |
| WAN 2.1 Video | ~22GB | ~60-180s |
| InstantID + Flux | ~16GB | ~20-35s |

Alle Workflows passen einzeln in 48GB. ComfyUI lädt Modelle on-demand und gibt VRAM frei.

## Kosten

| Posten | Kosten |
|--------|--------|
| A6000 Serverless | ~$0.33/h (nur bei Nutzung, $0 bei idle) |
| Network Volume 50GB | ~$5/Monat |
| Pro Style Transfer | ~$0.002 (25s) |
| Pro Face Swap | ~$0.001 (10s) |
| Pro Video (3 Min) | ~$0.016 (180s) |
| **Fixkosten (idle)** | **~$5/Monat** |

## DSGVO

- **Datenverarbeitung**: Ausschließlich EU (RunPod Romania)
- **Keine US-Transfers**: Ersetzt fal.ai (US) komplett
- **Kein Caching**: RunPod Serverless speichert keine Daten nach Job-Ende
- **Verschlüsselung**: HTTPS in Transit, Network Volume at rest
