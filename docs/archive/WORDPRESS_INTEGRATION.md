# WordPress Integration - Multi-Tenant App-Zugriff

## Übersicht

Nach erfolgreichem Login auf `gästefotos.com` (WordPress) können Kunden direkt zu ihrer eigenen App-Oberfläche (`app.gästefotos.com`) weitergeleitet werden. Jeder Kunde sieht nur seine eigenen Events und Daten.

## Backend API

### WordPress SSO Endpoint

**POST** `/api/auth/wordpress-sso`

Generiert einen JWT-Token für App-Zugriff nach WordPress-Login.

#### Request Body (Option 1: Email/Passwort)
```json
{
  "email": "kunde@example.com",
  "password": "passwort"
}
```

#### Request Body (Option 2: WordPress User ID)
```json
{
  "wpUserId": 123
}
```

#### Response
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "kunde@example.com",
    "name": "Kundenname",
    "role": "ADMIN"
  },
  "eventsCount": 5,
  "redirectUrl": "https://app.gästefotos.com/dashboard?token=..."
}
```

## WordPress Integration

### Option 1: Button/Shortcode in WordPress

Erstelle einen Shortcode oder Button, der nach erfolgreichem WordPress-Login angezeigt wird:

```php
<?php
// In functions.php oder als Plugin

function gaestefotos_app_button() {
    if (!is_user_logged_in()) {
        return '<p>Bitte melde dich an, um auf die App zuzugreifen.</p>';
    }
    
    $current_user = wp_get_current_user();
    $app_url = 'https://app.gästefotos.com';
    $api_url = 'https://api.gästefotos.com/api/auth/wordpress-sso';
    
    // JavaScript für SSO
    $button_html = '
    <div id="gaestefotos-app-button">
        <button id="open-app-btn" class="button button-primary" style="padding: 12px 24px; font-size: 16px;">
            📱 Zur App öffnen
        </button>
    </div>
    
    <script>
    document.getElementById("open-app-btn").addEventListener("click", async function() {
        const btn = this;
        btn.disabled = true;
        btn.textContent = "Lade...";
        
        try {
            // SSO Request an Backend
            const response = await fetch("' . $api_url . '", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    wpUserId: ' . $current_user->ID . '
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.redirectUrl) {
                // Weiterleitung zur App mit Token
                window.location.href = data.redirectUrl;
            } else {
                alert("Fehler beim Öffnen der App. Bitte versuche es erneut.");
                btn.disabled = false;
                btn.textContent = "📱 Zur App öffnen";
            }
        } catch (error) {
            console.error("SSO Error:", error);
            alert("Fehler beim Öffnen der App. Bitte versuche es erneut.");
            btn.disabled = false;
            btn.textContent = "📱 Zur App öffnen";
        }
    });
    </script>
    ';
    
    return $button_html;
}
add_shortcode('gaestefotos_app', 'gaestefotos_app_button');
```

**Verwendung im WordPress-Editor:**
```
[gaestefotos_app]
```

### Option 2: Direkte Weiterleitung nach Login

Automatische Weiterleitung nach erfolgreichem WordPress-Login:

```php
<?php
// In functions.php oder als Plugin

function gaestefotos_redirect_after_login($redirect_to, $request, $user) {
    if (!is_wp_error($user) && isset($user->ID)) {
        // SSO Request
        $api_url = 'https://api.gästefotos.com/api/auth/wordpress-sso';
        $response = wp_remote_post($api_url, [
            'body' => json_encode([
                'wpUserId' => $user->ID
            ]),
            'headers' => [
                'Content-Type' => 'application/json'
            ],
            'timeout' => 10
        ]);
        
        if (!is_wp_error($response)) {
            $body = json_decode(wp_remote_retrieve_body($response), true);
            if (isset($body['redirectUrl'])) {
                return $body['redirectUrl'];
            }
        }
    }
    
    return $redirect_to;
}
add_filter('login_redirect', 'gaestefotos_redirect_after_login', 10, 3);
```

### Option 3: Widget/Block

Erstelle ein WordPress-Widget oder Gutenberg-Block, das den App-Button anzeigt.

## Frontend (App)

Die App (`app.gästefotos.com`) akzeptiert automatisch Token aus URL-Parametern:

```
https://app.gästefotos.com/dashboard?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Das Dashboard:
1. Liest den Token aus der URL
2. Speichert ihn im localStorage
3. Lädt die Benutzerdaten
4. Zeigt nur die Events des eingeloggten Benutzers an

## Multi-Tenant Sicherheit

- **Jeder User sieht nur seine eigenen Events**: Die API filtert Events nach `hostId`
- **JWT-Token**: Sichere Authentifizierung mit Ablaufzeit
- **Automatische User-Synchronisation**: WordPress-User werden automatisch in PostgreSQL erstellt

## Beispiel-Workflow

1. Kunde meldet sich auf `gästefotos.com` an (WordPress)
2. Kunde klickt auf "Zur App öffnen" Button
3. WordPress sendet SSO-Request an Backend mit User-ID
4. Backend erstellt/aktualisiert User in PostgreSQL
5. Backend generiert JWT-Token
6. Weiterleitung zu `app.gästefotos.com/dashboard?token=...`
7. App lädt Token, authentifiziert User
8. Dashboard zeigt nur Events des Kunden an

## Konfiguration

### Backend `.env`
```env
APP_URL=https://app.gästefotos.com
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

### WordPress
- API-URL: `https://api.gästefotos.com/api/auth/wordpress-sso`
- App-URL: `https://app.gästefotos.com`

## Troubleshooting

### Token wird nicht akzeptiert
- Prüfe, ob Token im localStorage gespeichert wurde
- Prüfe Browser-Konsole auf Fehler
- Prüfe Backend-Logs

### User sieht keine Events
- Prüfe, ob User in PostgreSQL existiert
- Prüfe, ob Events mit korrektem `hostId` erstellt wurden
- Prüfe Backend-Logs für API-Aufrufe

### SSO schlägt fehl
- Prüfe WordPress-Datenbank-Verbindung
- Prüfe, ob WordPress-User existiert
- Prüfe Backend-Logs für Fehlerdetails









