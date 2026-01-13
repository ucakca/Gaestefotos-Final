# 🔍 WordPress Login Debug-Informationen

**Datum:** 2025-12-06  
**Problem:** Einige WordPress-Benutzer können sich nicht anmelden

---

## ✅ Funktioniert

- **uwp.dummy.user+13@gmail.com** ✅
  - Passwort: `IiPFz8hf#S@B)W7WrQ@2$*1m`
  - Hash: `$wp$2y$10$.5ZNIT.y3eM1nLk40KCXruMFpCWaiXGnWKTFGQ07z4OBkzGejMkp2`
  - Verifizierung: ✅ Erfolgreich

---

## ❌ Funktioniert NICHT

- **uwp.dummy.user+1@gmail.com** ❌
  - Passwort: `BRu@13dE*CY*gLrT%J!!T1n^`
  - Hash: `$wp$2y$10$UtVyFXBHlKslNgsPwxBHW.DGe.lc2liYAzZofalQW1uWitrTS9qj6`
  - Verifizierung: ❌ Fehlgeschlagen

---

## 🔍 Analyse

### Hash-Format
Beide Benutzer haben das gleiche Hash-Format:
- Format: `$wp$2y$10$...` (WordPress custom format)
- Länge: 63 Zeichen
- Struktur: `$wp` + bcrypt hash

### Passwort-Verifizierung
Die Verifizierung funktioniert so:
1. HMAC-SHA384 mit Key `'wp-sha384'` und Passwort als Daten
2. Base64-Kodierung des Ergebnisses
3. Bcrypt-Vergleich mit Hash ohne `$wp` Prefix

### Problem
- Für `uwp.dummy.user+1@gmail.com` schlägt die Verifizierung fehl
- Mögliche Ursachen:
  1. **Passwort ist falsch** - Das angegebene Passwort stimmt nicht mit dem Hash überein
  2. **Hash wurde anders erstellt** - Möglicherweise mit einer anderen WordPress-Version oder einem Plugin
  3. **Spezielle Zeichen** - Möglicherweise werden spezielle Zeichen anders behandelt

---

## 💡 Lösungsvorschläge

### 1. Passwort in WordPress zurücksetzen
Das Passwort für `uwp.dummy.user+1@gmail.com` sollte in WordPress zurückgesetzt werden:
- WordPress Admin → Benutzer → Passwort zurücksetzen
- Oder über die Datenbank direkt aktualisieren

### 2. Passwort-Verifizierung testen
Teste das Passwort direkt in WordPress:
```php
wp_check_password('BRu@13dE*CY*gLrT%J!!T1n^', '$wp$2y$10$UtVyFXBHlKslNgsPwxBHW.DGe.lc2liYAzZofalQW1uWitrTS9qj6')
```

### 3. Alternative: Passwort-Hash neu generieren
Wenn das Passwort korrekt ist, aber der Hash nicht funktioniert, kann der Hash neu generiert werden.

---

## 📋 Technische Details

### WordPress wp_check_password Logik
```php
if ( str_starts_with( $hash, '$wp' ) ) {
    $password_to_verify = base64_encode( hash_hmac( 'sha384', $password, 'wp-sha384', true ) );
    $check = password_verify( $password_to_verify, substr( $hash, 3 ) );
}
```

### Node.js Implementierung
```typescript
if (hash.startsWith('$wp')) {
    const hmac = crypto.createHmac('sha384', 'wp-sha384');
    hmac.update(password);
    const passwordToVerify = hmac.digest('base64');
    const bcryptHash = hash.substring(3);
    isValid = await bcrypt.compare(passwordToVerify, bcryptHash);
}
```

---

## ✅ Status

- ✅ WordPress-Integration implementiert
- ✅ Passwort-Verifizierung funktioniert für einen Benutzer
- ⚠️  Ein Benutzer hat ein Problem (möglicherweise falsches Passwort)

---

**Empfehlung:** Passwort für `uwp.dummy.user+1@gmail.com` in WordPress zurücksetzen und erneut testen.
