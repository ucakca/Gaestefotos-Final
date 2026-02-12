# WooCommerce × gästefotos.com — Setup-Anleitung

> Stand: 12.02.2026

---

## Übersicht

Kunden kaufen Pakete und Addons über den WooCommerce-Shop auf **gästefotos.com**. Nach erfolgreicher Zahlung sendet WooCommerce automatisch einen Webhook an die App-API. Die App erstellt daraufhin das Event und schaltet die gebuchten Features frei.

```
Kunde kauft im Shop → WooCommerce Webhook → App-Backend → Event + Entitlements
```

---

## 1. Produkte in WooCommerce anlegen

### Base-Pakete (Typ: BASE)

| SKU | Name | Preis | Beschreibung |
|-----|------|-------|-------------|
| `free` | Free | 0 € | 4×4 Grid, Wasserzeichen, 7 Tage Archiv |
| `starter` | Starter | 49 € | Bis 200 Fotos, 30 Tage Archiv |
| `premium` | Premium | 149 € | Unbegrenzte Fotos, 90 Tage, Live-Wall, ZIP-Download |
| `professional` | Professional | 299 € | Alles aus Premium + Face Search, Co-Hosts, Gästeliste |

### Add-on Pakete (Typ: ADDON)

| SKU | Name | Preis | Was es freischaltet |
|-----|------|-------|-------------------|
| `addon-mosaic-digital` | Mosaic Wall | 199 € | Digitale Foto-Mosaik-Wand (Display/Beamer) + HD-Export |
| `addon-mosaic-print` | Mosaic Wall Print + Digital | 599 € | Alles aus Digital + Print-Station + Sticker-Druck |

### Wichtig bei der Produkt-Einrichtung

- **SKU muss exakt übereinstimmen** mit dem Wert in der App-Datenbank (`PackageDefinition.sku`)
- Produkte können als **Einfaches Produkt** oder **Variables Produkt** angelegt werden
- Addons sollten als separate Produkte angelegt werden (nicht als Variation des Base-Pakets)
- Kunden können Base + Addon(s) im selben Warenkorb kaufen

---

## 2. Webhook einrichten

### In WooCommerce → Einstellungen → Erweitert → Webhooks

| Feld | Wert |
|------|------|
| **Name** | `gästefotos App — Order Paid` |
| **Status** | Aktiv |
| **Thema** | `Bestellung aktualisiert` (order.updated) |
| **Auslieferungs-URL** | `https://api.xn--gstefotos-v2a.com/api/woo-webhooks/order-paid` |
| **Geheimnis** | Muss mit `WOOCOMMERCE_WEBHOOK_SECRET` in der App `.env` übereinstimmen |
| **API-Version** | WP REST API v3 |

### Signatur-Verifikation

Der Webhook wird mit HMAC-SHA256 signiert. Die App verifiziert die Signatur über den `x-wc-webhook-signature` Header. **Ohne gültiges Secret werden alle Webhooks abgelehnt (403).**

---

## 3. eventCode — Bestehendes Event upgraden

### Was ist der eventCode?

Jedes Event hat einen eindeutigen `eventCode` (z.B. `aB3x-k9Lm_pQ`). Wenn ein Kunde ein **bestehendes Event upgraden** oder ein **Addon hinzufügen** will, muss dieser Code in der WooCommerce-Bestellung mitgeliefert werden.

### Wie kommt der eventCode in die Bestellung?

**Option A: Aus der App heraus bestellen (empfohlen)**
1. Kunde klickt in der App auf "Upgrade" oder "Addon buchen"
2. App leitet zum WooCommerce-Shop weiter mit URL-Parameter: `?eventCode=aB3x-k9Lm_pQ`
3. WooCommerce speichert den eventCode als Bestell-Meta via Custom Field / Hidden Field Plugin
4. Webhook liefert den eventCode automatisch mit

**Option B: Manuell im Checkout**
1. Ein Custom Field `eventCode` im WooCommerce-Checkout anzeigen
2. Kunde gibt den Code aus seinen Event-Einstellungen ein
3. Der Code wird als `meta_data` in der Bestellung gespeichert

### Verhalten je nach Szenario

| Warenkorb | eventCode | Ergebnis |
|-----------|-----------|----------|
| Base-Paket | ❌ Kein Code | Neues Event wird erstellt |
| Base-Paket | ✅ Vorhanden | Bestehendes Event wird upgegraded (altes Entitlement → REPLACED) |
| Base + Addon | ❌ Kein Code | Neues Event + Addon wird direkt angehängt |
| Base + Addon | ✅ Vorhanden | Bestehendes Event upgraden + Addon anhängen |
| Nur Addon | ✅ Vorhanden | Addon wird an bestehendes Event angehängt |
| Nur Addon | ❌ Kein Code | ⚠️ Wird ignoriert (kein Event zum Anhängen) |

---

## 4. Feature-Merge-Logik

Features werden mit **OR-Logik** zusammengeführt:

```
Base-Paket "Starter":     mosaicWall=❌, videoUpload=✅
Addon "Mosaic Wall":      mosaicWall=✅, mosaicExport=✅

→ Ergebnis für das Event:  mosaicWall=✅, videoUpload=✅, mosaicExport=✅
```

- Wenn **irgendeins** der gebuchten Pakete/Addons ein Feature aktiviert, ist es aktiv
- Limits werden mit MAX zusammengeführt (der höhere Wert gewinnt)
- `null` bei Limits = unbegrenzt (gewinnt immer)

---

## 5. Mosaic-Paket-Logik: Digital vs Print

### Warum kein separates "Hybrid"-Paket?

**Print inkludiert immer Digital.** Ein Print-Board kann auch als digitales Display verwendet werden. Deshalb:

| Addon | Digital Display | Print-Station | Sticker-Druck | HD-Export |
|-------|:-:|:-:|:-:|:-:|
| **Mosaic Wall** (199€) | ✅ | ❌ | ❌ | ✅ |
| **Mosaic Wall Print + Digital** (599€) | ✅ | ✅ | ✅ | ✅ |

- Wer nur Digital braucht → kauft "Mosaic Wall"
- Wer Print braucht → kauft "Print + Digital" (beinhaltet alles)
- **Kein Hybrid nötig**, weil Print = Print + Digital

### Feature-Flags

| Feature-Flag | Mosaic Wall | Mosaic Wall Print + Digital |
|---|:-:|:-:|
| `allowMosaicWall` | ✅ | ✅ |
| `allowMosaicPrint` | ❌ | ✅ |
| `allowMosaicExport` | ✅ | ✅ |

---

## 6. Admin-Funktionen (dash.gästefotos.com)

### Pakete verwalten (`/manage/packages`)
- Alle Pakete (BASE + ADDON) mit Feature-Toggles
- SKU, Preis, Limits, Feature-Flags bearbeiten
- **SKUs müssen mit WooCommerce-Produkten übereinstimmen!**

### Event-Details (`/manage/events/[id]`)
- **Paket wechseln**: Base-Paket direkt ändern (umgeht WooCommerce)
- **Addons verwalten**: Addons per Klick hinzufügen/entfernen (für Testing & Support)
- Änderungen gelten sofort — kein Neustart nötig

### Webhook-Logs (`/manage/woo-webhooks` oder System-Logs)
- Jeder Webhook wird geloggt (Status, SKU, eventCode, Fehlergrund)
- Bei Problemen hier prüfen: `IGNORED`, `FAILED`, `PROCESSED`

---

## 7. Troubleshooting

| Problem | Ursache | Lösung |
|---------|---------|--------|
| Webhook kommt nicht an | URL falsch oder SSL-Problem | URL prüfen, muss HTTPS sein |
| `403 Forbidden` | Signatur ungültig | `WOOCOMMERCE_WEBHOOK_SECRET` in .env prüfen |
| `IGNORED: unknown_package_sku` | SKU im Shop stimmt nicht mit DB überein | SKU in WooCommerce und App abgleichen |
| `IGNORED: missing_customer_mapping` | Kunde hat keinen WP-Account oder Gast-Checkout | Kunde muss eingeloggt sein ODER billing.email muss matchen |
| `IGNORED: addon_only_no_event_code` | Nur Addon im Warenkorb, aber kein eventCode | eventCode im Checkout-Flow ergänzen |
| Addon-Features nicht aktiv | Addon-Entitlement hat falschen `source` | `source` muss mit `addon` beginnen |

---

## 8. Empfohlene WooCommerce-Plugins

| Plugin | Zweck |
|--------|-------|
| **WooCommerce Checkout Field Editor** | eventCode als Custom Field im Checkout |
| **WooCommerce URL Coupons** oder Custom-Link-Plugin | Upgrade-Links aus der App mit eventCode |
| **WooCommerce Subscriptions** (optional) | Für wiederkehrende Pakete (monatlich/jährlich) |

---

## 9. Checkliste für Go-Live

- [ ] Alle Produkte mit korrekten SKUs in WooCommerce angelegt
- [ ] Webhook eingerichtet und getestet (Testbestellung)
- [ ] `WOOCOMMERCE_WEBHOOK_SECRET` in App `.env` gesetzt
- [ ] `PackageDefinition` Einträge in der App-DB mit passenden SKUs
- [ ] eventCode-Flow im Checkout implementiert (Custom Field oder URL-Parameter)
- [ ] Testbestellung: Base + Addon → Event wird erstellt, Features aktiv
- [ ] Testbestellung: Nur Addon mit eventCode → Features am Event aktiv
- [ ] Admin-Dashboard: Manuelles Addon-Toggle funktioniert
