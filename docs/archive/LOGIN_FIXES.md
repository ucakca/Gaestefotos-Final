# ✅ Login-Fixes implementiert

**Datum:** 2025-12-06

---

## 🔧 Behobene Probleme

### 1. ✅ Login-Weiterleitung korrigiert
- **Problem:** Customer-Benutzer wurden zu `/admin/dashboard` weitergeleitet
- **Lösung:** Explizite Prüfung auf `CUSTOMER`-Rolle → `/dashboard`, `ADMIN` → `/admin/dashboard`
- **Datei:** `/root/gaestefotos-app-v2/packages/frontend/src/app/login/page.tsx`

### 2. ✅ Rolle-Logik im Backend korrigiert
- **Problem:** Alle WordPress-Benutzer wurden als `ADMIN` gespeichert
- **Lösung:** Prüfung der WordPress `wp_capabilities` Meta-Daten:
  - WordPress-Administratoren → `ADMIN`
  - Alle anderen WordPress-Benutzer → `CUSTOMER`
- **Datei:** `/root/gaestefotos-app-v2/packages/backend/src/routes/auth.ts`

### 3. ✅ Registrierungs-Link entfernt
- **Problem:** "Noch kein Konto? Registrieren" Link war noch vorhanden
- **Lösung:** Link entfernt (App ist nur für gebuchte Benutzer)
- **Datei:** `/root/gaestefotos-app-v2/packages/frontend/src/app/login/page.tsx`

### 4. ✅ Passwort-vergessen-Link hinzugefügt
- **Problem:** Kein Link zum Zurücksetzen des Passworts
- **Lösung:** Link zu `https://gästefotos.com/forgot-password` (WordPress UsersWP)
- **Datei:** `/root/gaestefotos-app-v2/packages/frontend/src/app/login/page.tsx`

---

## 📋 Technische Details

### WordPress-Rolle-Erkennung
```typescript
// Prüfe WordPress-Benutzer-Capabilities
const [metaRows] = await connection.execute(
  `SELECT meta_value FROM ${wpConfig.tablePrefix}usermeta 
   WHERE user_id = ? AND meta_key = 'wp_capabilities'`,
  [wpUser.id]
);

let isAdmin = false;
if (Array.isArray(metaRows) && metaRows.length > 0) {
  const capabilities = JSON.parse((metaRows[0] as any).meta_value);
  isAdmin = capabilities['administrator'] === true;
}

// Setze Rolle basierend auf WordPress-Admin-Status
role: isAdmin ? 'ADMIN' : 'CUSTOMER'
```

### Login-Weiterleitung
```typescript
if (response.user.role === 'ADMIN') {
  router.push('/admin/dashboard');
} else if (response.user.role === 'CUSTOMER') {
  router.push('/dashboard');
} else {
  router.push('/dashboard'); // Fallback
}
```

---

## ✅ Status

- ✅ Login-Weiterleitung korrigiert
- ✅ Rolle-Logik korrigiert
- ✅ Registrierungs-Link entfernt
- ✅ Passwort-vergessen-Link hinzugefügt
- ✅ Services neu gestartet

---

**Status: ✅ Alle Probleme behoben!**
