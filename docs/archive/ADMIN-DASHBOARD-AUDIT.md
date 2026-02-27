# Admin Dashboard — Tiefenprüfung (19.02.2026)

## Zusammenfassung

- **40 Seiten** im Admin-Dashboard
- **35 Sidebar-Links** (3 Seiten verwaist / nicht verlinkt)
- **API-Tests verifiziert**: 37 OK, 0 echte 404s, 1 Endpoint-Mismatch, 1 Duplikat, 3 Security-Prüfungen

---

## API-Ergebnisse (vollständig verifiziert)

### ✅ Funktioniert — API antwortet korrekt (37 Seiten)

| Seite | API-Pfade | Status |
|---|---|---|
| `/dashboard` | `/version`, `/admin/ops/server`, `/admin/dashboard/stats`, `/admin/dashboard/analytics` | ✅ |
| `/manage/users` | `/admin/users` | ✅ |
| `/manage/events` | `/admin/events` | ✅ |
| `/manage/events/[id]` | `/admin/events/:id` + AI Config + Prompt Overrides | ✅ |
| `/manage/events/[id]/photos` | `/admin/photos` | ✅ |
| `/manage/events/create` | POST `/admin/events` | ✅ |
| `/manage/packages` | `/admin/package-definitions` | ✅ |
| `/manage/qr-templates` | `/admin/qr-templates` | ✅ |
| `/manage/email-templates` | `/admin/email-templates` | ✅ |
| `/invitation-templates` | `/admin/invitation-templates` | ✅ |
| `/manage/landing` | `/admin/landing` | ✅ |
| `/manage/cost-monitoring` | `/admin/cost-monitoring/summary,timeline,top-events,alerts,energy-stats,provider-live,recent-jobs` | ✅ |
| `/manage/ai-features` | `/admin/ai-providers/features/status`, `/admin/ai-providers/features/mappings` | ✅ |
| `/manage/ai-providers` | `/admin/ai-providers` | ✅ |
| `/manage/prompt-templates` | `/admin/prompt-templates` | ✅ |
| `/manage/workflows` | `/workflows` (kein admin prefix, aber funktioniert) | ✅⚠️ |
| `/manage/partners` | `/partners` (kein admin prefix, aber funktioniert) | ✅⚠️ |
| `/manage/event-themes` | `/event-themes` (kein admin prefix, aber funktioniert) | ✅⚠️ |
| `/feature-flags` | `/admin/feature-flags` | ✅ |
| `/system/health` | `/admin/ops/health` | ✅ |
| `/system/logs` | `/admin/logs` | ✅ |
| `/system/ai-logs` | `/admin/ai-logs`, `/admin/ai-logs/patterns` | ✅ |
| `/system/rate-limits` | `/admin/ops/rate-limits` (nutzt raw fetch) | ✅ |
| `/system/debug` | `/debug/state`, `/debug/logs` | ✅ |
| `/system/backups` | `/admin/backups` | ✅ |
| `/settings/api-keys` | `/admin/api-keys` | ✅ |
| `/settings/general` | `/admin/settings/general` | ✅ |
| `/settings/maintenance` | `/admin/maintenance` | ✅ |
| `/settings/woo` | `/admin/webhooks/woocommerce/logs`, `/sku-mapping` | ✅ |
| `/design/theme` | `/admin/theme` | ✅ |

### ✅ Korrigiert — waren Testfehler (4 Seiten, alle OK)

| Seite | API-Pfade | Anmerkung |
|---|---|---|
| `/manage/sms` | `/sms/admin/logs`, `/sms/admin/stats`, `/sms/admin/config` (raw fetch) | ✅ Funktioniert — war falscher Testpfad |
| `/system/ai-analyse` | POST `/admin/ai/analyze-logs` | ✅ Funktioniert — war GET statt POST getestet |
| `/manage/embed` | `/events` + `/events/:id/embed` (raw fetch) | ✅ |
| `/manage/slideshow` | `/events` (raw fetch) | ✅ |

### ⚠️ Endpoint-Mismatch (1 Seite)

| Seite | Frontend ruft | Backend hat | Fix nötig |
|---|---|---|---|
| `/manage/impersonation` | POST `/admin/impersonation/generate` | POST `/admin/impersonation/token` | Frontend-Pfad ändern ODER Backend-Alias |

### 🔍 Verwaiste Seiten — nicht in Sidebar (3 Seiten)

| Seite | API funktioniert? | Bewertung |
|---|---|---|
| `/manage/credits` | ✅ `/admin/credits/overview` antwortet | In Sidebar einbinden (KI & Automation) |
| `/manage/prompt-analyzer` | ✅ `/admin/prompt-analyzer/*` antwortet | In Sidebar einbinden (KI & Automation) |
| `/system/ai-cache` | ✅ `/ai/cache/stats` antwortet | In Sidebar einbinden (System) |

### 🔄 Duplikat

| Seite 1 | Seite 2 | Lösung |
|---|---|---|
| `/design/theme` | `/settings/theme` | `/design/theme` behalten, `/settings/theme` entfernen |

---

## Sicherheits-Hinweise

3 Admin-Seiten rufen APIs OHNE `/admin/` Prefix auf:
1. **`/partners`** — prüfen ob auth-middleware aktiv
2. **`/event-themes`** — prüfen ob auth-middleware aktiv
3. **`/workflows`** — prüfen ob auth-middleware aktiv

→ Risiko: Nicht-Admins könnten diese Endpoints direkt aufrufen

---

## Priorisierte Fix-Liste

### P0 — Einziger echter Bug
1. **Impersonation**: Frontend `POST /generate` → Backend hat `POST /token` — Endpoint-Name Mismatch

### P1 — Sicherheit
2. Auth-Guard für `/partners`, `/event-themes`, `/workflows` verifizieren (kein `/admin/` prefix)

### P2 — Verwaiste Seiten einbinden
3. Credits → Sidebar "KI & Automation"
4. Prompt Analyzer → Sidebar "KI & Automation"
5. AI Cache → Sidebar "System"

### P3 — Aufräumen
6. `/settings/theme` entfernen (Duplikat von `/design/theme`)
7. Sidebar: "Event erstellen" aus Menü entfernen (Button in Events-Liste reicht)
8. Sidebar: "Design" Gruppe entfernen (1 Item → in "Einstellungen" verschieben)
