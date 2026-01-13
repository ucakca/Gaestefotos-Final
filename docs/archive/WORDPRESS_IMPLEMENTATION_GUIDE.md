# 📘 WordPress Integration - Implementierungsanleitung

## Übersicht

Diese Anleitung erklärt, wie die Gästefotos-App-Integration in WordPress implementiert wird. Es gibt drei Optionen:

1. **WordPress-Plugin** (empfohlen)
2. **functions.php** (schnell, aber weniger flexibel)
3. **WordPress-Shortcode** (für spezifische Seiten)

---

## 🔧 Voraussetzungen

- WordPress-Installation läuft
- Backend-API ist erreichbar
- WordPress-Benutzer sollen auf die App zugreifen können

### Benötigte URLs

```php
// Backend API URL (wo die App läuft)
$api_url = 'https://api.gästefotos.com/api/auth/wordpress-sso';
// oder: 'http://65.109.71.182:8001/api/auth/wordpress-sso' (falls direkt)

// Frontend App URL (wohin umgeleitet wird)
$app_url = 'https://app.gästefotos.com';
// oder: 'https://app.xn--gstefotos-v2a.com'
```

---

## 📦 Option 1: WordPress-Plugin (Empfohlen)

### Schritt 1: Plugin-Verzeichnis erstellen

1. Gehe in WordPress zu: `/wp-content/plugins/`
2. Erstelle einen neuen Ordner: `gaestefotos-app-integration`

### Schritt 2: Plugin-Hauptdatei erstellen

Erstelle die Datei: `/wp-content/plugins/gaestefotos-app-integration/gaestefotos-app-integration.php`

```php
<?php
/**
 * Plugin Name: Gästefotos App Integration
 * Plugin URI: https://gästefotos.com
 * Description: Integration für SSO-Zugriff auf die Gästefotos-App nach WordPress-Login
 * Version: 1.0.0
 * Author: Gästefotos Team
 * License: GPL v2 or later
 */

// Sicherheit: Verhindere direkten Zugriff
if (!defined('ABSPATH')) {
    exit;
}

// Plugin-Konfiguration
define('GAESTEFOTOS_API_URL', 'https://api.gästefotos.com/api/auth/wordpress-sso');
define('GAESTEFOTOS_APP_URL', 'https://app.gästefotos.com');

/**
 * Shortcode: Zeigt Button zum Öffnen der App
 * 
 * Verwendung: [gaestefotos_app] oder [gaestefotos_app button_text="Zur App öffnen"]
 */
function gaestefotos_app_button_shortcode($atts) {
    // Prüfe ob User eingeloggt ist
    if (!is_user_logged_in()) {
        return '<p style="padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
                    Bitte <a href="' . wp_login_url(get_permalink()) . '">melde dich an</a>, um auf die App zuzugreifen.
                </p>';
    }
    
    // Shortcode-Attribute
    $atts = shortcode_atts(array(
        'button_text' => '📱 Zur App öffnen',
        'button_class' => 'button button-primary',
        'button_style' => 'padding: 12px 24px; font-size: 16px;'
    ), $atts);
    
    $current_user = wp_get_current_user();
    $wp_user_id = $current_user->ID;
    $api_url = GAESTEFOTOS_API_URL;
    $app_url = GAESTEFOTOS_APP_URL;
    
    // Button HTML mit JavaScript
    $button_id = 'gaestefotos-app-btn-' . uniqid();
    
    ob_start();
    ?>
    <div id="gaestefotos-app-container" style="margin: 20px 0;">
        <button 
            id="<?php echo esc_attr($button_id); ?>" 
            class="<?php echo esc_attr($atts['button_class']); ?>"
            style="<?php echo esc_attr($atts['button_style']); ?>"
        >
            <?php echo esc_html($atts['button_text']); ?>
        </button>
        <div id="<?php echo esc_attr($button_id); ?>-message" style="margin-top: 10px;"></div>
    </div>
    
    <script>
    (function() {
        const btn = document.getElementById('<?php echo esc_js($button_id); ?>');
        const messageDiv = document.getElementById('<?php echo esc_js($button_id); ?>-message');
        const originalText = btn.textContent;
        
        btn.addEventListener('click', async function() {
            btn.disabled = true;
            btn.textContent = 'Lade...';
            messageDiv.innerHTML = '';
            
            try {
                // SSO Request an Backend API
                const response = await fetch('<?php echo esc_url_raw($api_url); ?>', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        wpUserId: <?php echo intval($wp_user_id); ?>
                    })
                });
                
                const data = await response.json();
                
                if (data.success && data.redirectUrl) {
                    // Weiterleitung zur App mit Token
                    window.location.href = data.redirectUrl;
                } else if (data.token) {
                    // Fallback: Direkte Weiterleitung mit Token
                    window.location.href = '<?php echo esc_url($app_url); ?>/dashboard?token=' + encodeURIComponent(data.token);
                } else {
                    throw new Error(data.error || 'Unbekannter Fehler');
                }
            } catch (error) {
                console.error('SSO Error:', error);
                messageDiv.innerHTML = '<p style="color: #d32f2f; padding: 10px; background: #ffebee; border-radius: 4px;">Fehler beim Öffnen der App: ' + error.message + '</p>';
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    })();
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('gaestefotos_app', 'gaestefotos_app_button_shortcode');

/**
 * Automatische Weiterleitung nach WordPress-Login (optional)
 * 
 * Unkommentiere diese Funktion, wenn nach jedem Login automatisch
 * zur App weitergeleitet werden soll.
 */
/*
function gaestefotos_redirect_after_login($redirect_to, $request, $user) {
    // Nur weiterleiten, wenn User erfolgreich eingeloggt ist
    if (!is_wp_error($user) && isset($user->ID)) {
        // Prüfe ob "redirect_to_app" Parameter vorhanden ist
        if (isset($_GET['redirect_to_app']) || isset($_POST['redirect_to_app'])) {
            // SSO Request
            $api_url = GAESTEFOTOS_API_URL;
            $response = wp_remote_post($api_url, array(
                'body' => json_encode(array(
                    'wpUserId' => $user->ID
                )),
                'headers' => array(
                    'Content-Type' => 'application/json'
                ),
                'timeout' => 10
            ));
            
            if (!is_wp_error($response)) {
                $response_code = wp_remote_retrieve_response_code($response);
                if ($response_code === 200) {
                    $body = json_decode(wp_remote_retrieve_body($response), true);
                    if (isset($body['redirectUrl'])) {
                        return $body['redirectUrl'];
                    } elseif (isset($body['token'])) {
                        return GAESTEFOTOS_APP_URL . '/dashboard?token=' . urlencode($body['token']);
                    }
                }
            }
        }
    }
    
    return $redirect_to;
}
add_filter('login_redirect', 'gaestefotos_redirect_after_login', 10, 3);
*/

/**
 * Widget für Sidebar (optional)
 */
class Gaestefotos_App_Widget extends WP_Widget {
    function __construct() {
        parent::__construct(
            'gaestefotos_app_widget',
            __('Gästefotos App', 'gaestefotos'),
            array('description' => __('Button zum Öffnen der Gästefotos-App', 'gaestefotos'))
        );
    }
    
    public function widget($args, $instance) {
        echo $args['before_widget'];
        if (!empty($instance['title'])) {
            echo $args['before_title'] . apply_filters('widget_title', $instance['title']) . $args['after_title'];
        }
        echo do_shortcode('[gaestefotos_app button_text="' . esc_attr($instance['button_text']) . '"]');
        echo $args['after_widget'];
    }
    
    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('Zur App', 'gaestefotos');
        $button_text = !empty($instance['button_text']) ? $instance['button_text'] : '📱 Zur App öffnen';
        ?>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('title')); ?>"><?php _e('Titel:'); ?></label>
            <input class="widefat" id="<?php echo esc_attr($this->get_field_id('title')); ?>" 
                   name="<?php echo esc_attr($this->get_field_name('title')); ?>" 
                   type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('button_text')); ?>"><?php _e('Button-Text:'); ?></label>
            <input class="widefat" id="<?php echo esc_attr($this->get_field_id('button_text')); ?>" 
                   name="<?php echo esc_attr($this->get_field_name('button_text')); ?>" 
                   type="text" value="<?php echo esc_attr($button_text); ?>">
        </p>
        <?php
    }
    
    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? strip_tags($new_instance['title']) : '';
        $instance['button_text'] = (!empty($new_instance['button_text'])) ? strip_tags($new_instance['button_text']) : '📱 Zur App öffnen';
        return $instance;
    }
}

// Widget registrieren
function register_gaestefotos_app_widget() {
    register_widget('Gaestefotos_App_Widget');
}
add_action('widgets_init', 'register_gaestefotos_app_widget');

/**
 * Admin-Menü (optional)
 */
function gaestefotos_app_admin_menu() {
    add_options_page(
        'Gästefotos App Einstellungen',
        'Gästefotos App',
        'manage_options',
        'gaestefotos-app-settings',
        'gaestefotos_app_settings_page'
    );
}
add_action('admin_menu', 'gaestefotos_app_admin_menu');

function gaestefotos_app_settings_page() {
    if (isset($_POST['gaestefotos_app_save'])) {
        update_option('gaestefotos_api_url', sanitize_text_field($_POST['api_url']));
        update_option('gaestefotos_app_url', sanitize_text_field($_POST['app_url']));
        echo '<div class="notice notice-success"><p>Einstellungen gespeichert!</p></div>';
    }
    
    $api_url = get_option('gaestefotos_api_url', GAESTEFOTOS_API_URL);
    $app_url = get_option('gaestefotos_app_url', GAESTEFOTOS_APP_URL);
    ?>
    <div class="wrap">
        <h1>Gästefotos App Einstellungen</h1>
        <form method="post">
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="api_url">API URL</label>
                    </th>
                    <td>
                        <input type="url" id="api_url" name="api_url" 
                               value="<?php echo esc_attr($api_url); ?>" 
                               class="regular-text" required>
                        <p class="description">URL zum Backend SSO-Endpoint</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="app_url">App URL</label>
                    </th>
                    <td>
                        <input type="url" id="app_url" name="app_url" 
                               value="<?php echo esc_attr($app_url); ?>" 
                               class="regular-text" required>
                        <p class="description">URL zur Frontend-App</p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Einstellungen speichern', 'primary', 'gaestefotos_app_save'); ?>
        </form>
        
        <h2>Verwendung</h2>
        <h3>Shortcode</h3>
        <p>Verwende den Shortcode <code>[gaestefotos_app]</code> auf jeder Seite oder in jedem Beitrag.</p>
        <p>Optionale Parameter:</p>
        <ul>
            <li><code>button_text</code> - Text des Buttons (Standard: "📱 Zur App öffnen")</li>
            <li><code>button_class</code> - CSS-Klassen für den Button</li>
            <li><code>button_style</code> - Inline-Styles für den Button</li>
        </ul>
        <p><strong>Beispiel:</strong> <code>[gaestefotos_app button_text="Zur Event-App"]</code></p>
        
        <h3>Widget</h3>
        <p>Gehe zu <strong>Design → Widgets</strong> und füge das "Gästefotos App" Widget zu deiner Sidebar hinzu.</p>
    </div>
    <?php
}

// Aktiviere Plugin-Links
register_activation_hook(__FILE__, function() {
    // Optional: Standardwerte setzen
});
```

### Schritt 3: Plugin aktivieren

1. Gehe in WordPress zu **Plugins → Installierte Plugins**
2. Finde "Gästefotos App Integration"
3. Klicke auf **Aktivieren**

### Schritt 4: Shortcode verwenden

Füge auf jeder Seite oder jedem Beitrag den Shortcode hinzu:

```
[gaestefotos_app]
```

Oder mit angepasstem Text:

```
[gaestefotos_app button_text="Zur Event-App öffnen"]
```

---

## 📝 Option 2: functions.php (Schnell)

Falls du kein Plugin erstellen möchtest, kannst du den Code direkt in die `functions.php` deines Themes einfügen:

**Achtung:** Bei Theme-Updates geht der Code verloren! Plugin ist empfohlen.

```php
// In functions.php deines Themes

// Shortcode für App-Button
function gaestefotos_app_button() {
    if (!is_user_logged_in()) {
        return '<p>Bitte melde dich an, um auf die App zuzugreifen.</p>';
    }
    
    $current_user = wp_get_current_user();
    $api_url = 'https://api.gästefotos.com/api/auth/wordpress-sso';
    $app_url = 'https://app.gästefotos.com';
    
    ob_start();
    ?>
    <button id="open-app-btn" class="button button-primary" style="padding: 12px 24px; font-size: 16px;">
        📱 Zur App öffnen
    </button>
    <script>
    document.getElementById('open-app-btn').addEventListener('click', async function() {
        const btn = this;
        btn.disabled = true;
        btn.textContent = 'Lade...';
        
        try {
            const response = await fetch('<?php echo esc_url_raw($api_url); ?>', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wpUserId: <?php echo intval($current_user->ID); ?> })
            });
            
            const data = await response.json();
            if (data.success && data.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else if (data.token) {
                window.location.href = '<?php echo esc_url($app_url); ?>/dashboard?token=' + encodeURIComponent(data.token);
            }
        } catch (error) {
            alert('Fehler beim Öffnen der App');
            btn.disabled = false;
            btn.textContent = '📱 Zur App öffnen';
        }
    });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('gaestefotos_app', 'gaestefotos_app_button');
```

---

## 🔧 Konfiguration

### API-URL bestimmen

Die API-URL hängt davon ab, wie dein Backend erreichbar ist:

1. **Über Domain:**
   ```
   https://api.gästefotos.com/api/auth/wordpress-sso
   ```

2. **Über IP direkt:**
   ```
   http://65.109.71.182:8001/api/auth/wordpress-sso
   ```

3. **Lokal (für Testing):**
   ```
   http://localhost:8001/api/auth/wordpress-sso
   ```

### App-URL bestimmen

Die App-URL ist die Frontend-URL:

1. **Über Domain:**
   ```
   https://app.gästefotos.com
   https://app.xn--gstefotos-v2a.com
   ```

2. **Lokal (für Testing):**
   ```
   http://localhost:3000
   ```

---

## 🧪 Testing

### 1. Backend testen

Teste den SSO-Endpoint direkt:

```bash
curl -X POST https://api.gästefotos.com/api/auth/wordpress-sso \
  -H "Content-Type: application/json" \
  -d '{"wpUserId": 1}'
```

### 2. WordPress testen

1. Melde dich in WordPress an
2. Gehe auf eine Seite mit `[gaestefotos_app]` Shortcode
3. Klicke auf den Button
4. Du solltest zur App weitergeleitet werden

### 3. Browser-Konsole prüfen

Öffne die Browser-Entwicklertools (F12) und prüfe:
- **Console-Tab:** Keine JavaScript-Fehler?
- **Network-Tab:** Wird der SSO-Request erfolgreich gesendet?
- **Response:** Enthält die Response `token` oder `redirectUrl`?

---

## 🐛 Troubleshooting

### Problem: Button funktioniert nicht

**Lösung:**
- Prüfe Browser-Konsole auf JavaScript-Fehler
- Prüfe ob API-URL erreichbar ist
- Prüfe CORS-Einstellungen im Backend

### Problem: "Ungültige Anmeldedaten"

**Lösung:**
- Prüfe ob WordPress-User existiert
- Prüfe Backend-Logs für Details
- Prüfe WordPress-Datenbank-Verbindung im Backend

### Problem: Weiterleitung funktioniert nicht

**Lösung:**
- Prüfe ob `redirectUrl` in der Response vorhanden ist
- Prüfe ob App-URL korrekt ist
- Prüfe ob Token im localStorage gespeichert wird

---

## 📚 Weiterführende Informationen

- **Backend-API-Dokumentation:** Siehe `WORDPRESS_INTEGRATION.md`
- **SSO-Flow:** Siehe `WORDPRESS_SSO_FIX.md`
- **Debug-Informationen:** Siehe `WORDPRESS_LOGIN_DEBUG.md`

---

## ✅ Checkliste

- [ ] Plugin erstellt oder Code in functions.php eingefügt
- [ ] API-URL korrekt konfiguriert
- [ ] App-URL korrekt konfiguriert
- [ ] Shortcode auf Seite hinzugefügt
- [ ] Als WordPress-User eingeloggt
- [ ] Button getestet
- [ ] Weiterleitung zur App funktioniert
- [ ] Token wird im localStorage gespeichert

---

**Fertig!** 🎉 Die WordPress-Integration sollte jetzt funktionieren.








