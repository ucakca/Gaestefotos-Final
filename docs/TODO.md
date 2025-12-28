# TODO (Single Source of Truth)

Dieses Dokument spiegelt die aktuelle TODO-Liste aus dem Arbeits-Chat wider. Ziel: jederzeit im Repo nachschlagen können, was **fertig** ist und was **als nächstes** ansteht.

## Status Legende

- ✅ erledigt
- ⏳ in Arbeit
- ❌ offen/fehlt

## ✅ Done

- ✅ Backlog aus Feature-Spec erstellt
- ✅ Doku-Einstieg im Repo:
  - `docs/INDEX.md`
  - `docs/API_MAP.md`
  - `docs/GAP_ANALYSIS.md`
- ✅ GitHub Repo gepflegt: Commits gesplittet und nach `master` gepusht
- ✅ QR Tracking `?source=qr` (end-to-end):
  - Frontend QR Links: `/e/<slug>?source=qr`
  - Backend zählt in `GET /api/events/slug/:slug?source=...`
  - Host/Admin readback: `GET /api/events/:id/traffic`
- ✅ Admin UI: "Views by source" im Admin Dashboard (QR Print‑Service)
- ✅ DB Migration in Prod deployed: `20251228214500_event_traffic_stats`

## ⏳ In Progress

- ⏳ Audit vs. Spec (laufend)
- ⏳ Feature-Liste (implementiert) + Gap Table als Single Source of Truth weiter vervollständigen
- ⏳ Feature-Matrix (✅/◐/❌) im Repo pflegen: `docs/FEATURE_MATRIX.md`

## ❌ Next (Priorität hoch)

- ❌ Smart Albums (Zeitfenster): DB/API/Validation/Mapping + UI
- ❌ Host Wizard (Live Preview + Save Flow)
- ❌ Upload Robustness (Progress/Retry/Processing)
- ❌ Offline Upload Queue (Service Worker + IndexedDB)
- ❌ Live Wall Tiering/Sort/Animations
- ❌ WP Bridge v1 Contracts/Endpoints (falls Abweichung)
- ❌ Admin Impersonation
- ❌ Hard Constraints final alignment

## ❌ Later

- ❌ Design Polish
- ❌ Big end-to-end Testlauf vor Launch
