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
- ✅ Admin Dashboard (shadcn/ui + Tailwind, token-based, responsive)
  - Login, Dashboard, Events List, Event Detail
  - App Shell: mobile Drawer + Desktop Sidebar
  - Missing Routes: `/system`, `/users`, `/logs`, `/settings` (auth-gated)
- ✅ Theme System v1 (Design Tokens in DB)
  - Backend: Admin API `GET/PUT /api/admin/theme` (AppSetting `theme_tokens_v1`)
  - Backend: Public API `GET /api/theme`
  - Admin UI: Theme Editor (live preview + save/load)
  - Auto-Apply: ThemeLoader in Frontend + Admin root layout
- ✅ Frontend Color Tokenization Sweep (Hardcoded Colors → Tokens)
  - Tokenisierung in `packages/frontend/src` (Pages + Components)
  - Commit: `7ec7698` (pushed to `master`)
  - Verifikation: `pnpm type-check` + `pnpm lint` (repo-weit) erfolgreich
- ✅ Git Push “hang” Fix (Dev Workflow)
  - Ursache dokumentiert: pre-push Hook / E2E
  - IDE-safe Git Commands in `docs/INDEX.md`
- ✅ Shared App Shell Refactor (Navigation/Layout/Auth gates/Loading/Error)
  - Frontend:
    - `ProtectedRoute` eingeführt und `/dashboard` damit abgesichert
    - `/events/*` per `app/events/layout.tsx` zentral per Auth-Gate geschützt
    - `FullPageLoader` (UI) ergänzt und `/e2` + `/events/[id]` Loading/Error vereinheitlicht
    - `Centered` Hintergrund auf `bg-app-bg` vereinheitlicht
  - Admin:
    - `FullPageLoader` eingeführt und Loading-States (Events/Settings/Event Detail) vereinheitlicht
  - Verifikation: `pnpm type-check` + `pnpm lint` (repo-weit) erfolgreich
- ✅ Media Pipeline/Downloads: Guest-Downloads nur wenn Host `allowDownloads`
  - Backend: download endpoints prüfen `featuresConfig.allowDownloads` für Guests
  - Frontend: `/e` + `/e2` defaulten `allowDownloads` korrekt auf `!== false`
  - Verifikation: `pnpm type-check` + `pnpm lint` erfolgreich
- ✅ Status Token Sweep (Frontend: `var(--status-*)` Klassen → `*-status-*` Tokens)
  - Verifikation: keine `text/bg/border/fill-[var(--status-*)]` Klassen mehr in `packages/frontend/src`
  - Hinweis: verbleibende `var(--status-*)` Vorkommen sind nur noch Chart/Gradient-Strings (kein Tailwind-Class-Usage)
- ✅ Frontend: Sweep remaining raw form controls in Event Flows (TODO 203)
  - `Select` Primitive (Radix) ergänzt + native `<select>` migriert (u.a. `design`, `challenges`, `qr-styler`)
  - `Slider` Primitive (Radix) ergänzt + QR-Größe in `design` migriert
  - Checkbox/Inputs in `edit`/`dashboard`/`categories` token-konform vereinheitlicht
  - Verifikation: `pnpm type-check` + `pnpm lint` erfolgreich
- ✅ Pre-Launch: finaler System-Check (Smoke Tests, Monitoring, Rollback Plan)
- ✅ Prod Smoke: `app` Root `200` + `/_next/static/*` Asset `200` (Chunk-500 via sauberem stop→build→start behoben)
- ✅ Prod Smoke: `dash` DNS + TLS + Routing ok (`dash.xn--gstefotos-v2a.com` → Next.js, Root `30x` ok + `/_next/static/*` Asset `200`)
- ✅ Ops/Health (Admin): Backend endpoint `GET /api/admin/ops/health` + Admin UI `/system` (Smoke Checks: app/dash root + _next asset + API health)
- ✅ Prod Fix: `dash` Admin API Routing: Nginx `location ^~ /api/` proxied → Backend (`127.0.0.1:8001`) + Backend CORS erlaubt `dash.*` Origins (Login funktioniert)
- ✅ Prod Fix: `dash` `GET /favicon.ico` liefert `204` (kein 404/500 in Browser-Konsole)

- ✅ Prod Fix: WordPress Role-Downgrade wird beim Login korrekt übernommen
  - Problem: User hatte früher Admin, ist in WP inzwischen `customer` → App leitete trotzdem nach `dash.*` um
  - Fix (Backend): Login resynct Role best-effort gegen WordPress für `wordpressUserId` Users
  - Ergebnis: Redirect/Permissions folgen der aktuellen DB/WP Rolle

- ✅ Hardening: App Login Redirect nach `dash.*` nur nach autoritativem `/api/auth/me`
  - Fix (Frontend): Redirect-Entscheidung basiert auf DB-Rolle via `/auth/me`, nicht auf Login-Response alone
  - Ergebnis: weniger Risiko durch stale Role-Infos / Edge-Cases

- ✅ Ops Fix: Admin Dashboard `Failed to find Server Action` (stale build/assets)
  - Fix: service stop → build → start (und danach Smoke erneut)
  - Verifikation: `scripts/prelaunch-smoke.sh` erneut grün, keine neuen Fehler in `journalctl`

- ✅ UI Redesign (alle Oberflächen): shadcn/ui + Tailwind, Apple-clean Basis + Theme-Welten
  - Admin-Dashboard:
    - shadcn Baseline Setup (deps + `tailwindcss-animate` + `components.json`)
    - Primitives migriert: `Button`/`Input`/`Card` (cva + asChild + forwardRef)
    - Shell-Navigation auf Primitives umgestellt (AdminShell/Sidebar)
    - Primitives ergänzt: `DropdownMenu` + `Dialog` (Radix/shadcn wrapper)
    - Echte Usage-Migrationen:
      - Events List: Row Actions via `DropdownMenu` (Details + Slug kopieren)
      - Event Detail: Confirm `Dialog` für „Freigeben (CLEAN)“ (Scan-Issues)
  - Frontend:
    - shadcn Baseline Setup (deps + `tailwindcss-animate` + `components.json`)
    - Primitives migriert: `Button`/`Input`/`Card`/`IconButton`
    - Primitives ergänzt: `DropdownMenu` + `Dialog` (Radix/shadcn wrapper)
    - Primitives ergänzt: `Textarea`
    - Primitives ergänzt: `Select` + `Slider` (Radix/shadcn wrapper)
    - Echte Usage-Migrationen:
      - Uploader Filter: Photos + Videos via `DropdownMenu`
      - Bulk Actions: Photos + Videos via `DropdownMenu` + Submenu „Verschieben"
      - Confirm-Dialog statt `confirm(...)`: Photos + Videos (Bulk Reject/Delete + Delete/Purge)
      - `UploadModal` migriert: Custom Overlay → `Dialog`
      - Eventweite Settings Controls tokenisiert: `accent-*` statt inline `accentColor` + Inputs via `Input`
      - Dashboard: `alert(...)` → `showToast(...)` + Buttons/Inline-Edits auf Primitives
      - ✅ Remaining native controls migration (Frontend, `packages/frontend/src/components`, exkl. `/components/ui`):
        - ✅ `SocialShare`
        - ✅ `LanguageSelector`
        - ✅ `FilterButtons`
        - ✅ `ActionButton`
        - ✅ `DateTimePicker`
        - ✅ `TimeInput24h`
        - ✅ `HostPhotoUpload`, `PhotoUpload`, `FaceSearch`, `guest/StoriesBar`, `guest/StoryViewer`
        - Policy: `type="file"` bleibt bewusst **native**

## ⏳ In Progress

- ⏳ Design Polish
  - A11y: Icon-only Buttons mit `aria-label`/`title` ergänzt (u.a. `Gallery` Lightbox, `ModernPhotoGrid` Actions)
  - Cleanup: Debug-`console.log` entfernt (u.a. `Guestbook`, `ChallengeCompletion`)
  - Konsistenz: einzelne Labels vereinheitlicht (z.B. „Emoji auswählen")

- ✅ Native Control Migration (Select/Date/Datetime)
  - Keine nativen `<select>`/`input[type=date|time|datetime-local]` mehr (außer bewusste `type="file"` Uploads)
  - `DateTimePicker` erweitert: `disabled`, `minDate`

- ✅ Hardcoded Color Sweep (TODO 171)
  - Fallback-Gradienten/Inline-Styles auf `var(--...)` Tokens umgestellt (u.a. `design` A5 PDF, Design fallback gradients)
  - QR-Styler Defaults via Root-CSS-Variablen aufgelöst (sichere Hex-Fallbacks)
  - Design Presets: globale Brand/Neutral-Fallbacks tokenisiert (Preset-Farben bewusst unangetastet)
  - Frontend UI-Chrome: Overlay Backdrop + QR Container tokenisiert (kein `bg-black`/`bg-white` in Primitives)
  - Admin Dashboard: `text-white`-Hardcodes entfernt via Token `--app-on-dark` (Sidebar + Sheet)
  - Bewusst verbleibende Hex-Werte:
    - `globals.css` `:root` enthält die **Token-Quellen** (Hex ist hier ok, weil es die Definition der Tokens ist)
    - Presets/Templates (z.B. „Soft Floral“, „Elegant Rose“, Design Presets) bleiben bewusst **bunt** (intentional), damit sich das Design nicht verändert
    - In `resolveRootCssVar(..., '#...')` verbleiben **sichere Fallbacks** für den Fall, dass CSS-Variablen nicht verfügbar sind
  - Policy (künftig):
    - UI/„Shell“ Farben: **immer** Tokens/Utilities (`bg-app-*`, `text-app-*`, `border-app-*`, `var(--...)`)
    - Preset-Designs: dürfen Hex enthalten, wenn es **intentional** ist (Design darf nicht kippen)
    - Themeable-Presets (optional, später): Preset-Definition bleibt semantisch (z.B. `primary/secondary/accent`) und wird beim Rendern gegen Tokens aufgelöst
  - Bewusst verbleibende `black/white` Klassen (Frontend):
    - `app/ui/page.tsx` ist eine Design-System Demo/Preview und nutzt bewusst `white` als Demo-Surface
    - `StoryViewer` ist bewusst „cinema-dark“ (Overlay/Controls), aber token-basiert (`bg-app-fg`, `text-app-bg`)

## ❌ Next (Priorität hoch)

- ✅ Big end-to-end Testlauf vor Launch

- ✅ Security Hardening: 2FA (TOTP)
  - Ziel: **ADMIN verpflichtend**, HOST optional (Opt-in)
  - Backend (TOTP + Recovery Codes)
    - DB: `twoFactorEnabled`, `twoFactorPending`, `twoFactorSecretEncrypted`, `twoFactorSecretIv`, `twoFactorSecretTag`, `twoFactorRecoveryCodesHashed`, `twoFactorSetupAt`
    - ENV (prod): `TWO_FACTOR_ENCRYPTION_KEY` (für AES-256-GCM Secret-Encryption)
    - Endpoints:
      - `POST /api/auth/2fa/verify` (TOTP oder Recovery Code)
      - `POST /api/auth/2fa/setup/start` + `POST /api/auth/2fa/setup/confirm` (JWT-basiert, Admin Settings)
      - `POST /api/auth/2fa/setup/start-challenge` + `POST /api/auth/2fa/setup/confirm-challenge` (ohne JWT; Login-Setup-Flow)
  - Enforcement (Admin Login)
    - `/api/auth/login` gibt für Admins ohne 2FA **kein JWT** zurück, sondern `twoFactorSetupRequired` + Challenge Token (purpose `2fa_setup`)
    - bei aktivierter 2FA: `twoFactorRequired` + Challenge Token (purpose `2fa`)
  - Abuse-Prevention
    - dedizierte Rate-Limits für 2FA Setup/Verify + Delay/Jitter bei falschen Codes
    - Audit-Logs (minimal): verify ok/fail, setup start/confirm

## ❌ Later


