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
  - Theme Tokens (Admin Settings): `docs/THEME_TOKENS_AND_ADMIN_SETTINGS.md`
  - Event DesignConfig + QR Template Config: `docs/EVENT_DESIGNCONFIG_AND_QR_TEMPLATE_CONFIG.md`
  - Event FeaturesConfig (Guest UX Flags): `docs/EVENT_FEATURES_CONFIG.md`

- **QA / Test / Deploy**
  - Test Guide: `docs/TEST_GUIDE.md`
  - QA Checklist: `docs/QA_CHECKLIST.md`
  - Pre-Launch Checklist: `docs/PRE_LAUNCH_CHECKLIST.md`
  - Deployment: `docs/DEPLOYMENT.md`
  - Ops Runbooks: `docs/ops/README.md`
    - Deploy & Rollback: `docs/ops/DEPLOY_AND_ROLLBACK.md`
    - Backups & Restore: `docs/ops/BACKUPS_AND_RESTORE.md`
    - Monitoring & Alerting: `docs/ops/MONITORING_AND_ALERTING.md`
    - 2FA Key Rotation: `docs/ops/TWO_FACTOR_KEY_ROTATION.md`
    - Face Search Consent Rollout: `docs/ops/FACE_SEARCH_CONSENT_ROLLOUT.md`

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

## IDE / Git (Quick Fix bei "hängt")

- **Warum kann `git push` "hängen"?**
  - Im Repo ist ein `pre-push` Hook aktiv, der ggf. `pnpm run e2e:stable` startet.
  - Wenn Playwright/Browser nicht installiert sind oder der Run lange dauert, wirkt das wie ein Freeze.

- **IDE-sichere Commands (non-interactive)**
  - `git --no-pager status --porcelain=v1`
  - `git --no-pager log -n 3 --oneline`
  - Push ohne Hook (schnell): `SKIP_E2E_HOOK=1 git push`
  - Alternativ (skip alle Hooks): `git push --no-verify`
  - E2E erzwingen: `FORCE_E2E_HOOK=1 git push`

- **Hooks sauber installieren**
  - `pnpm run hooks:install` (installiert die Repo-Hooks nach `.git/hooks/*`)

