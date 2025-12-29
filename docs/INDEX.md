# Docs Index (Start hier)

Ziel: Diese Dokumente sind die **Single Source of Truth** für Architektur, APIs, Datenmodell und Produktlogik – sowohl **technisch** als auch **laiensicher**.

## Schnellstart (für Laien)

- **Was ist Gästefotos?**
  - Eine Plattform, mit der Gäste Fotos/Videos zu einem Event hochladen können.
  - Der Host (Veranstalter) kann Inhalte moderieren und teilen.

- **Wie läuft ein Event typischerweise ab?**
  - Host erstellt Event → teilt Gast-Link/QR → Gäste laden hoch → Host moderiert → Galerie/Live Wall zeigt Inhalte.

## Technischer Einstieg

- **Architektur / Systemüberblick**
  - Siehe: `docs/API_MAP.md` (Endpoints + Verantwortlichkeiten)
  - Siehe: `docs/DB_FIELD_MEANINGS.md` (Datenmodell + Bedeutungen)

- **Kernlogiken / Policies**
  - Storage/Blur/Lock: `docs/STORAGE_AND_BLUR_POLICY.md`
  - Stories: `docs/STORIES.md`
  - QR Templates + Export: `docs/QR_TEMPLATES.md`

- **QA / Test / Deploy**
  - Test Guide: `docs/TEST_GUIDE.md`
  - QA Checklist: `docs/QA_CHECKLIST.md`
  - Deployment: `docs/DEPLOYMENT.md`

## Gap-Analyse (Feature Spec → Code)

- **Aktueller Umsetzungsstand & Lücken**: `docs/GAP_ANALYSIS.md`

## TODO (Arbeitsliste)

- **Aktuelle TODO-Liste (Repo)**: `docs/TODO.md`

## Repo-Navigation (Where to look)

- **Backend**: `packages/backend/src`
  - Entry: `packages/backend/src/index.ts`
  - Routes: `packages/backend/src/routes/*`
  - Services: `packages/backend/src/services/*`
  - DB Schema: `packages/backend/prisma/schema.prisma`

- **Frontend**: `packages/frontend/src`
  - Routes (App Router): `packages/frontend/src/app/*`
  - UI Components: `packages/frontend/src/components/*`
  - Hooks: `packages/frontend/src/hooks/*`

## Konventionen

- **Kanonische Gast-URL**: `/e/[slug]` (QR/Links sollen hierhin zeigen)
- **API Calls im Browser (Prod)**: same-origin `'/api'`

## Repo Hygiene

- **Git Policy (Ignore/Exclude Regeln)**: `docs/GIT_POLICY.md`

