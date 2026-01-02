# Theme Tokens & Admin Settings (AppSetting) – technisch + laiensicher

Ziel: Dokumentiert, wie **systemweite UI-Themes** (CSS Variablen / Tokens) und einige globale Admin-Settings in der DB gespeichert und von Frontend/Admin-Dashboard genutzt werden.

---

## Laiensicher (Was bedeutet das?)

### Was sind „Theme Tokens“?

Theme Tokens sind **Farb- und UI-Variablen**, die das Aussehen der App steuern (z.B. Hintergrundfarbe, Textfarbe, Rahmenfarbe).

- Du kannst dir das vorstellen wie: „**Design-Regler**“ für die komplette Oberfläche.
- Wenn man einen Token ändert, passt sich die UI an vielen Stellen gleichzeitig an.

### Wo werden diese Tokens geändert?

Im **Admin-Dashboard** unter „Einstellungen“:

- du kannst CSS Variablen (z.B. `--app-bg`) und deren Werte (z.B. `#ffffff`) pflegen
- die Seite zeigt eine **Live Preview**

### Was ist `--app-on-dark`?

Ein extra Token für „**Text auf dunklem Hintergrund**“. Damit müssen wir nicht überall `text-white` hart codieren.

- wird z.B. für Admin Sidebar / Sheet genutzt
- bleibt in Hell- und Dark-Mode bewusst `#ffffff`

---

## Technisch (Single Source of Truth)

### DB Modell

Die Werte liegen in der Tabelle `app_settings` als Key/Value:

- Prisma Model: `packages/backend/prisma/schema.prisma`
  - `AppSetting.key: String` (Primary Key)
  - `AppSetting.value: Json`

### Key: Theme Tokens

- Key: `theme_tokens_v1`
- Inhalt in `AppSetting.value`:

```json
{
  "tokens": {
    "--app-bg": "#ffffff",
    "--app-fg": "#111827"
  }
}
```

#### Admin API (schreibend)

- Backend Route: `packages/backend/src/routes/adminTheme.ts`
- Mount: `packages/backend/src/index.ts`
  - `app.use('/api/admin/theme', adminThemeRoutes)`

Endpoints:

- `GET /api/admin/theme`
  - Auth: `authMiddleware`
  - Role: `requireRole('ADMIN')`
  - Response: `{ key: 'theme_tokens_v1', tokens: Record<string,string> }`

- `PUT /api/admin/theme`
  - Auth: `authMiddleware`
  - Role: `requireRole('ADMIN')`
  - Body: `{ tokens: Record<string,string> }`
  - Speichert via Prisma `upsert` auf `AppSetting(key='theme_tokens_v1')`

#### Public API (lesend)

- Backend Route: `packages/backend/src/routes/theme.ts`
- (dient z.B. für Public/Frontend Token Load)

Endpoint:

- `GET /api/theme`
  - Response: `{ key: 'theme_tokens_v1', tokens: Record<string,string> }`

### Key: Face Search Consent

- Key: `face_search_consent_v1`
- Inhalt in `AppSetting.value`:

```json
{
  "noticeText": "…",
  "checkboxLabel": "…"
}
```

- Backend Route: `packages/backend/src/routes/adminFaceSearchConsent.ts`
- Mount: `app.use('/api/admin/face-search-consent', adminFaceSearchConsentRoutes)`

Endpoints:

- `GET /api/admin/face-search-consent` (ADMIN)
- `PUT /api/admin/face-search-consent` (ADMIN)

### Admin Dashboard UI

- Settings Page: `packages/admin-dashboard/src/app/settings/page.tsx`

Data Flow:

- lädt beim Mount:
  - `api.get('/admin/theme')`
  - `api.get('/admin/face-search-consent')`
- schreibt Tokens live in den DOM:
  - `document.documentElement.style.setProperty(key, value)`
- speichert:
  - `api.put('/admin/theme', { tokens })`
  - `api.put('/admin/face-search-consent', { noticeText, checkboxLabel })`

---

## Hinweise / Konventionen

- **Tokens sind CSS Custom Properties** (Keys müssen mit `--` beginnen).
- **Hex in `globals.css` ist ok**, weil das die Quelle/Definition der Tokens ist.
- In Komponenten bevorzugen wir Tokens/Utilities (z.B. `text-app-fg`, `bg-app-card`) statt `text-white`/`#fff`.

