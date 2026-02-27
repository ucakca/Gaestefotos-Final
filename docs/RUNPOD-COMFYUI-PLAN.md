# RunPod + ComfyUI KI-Architektur Plan
**Stand: Februar 2026**
 
---
 
## 1. Hetzner Server — Analyse (Offline-Basis)
 
### Specs
| Komponente | Detail |
|---|---|
| **CPU** | AMD Ryzen 9 5950X — 16 Cores / 32 Threads @ 3.4 GHz |
| **RAM** | 125 GB (aktuell: ~12 GB belegt, ~113 GB verfügbar) |
| **Disk** | 2 TB NVMe RAID (57 GB belegt, 1.8 TB frei) |
| **GPU** | ❌ Keine |
| **OS** | Ubuntu 24.04.4 LTS |
 
### Bewertung
Der Server ist ein **CPU-Beast** mit außergewöhnlich viel RAM. Ohne GPU sind viele
KI-Aufgaben trotzdem lokal machbar — alle Modelle die effizient auf CPU laufen
(quantisierte LLMs via Ollama, leichte Bildverarbeitung, Inferenz mit kleinen Modellen).
Mit 125 GB RAM könnten mehrere quantisierte Modelle gleichzeitig im Speicher gehalten
werden (kein Reload-Overhead zwischen Requests).
 
---
 
## 2. Hybrid-Architektur: Offline vs. Cloud
 
### ✅ Lokal (Hetzner — immer verfügbar, kein Internet nötig)
 
| Feature | Technologie | RAM | Latenz |
|---|---|---|---|
| **LLM / Text-KI** | Ollama + Llama 3.1 8B (int4) | ~8 GB | ~1-3s |
| **Grok / Groq Fallback** | externe API wenn online | — | ~0.5s |
| **Face Detection** | face-api.js / MediaPipe (CPU) | ~200 MB | ~100ms |
| **Face Search / Similarity** | pgvector (PostgreSQL) | DB | ~50ms |
| **Background Removal** | rembg CPU | ~1 GB | ~5-8s |
| **Bildverarbeitung** | sharp (Node.js) | minimal | ~50ms |
| **Smart Album** | TensorFlow Lite CPU | ~500 MB | ~200ms |
| **Compliment Mirror** | Ollama LLM lokal | ~8 GB | ~2s |
| **Caption Generate** | Ollama LLM lokal | ~8 GB | ~1s |
| **EXIF Analyse** | sharp metadata | minimal | ~10ms |
| **Duplikat-Erkennung** | perceptual hash | minimal | ~50ms |
| **Upscaling 2x** | ESRGAN CPU | ~2 GB | ~15-30s |
| **Highlight Reel** | FFmpeg CPU | ~1 GB | ~30-60s |
| **Gästebuch PDF** | puppeteer/canvas | ~500 MB | ~1s |
 
### ☁️ Cloud (RunPod + ComfyUI — benötigt Internet)
 
| Feature | Workflow | VRAM | Latenz |
|---|---|---|---|
| **Face Swap (nur Gesicht)** | Qwen 2509 + BFS Face V1 | 16-24 GB | ~15-25s |
| **Head Swap (mit Haar)** | Qwen 2509 + BFS Head V5 | 16-24 GB | ~20-30s |
| **Style Transfer + Identität** | Flux.1 dev + PuLID | 16 GB | ~20-30s |
| **Anime / Kunst-Stile** | SDXL + InstantID + Style LoRA | 12-16 GB | ~25-35s |
| **Superheld / Movie Poster** | Qwen BFS + Compositing | 16 GB | ~25s |
| **Historisch / Zeitreise** | Qwen BFS + Vintage LoRA | 16 GB | ~25s |
| **Magazin-Cover** | InstantID + SDXL + Text Overlay | 16 GB | ~30s |
| **Upscaling 4x** | SUPIR / RealESRGAN 4x | 8-16 GB | ~10-20s |
| **Video / GIF Morph** | AnimateDiff + Face2Face | 24 GB | ~60-120s |
| **AI Video Portrait** | CogVideoX / Wan2.1 | 24 GB | ~90-180s |
 
---
 
## 3. RunPod Angebot — Analyse
 
### Produkt-Typen
 
| Typ | Beschreibung | Empfehlung |
|---|---|---|
| **Serverless** | Pre-warmed Worker, pay-per-second, auto-scale | ✅ Produktion |
| **On-Demand Pod** | Dedizierter Pod, stündliche Abrechnung | ✅ Entwicklung/Tests |
| **Spot Pod** | Wie On-Demand aber ~50-70% günstiger, kann unterbrochen werden | ⚠️ Nur für unkritische Jobs |
| **Secure Cloud** | Tier-1 Datacenter, 99.99% Uptime | ✅ Für Produktion |
| **Community Cloud** | Günstigere Consumer-GPUs, etwas weniger stabil | Für Tests OK |
 
### GPU-Empfehlung für Qwen 2509 + ComfyUI
 
Qwen Image Edit 2509 benötigt **mind. 16 GB VRAM** (fp16), optimal 24 GB.
 
| GPU | VRAM | Preis (On-Demand) | Empfehlung |
|---|---|---|---|
| **RTX 3090** | 24 GB | ~$0.34/h (Community) | ✅ Günstig, gut |
| **RTX 4090** | 24 GB | ~$0.39-0.69/h | ✅ **Beste Performance/Preis** |
| **L40S** | 48 GB | ~$1.14/h (Secure) | Für große Batches |
| **A100 80GB** | 80 GB | ~$1.09/h | Overkill für uns |
| RTX 4060 Ti | 16 GB | sehr günstig | ⚠️ Grenzwertig (INT8 nötig) |
 
**Empfehlung: RTX 4090 (24 GB)** — perfekte Balance aus VRAM, Speed und Preis.
 
### Network Volume (wichtig!)
- Persistenter Speicher zwischen Pod-Restarts
- Kosten: ~$0.07/GB/Monat
- **Qwen 2509 Modell**: ~15-20 GB
- **BFS LoRA V5**: ~1-2 GB
- **Alle LoRAs + Workflows**: ~30-50 GB gesamt
- Monatliche Speicherkosten: **~€2-4/Monat** — einmalig laden, immer verfügbar
 
### Serverless mit FlashBoot
- **FlashBoot**: RunPods Technologie für <200ms Cold-Start (statt 1-3 Min.)
- Worker bleiben "warm" im Hintergrund (minimale Kosten im Idle)
- Ideal für Booth: Gast nimmt Foto → Job sofort an Worker → kein Warten auf Kaltstart
 
### Kostenübersicht Serverless (RTX 4090)
 
| Job | Dauer | Kosten/Job |
|---|---|---|
| Face Swap (Qwen BFS) | ~25s | ~$0.025-0.035 (~€0.025) |
| Style Transfer (Flux + PuLID) | ~30s | ~$0.030-0.040 (~€0.030) |
| Upscaling (SUPIR 4x) | ~15s | ~$0.015-0.020 (~€0.015) |
| Video GIF (AnimateDiff) | ~90s | ~$0.09-0.12 (~€0.10) |
 
**200 AI-Bilder pro Booth-Event: ~€5-8 Compute-Kosten**
 
---
 
## 4. Offline-Fallback + Queue-Strategie
 
### Grundprinzip: App vs. Druck unterscheiden
 
```
KI-Job angefragt
     ↓
Ist Internet verfügbar?
     ├── JA → RunPod direkt → Ergebnis in ~25s
     └── NEIN → Was ist der Kontext?
                  ├── App-Feature (kein Druck) → Queue
                  └── Booth mit Druck → sofort Fallback
```
 
### App-Features (kein Druck) — Queue sinnvoll ✅
 
Gast macht Foto und wählt "Superheld":
1. Job wird in DB gespeichert (`AiJob` Tabelle, Status: `QUEUED`)
2. Gast sieht: *"Dein KI-Foto wird vorbereitet — du wirst benachrichtigt"*
3. Sobald Internet wieder da → Worker verarbeitet Queue
4. Gast erhält:
   - **Push-Notification**: "Dein Superheld-Foto ist fertig! 🦸"
   - **E-Mail** (optional): mit Foto + Download-Link
   - **In-App Badge**: rote Zahl auf Galerie-Icon
 
### Booth mit Druck — KEIN Queue ⚠️
 
Der Gast steht am Booth und wartet auf sein Druckfoto. Eine Warteschlange ist
hier **nicht akzeptabel** — das ruiniert das Erlebnis.
 
**Strategie: Retry + Graceful Degradation**
 
```
KI-Job (Face Swap) gestartet
     ↓
Versuch 1: RunPod (Timeout 5s auf Verbindung)
     ├── Erfolg → KI-Foto drucken ✅
     └── Fehler → Versuch 2 (nach 3s)
                   ├── Erfolg → KI-Foto drucken ✅
                   └── Fehler → Fallback
                                 ↓
                         Normal-Foto drucken (sofort)
                         + KI-Version in Queue
                         + Benachrichtigung wenn fertig
```
 
**Was der Gast sieht beim Fallback:**
> *"Dein Foto wird gedruckt! Die KI-Version findest du gleich in der Galerie."*
 
### Warteschlange — technisch
 
```typescript
// AiJob Tabelle (Prisma)
model AiJob {
  id          String    @id @default(cuid())
  eventId     String
  guestName   String?
  workflow    String    // z.B. "bfs_head_v5"
  inputImages String[]  // StoragePaths
  status      AiJobStatus @default(QUEUED)
  result      String?   // StoragePath des Ergebnisses
  notified    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  processedAt DateTime?
}
 
enum AiJobStatus {
  QUEUED
  PROCESSING
  DONE
  FAILED
}
```
 
**Queue-Worker** (im Backend, läuft alle 30s):
```typescript
// Prüft ob Internet verfügbar → verarbeitet QUEUED Jobs
// Sendet Push + E-Mail nach DONE
```
 
### Gast-Benachrichtigung
 
| Kanal | Wann | Inhalt |
|---|---|---|
| **Push Notification** | Sofort nach DONE | "Dein [Feature]-Foto ist fertig! 🎉" |
| **E-Mail** | Sofort nach DONE | Foto-Thumbnail + Download-Link |
| **Galerie Badge** | Beim nächsten App-Öffnen | Neue Fotos markiert |
| **SMS** (optional) | Nur wenn kein Push möglich | kurze URL |
 
---
 
## 5. No-Code Workflow Management
 
### Prinzip
```
Neues KI-Feature ohne Backend-Code:
1. ComfyUI lokal öffnen
2. Workflow visuell bauen (Drag & Drop Nodes)
3. Workflow als JSON exportieren
4. Im Admin Dashboard hochladen + AiFeature zuweisen
5. Feature ist live
```
 
### Workflow-Quellen
 
| Quelle | Art | Kosten |
|---|---|---|
| **Civitai** | Community Workflows | Kostenlos |
| **PromptBase** | Kuratierte Workflows | €5-30 |
| **Gumroad** | Creator Workflows | €10-50 |
| **Patreon** | Exklusive Workflows (z.B. BFS-Autor) | ~€5/Monat |
| **Selbst bauen** | Eigene Kombinationen | Zeit |
 
### ROI-Beispiel
```
Kauf: "Hollywood Movie Poster" Workflow → €20 einmalig
Deploy auf RunPod → sofort verfügbar
5 Energy Credits / Generation → nach ~10 Nutzungen ROI
Danach: nur ~€0.03 Compute-Kosten pro Bild
```
 
### Workflow-Kombinationen
 
| Name | Pipeline | Qualität |
|---|---|---|
| **Standard Face Swap** | Qwen BFS Head V5 → SUPIR 4x | ⭐⭐⭐⭐⭐ |
| **Premium Style Portrait** | Qwen BFS → PuLID Boost → Style LoRA | ⭐⭐⭐⭐⭐ |
| **Anime Transformation** | InstantID → Anime LoRA → Color Grade | ⭐⭐⭐⭐ |
| **Magazin-Cover** | InstantID → SDXL Studio → Text Overlay | ⭐⭐⭐⭐ |
| **Zeitreise** | Qwen BFS → Vintage LoRA → Desaturation | ⭐⭐⭐⭐ |
 
---
 
## 6. Gesamtarchitektur
 
```
┌─────────────────────────────────────────────────┐
│                  Gast App / Booth               │
└──────────────────────┬──────────────────────────┘
                       │ API-Call
┌──────────────────────▼──────────────────────────┐
│            Backend (Hetzner Server)             │
│                                                 │
│  ┌─────────────────┐    ┌────────────────────┐  │
│  │  Lokal (immer)  │    │  AiJob Queue       │  │
│  │  - Ollama LLM   │    │  (offline buffer)  │  │
│  │  - Face Search  │    └────────┬───────────┘  │
│  │  - sharp/rembg  │             │ wenn online  │
│  │  - FFmpeg       │             ▼              │
│  └─────────────────┘    ┌────────────────────┐  │
│                         │  RunPod Serverless  │  │
│                         │  (RTX 4090, 24GB)  │  │
│                         │  ComfyUI Worker    │  │
│                         └────────┬───────────┘  │
│                                  │ Ergebnis     │
│                         ┌────────▼───────────┐  │
│                         │  SeaweedFS / CDN   │  │
│                         └────────────────────┘  │
└─────────────────────────────────────────────────┘
                       │ Push / E-Mail
┌──────────────────────▼──────────────────────────┐
│              Gast wird benachrichtigt           │
└─────────────────────────────────────────────────┘
```
 
---
 
## 7. Kostenkalkulation
 
### Pro Booth-Event (~200 AI-Bilder)
 
| Posten | Kosten |
|---|---|
| RunPod Serverless (200 × €0.03) | ~€6 |
| Network Volume Speicher (~50 GB) | ~€0.30/Monat |
| Ollama/Groq (Text-KI) | ~€0.50 |
| SeaweedFS (eigener Server) | ~€0 |
| **Gesamt KI-Kosten/Event** | **~€7-10** |
 
### Im Booth-Mietpreis (€449) eingerechnet
```
Booth-Miete:   €449
KI-Kosten:      €10
Druckmedium:    ~€30 (100 Prints)
Marge:          €409+
```
 
### Jährlich (100 Events)
 
| Posten | Kosten/Jahr |
|---|---|
| RunPod Compute (100 × €7) | ~€700 |
| RunPod Network Volume | ~€4 |
| Hetzner Server | ~€1.200 |
| **Gesamt Infrastruktur** | **~€1.904** |
 
---
 
## 8. Implementierungs-Roadmap
 
### Phase 1 — RunPod Setup (1-2 Tage)
- [ ] RunPod Account + API Key
- [ ] Network Volume anlegen (50 GB)
- [ ] ComfyUI Docker Image bauen (Qwen 2509 + BFS LoRA V5 + SUPIR)
- [ ] Als Serverless Worker deployen (FlashBoot aktivieren)
- [ ] Test: BFS Head V5 mit echtem Foto
 
### Phase 2 — Backend Integration (2-3 Tage)
- [ ] `runpodService.ts` — ComfyUI API Client (Job submit + polling)
- [ ] `AiJob` Prisma Model + Queue Worker (30s Intervall)
- [ ] `faceSwitch.ts` auf RunPod/Qwen umstellen
- [ ] Offline-Fallback: Retry (2x) → Queue → Normal-Foto
- [ ] Push + E-Mail Notification nach Job-DONE
 
### Phase 3 — Admin Workflow Manager (2-3 Tage)
- [ ] Admin UI: Workflow JSON hochladen/verwalten/testen
- [ ] Workflow ↔ AiFeature Mapping
- [ ] Cold-Start Scheduling (Event-Buchung → Pod-Start -30min)
- [ ] Kosten-Tracking per Workflow
 
### Phase 4 — Weitere Workflows (laufend)
- [ ] Style Transfer (PuLID + Flux.1)
- [ ] Anime / Kunst-Stile (InstantID + SDXL)
- [ ] Magazin-Cover Template
- [ ] Video/GIF (AnimateDiff) — spätere Phase
 
---
 
## 9. Entscheidungen
 
| # | Entscheidung | Status |
|---|---|---|
| E-1 | RunPod Serverless + FlashBoot für Produktion | ✅ |
| E-2 | RTX 4090 (24 GB) als primäre GPU | ✅ |
| E-3 | Qwen Image Edit 2509 + BFS LoRA V5 als Face/Head Swap | ✅ |
| E-4 | Network Volume für persistente Modell-Speicherung | ✅ |
| E-5 | Cold Start mit Event-Buchungen verknüpfen (-30min) | ✅ |
| E-6 | App-Features: Queue + Notification bei Offline | ✅ |
| E-7 | Booth + Druck: KEIN Queue — Retry (2x) → Fallback Normal-Foto | ✅ |
| E-8 | Ollama (lokal) als LLM-Offline-Fallback | ✅ bereits aktiv |
| E-9 | Workflows kaufbar (Civitai/Gumroad) + eigene Builds | ✅ |
 