# docs/Manuals — Index

**Erstellt:** 2026-03-06  
**Zweck:** Zentrale Anlaufstelle für Handbücher, technische Dokumentation und Audit-Ergebnisse.

---

## Inhalt dieses Verzeichnisses

| Dokument | Zielgruppe | Beschreibung |
|----------|-----------|--------------|
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Entwickler | Technische Architektur, Setup, Services, Deploy |
| [USER_MANUAL.md](./USER_MANUAL.md) | Admins / Hosts / Gäste | Bedienungsanleitung für alle Benutzerrollen |
| [AUDIT_FINDINGS.md](./AUDIT_FINDINGS.md) | Entwickler / Opus | Alle offenen Punkte + Inkonsistenzen aus MD-Datei-Audit |

---

## Verwandte Dokumente (bestehend)

Diese Dokumente gehören thematisch hierher und werden hier referenziert, liegen aber im Hauptverzeichnis `/docs/`:

| Dokument | Beschreibung |
|----------|--------------|
| [`../DOKUMENTATION.md`](../DOKUMENTATION.md) | Technische Übersicht (Diagramme, Kennzahlen, UX-Audit) |
| [`../API_MAP.md`](../API_MAP.md) | Vollständige Endpoint-Referenz (130+ Routes) |
| [`../TUS_ARCHITECTURE.md`](../TUS_ARCHITECTURE.md) | Upload-Architektur (TUS, SeaweedFS, Processing-Pipeline) |
| [`../RUNPOD-COMFYUI-PLAN.md`](../RUNPOD-COMFYUI-PLAN.md) | KI-Architektur (RunPod, ComfyUI, Qwen Image Edit) |
| [`../AUTH_FLOWS.md`](../AUTH_FLOWS.md) | Authentifizierungs-Flows (Login, Reset, SSO) |
| [`../DEPLOYMENT.md`](../DEPLOYMENT.md) | Deploy-Prozesse (Dev → Prod, Rollback, Smoke-Checks) |
| [`../ADMIN_DASHBOARD.md`](../ADMIN_DASHBOARD.md) | Admin-Dashboard technische Details |
| [`../ADMIN_DASHBOARD_LAIEN.md`](../ADMIN_DASHBOARD_LAIEN.md) | Admin-Dashboard Laien-Erklärung |
| [`../FEATURES-GUIDE.md`](../FEATURES-GUIDE.md) | Feature-Guide (alle Features erklärt) |
| [`../TEST_GUIDE.md`](../TEST_GUIDE.md) | Test-Anleitung (E2E, Unit, Playwright) |
| [`../GIT_POLICY.md`](../GIT_POLICY.md) | Git-Richtlinien (Branches, Commits, Reviews) |
| [`../DB_FIELD_MEANINGS.md`](../DB_FIELD_MEANINGS.md) | Datenbank-Felder Erklärung |
| [`../STORAGE_AND_BLUR_POLICY.md`](../STORAGE_AND_BLUR_POLICY.md) | Speicher- & Blur-Policy |
| [`../MASTER-KONZEPT.md`](../MASTER-KONZEPT.md) | Single Source of Truth (Gesamtarchitektur) |

---

## Hinweis für Opus-Review

`AUDIT_FINDINGS.md` enthält alle offenen Punkte, die beim Review der 44 MD-Dateien gefunden wurden.  
**Keine Code-Änderungen wurden vorgenommen** — die Findings sind zur Prüfung und Entscheidung durch Opus markiert.
