# Druckservice Integration - Technischer Plan

**Datum:** 20.01.2026  
**Status:** Konzept / Planung  
**Aufwand:** ~4-6h (reduziert durch WordPress/WooCommerce Nutzung)

---

## 🎯 Anforderungen

### User-Anforderung:
> "Druckservice soll zur Gästeseite umleiten und ausgewähltes Druckservice in den Einkaufswagen legen, so können wir das Zahlungssystem von WordPress nutzen. Dazu benötigen wir Einstellungen im Dashboard."

### Ziele:
1. **Integration mit bestehendem WordPress/WooCommerce**
2. **Redirect zur Hauptseite** mit QR-Design-Daten
3. **Automatisches Hinzufügen zum Warenkorb**
4. **Admin-Dashboard** für Druckservice-Konfiguration

---

## 🏗️ Technische Architektur

### 1. Flow-Übersicht

```
[QR-Styler] → [Druckservice Button] → [Save Design to DB] 
    ↓
[Generate Checkout URL with params] 
    ↓
[Redirect to WordPress] → [WordPress/WooCommerce Cart]
    ↓
[Add Product to Cart with Custom Meta]
    ↓
[Checkout Process] (existing WordPress)
```

### 2. Komponenten

#### A) Frontend (Next.js App)
**Datei:** `packages/frontend/src/app/events/[id]/qr-styler/page.tsx`

**Neue UI:**
```tsx
<Button 
  onClick={handleOrderPrint}
  variant="primary"
>
  Jetzt drucken lassen
</Button>
```

**Funktionen:**
```typescript
async function handleOrderPrint() {
  // 1. Design speichern
  const designId = await saveCurrentDesign();
  
  // 2. Checkout URL generieren
  const checkoutUrl = await api.post(
    `/events/${eventId}/qr/print-service/checkout-url`,
    { designId, format, quantity: 1 }
  );
  
  // 3. Redirect zu WordPress
  window.location.href = checkoutUrl;
}
```

#### B) Backend API Routes
**Datei:** `packages/backend/src/routes/events.ts`

**Neue Endpoints:**

```typescript
// POST /api/events/:id/qr/print-service/checkout-url
// Generiert WordPress Checkout URL mit QR-Design Daten
router.post('/:id/qr/print-service/checkout-url', 
  authMiddleware, 
  async (req: AuthRequest, res: Response) => {
    const { designId, format, quantity } = req.body;
    
    // 1. Design aus DB laden
    const design = await prisma.qrDesign.findUnique({
      where: { id: designId }
    });
    
    // 2. WooCommerce Product ID aus Settings
    const settings = await prisma.printServiceSettings.findFirst();
    const productId = format === 'A5' 
      ? settings.productIdA5 
      : settings.productIdA6;
    
    // 3. Checkout URL bauen
    const baseUrl = process.env.WORDPRESS_URL;
    const checkoutUrl = new URL('/checkout', baseUrl);
    
    // WooCommerce Add-to-Cart Parameter
    checkoutUrl.searchParams.set('add-to-cart', productId);
    checkoutUrl.searchParams.set('quantity', quantity);
    
    // Custom Meta (für Design-Daten)
    checkoutUrl.searchParams.set('qr_design_id', designId);
    checkoutUrl.searchParams.set('qr_format', format);
    checkoutUrl.searchParams.set('qr_event_id', eventId);
    
    res.json({ checkoutUrl: checkoutUrl.toString() });
  }
);
```

#### C) Database Schema
**Datei:** `packages/backend/prisma/schema.prisma`

**Neue Tabelle:**
```prisma
model PrintServiceSettings {
  id              String   @id @default(cuid())
  enabled         Boolean  @default(false)
  
  // WooCommerce Product IDs
  productIdA6     String?  // WooCommerce Product ID für A6
  productIdA5     String?  // WooCommerce Product ID für A5
  
  // Preise (nur zur Anzeige, echte Preise in WooCommerce)
  priceA6         Float?   
  priceA5         Float?
  
  // URLs
  wordpressUrl    String?  // z.B. "https://gästefotos.com"
  
  // Design-Upload zu WordPress
  uploadEndpoint  String?  // Optional: WordPress REST API Endpoint
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("print_service_settings")
}

// QRDesign erweitern (falls noch nicht vorhanden)
model qrDesign {
  // ... existing fields ...
  
  // Für Druckservice
  printOrderId    String?  // Optional: WooCommerce Order ID nach Kauf
  printedAt       DateTime?
  
  @@map("qr_designs")
}
```

#### D) Admin Dashboard
**Neue Seite:** `packages/frontend/src/app/(admin)/dashboard/print-service/page.tsx`

**UI Komponenten:**
```tsx
<AdminPageLayout title="Druckservice Einstellungen">
  <Card>
    <CardHeader>
      <CardTitle>WooCommerce Integration</CardTitle>
    </CardHeader>
    <CardContent>
      <Form>
        {/* Aktivierung */}
        <Switch 
          label="Druckservice aktivieren"
          checked={settings.enabled}
          onChange={...}
        />
        
        {/* WordPress URL */}
        <Input 
          label="WordPress URL"
          placeholder="https://gästefotos.com"
          value={settings.wordpressUrl}
        />
        
        {/* Product IDs */}
        <Input 
          label="WooCommerce Product ID (A6)"
          placeholder="123"
          value={settings.productIdA6}
        />
        
        <Input 
          label="WooCommerce Product ID (A5)"
          placeholder="124"
          value={settings.productIdA5}
        />
        
        {/* Preise (nur Anzeige) */}
        <Input 
          label="Preis A6 (nur Anzeige)"
          type="number"
          value={settings.priceA6}
        />
        
        <Input 
          label="Preis A5 (nur Anzeige)"
          type="number"
          value={settings.priceA5}
        />
        
        <Button type="submit">Speichern</Button>
      </Form>
    </CardContent>
  </Card>
  
  <Card>
    <CardHeader>
      <CardTitle>Test Integration</CardTitle>
    </CardHeader>
    <CardContent>
      <Button onClick={testCheckoutUrl}>
        Test Checkout URL generieren
      </Button>
    </CardContent>
  </Card>
</AdminPageLayout>
```

---

## 🔗 WordPress/WooCommerce Integration

### 1. WooCommerce Setup (auf Hauptseite)

**Produkte anlegen:**
```
Produkt 1: "QR-Code Aufsteller A6"
  - SKU: qr-aufsteller-a6
  - Preis: z.B. 12.90 €
  - Kategorie: Druckservice
  
Produkt 2: "QR-Code Aufsteller A5"
  - SKU: qr-aufsteller-a5
  - Preis: z.B. 19.90 €
  - Kategorie: Druckservice
```

**Custom Product Meta (WordPress Plugin):**
```php
// WordPress Plugin: gaestefotos-print-integration
add_action('woocommerce_add_to_cart', 'gf_add_qr_design_meta', 10, 6);

function gf_add_qr_design_meta($cart_item_key, $product_id, $quantity, $variation_id, $variation, $cart_item_data) {
  // QR Design Daten aus URL params
  $qr_design_id = $_GET['qr_design_id'] ?? null;
  $qr_format = $_GET['qr_format'] ?? null;
  $qr_event_id = $_GET['qr_event_id'] ?? null;
  
  if ($qr_design_id) {
    // Meta speichern
    WC()->cart->cart_contents[$cart_item_key]['qr_design_id'] = $qr_design_id;
    WC()->cart->cart_contents[$cart_item_key]['qr_format'] = $qr_format;
    WC()->cart->cart_contents[$cart_item_key]['qr_event_id'] = $qr_event_id;
  }
}

// Design-Daten in Order Meta speichern
add_action('woocommerce_add_order_item_meta', 'gf_save_qr_design_to_order', 10, 2);

function gf_save_qr_design_to_order($item_id, $values) {
  if (isset($values['qr_design_id'])) {
    wc_add_order_item_meta($item_id, '_qr_design_id', $values['qr_design_id']);
    wc_add_order_item_meta($item_id, '_qr_format', $values['qr_format']);
    wc_add_order_item_meta($item_id, '_qr_event_id', $values['qr_event_id']);
    
    // Design-Datei von App-Server holen und zu Order anhängen
    $design_url = get_qr_design_pdf($values['qr_design_id']);
    wc_add_order_item_meta($item_id, '_qr_design_pdf_url', $design_url);
  }
}

// Helper: Design PDF von App-Server holen
function get_qr_design_pdf($design_id) {
  $app_url = get_option('gf_app_url'); // z.B. https://app.gästefotos.com
  $api_key = get_option('gf_api_key');
  
  // API Call zu App-Backend
  $response = wp_remote_get(
    "{$app_url}/api/designs/{$design_id}/pdf",
    [
      'headers' => [
        'Authorization' => "Bearer {$api_key}"
      ]
    ]
  );
  
  return json_decode($response['body'])->pdfUrl;
}
```

### 2. Checkout URL Beispiel

**Generierte URL:**
```
https://gästefotos.com/checkout/?add-to-cart=123&quantity=1&qr_design_id=clx123&qr_format=A6&qr_event_id=evt123
```

**Flow:**
1. User wird zu WordPress redirected
2. WooCommerce fügt Produkt automatisch zum Warenkorb hinzu
3. Design-Meta wird gespeichert
4. User geht durch normalen Checkout
5. Nach Bezahlung: Order enthält Design-Daten für Druckerei

---

## 📝 Implementierungs-Schritte

### Phase 1: Backend Foundation (1-2h)
- [ ] Prisma Schema erweitern (`PrintServiceSettings`)
- [ ] Migration erstellen und ausführen
- [ ] Backend API Route `/print-service/checkout-url`
- [ ] ENV Variable `WORDPRESS_URL` hinzufügen

### Phase 2: Admin Dashboard (1-2h)
- [ ] Admin Page `/dashboard/print-service`
- [ ] Settings Form (URL, Product IDs, Preise)
- [ ] API Routes für Settings (GET/POST)
- [ ] Test-Funktion für Checkout URL

### Phase 3: Frontend Integration (1h)
- [ ] "Jetzt drucken lassen" Button im QR-Styler
- [ ] `handleOrderPrint()` Funktion
- [ ] Loading States & Error Handling
- [ ] Preview: Preis-Anzeige (aus Settings)

### Phase 4: WordPress Plugin (1-2h)
- [ ] WordPress Plugin Boilerplate
- [ ] Add-to-Cart Hook für Custom Meta
- [ ] Order Meta Speicherung
- [ ] PDF Download von App-Server
- [ ] Admin UI für API Key Settings

### Phase 5: Testing & Deployment (1h)
- [ ] End-to-End Test (App → WordPress → Checkout)
- [ ] Error Cases (fehlende Settings, etc.)
- [ ] Dokumentation
- [ ] Deployment

**Gesamt:** ~6-8h

---

## 🔒 Security & Considerations

### 1. API Key für WordPress ↔ App
```typescript
// App generiert API Key für WordPress Plugin
// WordPress ruft damit Design-PDFs ab
const API_KEY = process.env.WORDPRESS_API_KEY;

// In Backend Route:
if (req.headers.authorization !== `Bearer ${API_KEY}`) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### 2. Design-Daten Privacy
- QR Design IDs sind nicht-errratbar (cuid)
- Nur authenticated requests können Designs abrufen
- WordPress speichert nur ID, nicht komplettes Design

### 3. Pricing
- **Single Source of Truth:** WooCommerce Preise
- App zeigt nur Preview-Preise aus Settings
- Echte Preise nur in WooCommerce

---

## 💡 Alternative: Simplere Version (4h)

Falls WordPress Plugin zu komplex:

**Vereinfachter Flow:**
1. App generiert PDF
2. PDF wird auf App-Server gespeichert
3. Checkout URL zeigt auf WooCommerce
4. User kauft "Standard" Druckservice Produkt
5. **Manuell:** User schickt PDF-Link per Email nach Kauf

**Vorteile:**
- Keine WordPress Plugin Entwicklung
- Einfacher zu maintainen

**Nachteile:**
- Manueller Schritt für User
- Keine automatische Order-Zuordnung

---

## 🎯 Empfehlung

**Implementiere Vollversion mit WordPress Plugin:**

**Vorteile:**
- Nahtlose User Experience
- Automatische Design-Zuordnung zu Orders
- Professioneller Workflow für Druckerei
- Nutzt bestehendes Payment-System

**Aufwand ist gerechtfertigt:**
- Einmaliger Setup (6-8h)
- Danach wartungsfrei
- Ermöglicht Monetarisierung

**Nächster Schritt:**
1. Admin Dashboard Settings implementieren (Quick Win)
2. Checkout URL Generation testen
3. WordPress Plugin entwickeln
4. End-to-End Integration testen

---

## 📋 ENV Variables benötigt

```bash
# App Backend (.env)
WORDPRESS_URL=https://gästefotos.com
WORDPRESS_API_KEY=<generierter-key>

# WordPress Plugin Settings (Admin UI)
gf_app_url=https://app.gästefotos.com
gf_api_key=<gleicher-key>
```

---

**Status:** Bereit zur Implementierung  
**Blocker:** Keine (alle Dependencies vorhanden)  
**Risiko:** Niedrig (nutzt Standard WooCommerce Features)
