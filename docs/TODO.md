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
  - External Smoke (Prod Domain): Count increment + Readback verifiziert
- ✅ Production Frontend: `/_next/static/*` liefert wieder `200` + korrekte Content-Types
- ✅ Admin UI: "Views by source" im Admin Dashboard (QR Print‑Service)
- ✅ DB Migration in Prod deployed: `20251228214500_event_traffic_stats`
- ✅ Smart Albums (Zeitfenster): UI + API Integration (startAt/endAt)
- ✅ Host Wizard (minimal via `?wizard=1`): New Event → Design → Categories
- ✅ Upload Robustness: zentrale Error-Formatierung + Retryability + Progress UI (Live Camera)
- ✅ Offline Upload Queue (IndexedDB, minimal): enqueue bei offline/transient, auto-retry bei online
- ✅ Live Wall Tiering/Sort/Animations (Basis): Sort (Neueste/Zufall) + Realtime/Polling Toggle + sanfte Animations
- ✅ WP Bridge v1 Contracts/Endpoints (WordPress SSO / Woo Contracts)
- ✅ WP Bridge: Marketing stats endpoint (Admin) + External Smoke
- ✅ Admin Impersonation
- ✅ WP Bridge: WooCommerce Webhook Contract (Payload/meta keys, signature, idempotency, upgrade/create) dokumentiert
- ✅ WP Bridge: Admin Woo logs/replay endpoints dokumentiert + External Smoke (Prod: 401 ohne Auth)
- ✅ Hard Constraints final alignment
- ✅ Audit vs. Spec: WP Bridge v1 (Endpoints/Contracts) vollständig gegen Repo abgeglichen
- ✅ Audit vs. Spec: Invitations/RSVP/Shortlinks/ICS (Code vs Doku) abgeglichen
- ✅ Audit vs. Spec: Live Wall (Realtime/Polling/Socket Events) abgeglichen
- ✅ Audit vs. Spec: Uploads (Guards/Limits/Offline Queue) abgeglichen
- ✅ Audit vs. Spec: Admin (Dashboards/Tools/Endpoints) abgeglichen

## ⏳ In Progress

- ⏳ (leer)

## ❌ Next (Priorität hoch)

- ❌ UI Redesign (alle Oberflächen): shadcn/ui + Tailwind, Apple-clean Basis + Theme-Welten
- ❌ Media Pipeline/Downloads: Optimized Views für Guest/Host, aber Original Download für Host/Admin; Guest-Downloads nur bei Host `allowDownloads`
- ❌ Pre-Launch: finaler System-Check (Smoke Tests, Monitoring, Rollback Plan)

## ❌ Later

- ❌ Design Polish
- ❌ Big end-to-end Testlauf vor Launch
