# Cloudflare Diagnose Ergebnis

## Gefundene Probleme

### 1. "Always Use HTTPS" ist aktiviert
- **Status:** `on`
- **Problem:** Verursacht 308-Redirects für alle Anfragen, auch für `/ws`
- **Lösung:** Page Rule sollte Priorität haben, aber funktioniert nicht

### 2. SSL Mode
- **Status:** `full` ✅ (korrekt)

### 3. Page Rules
- **Problem:** Account-Token kann keine Page Rules verwalten
- **Benötigt:** Zone-Token mit `Page Rules:Edit` Berechtigung

## Warum die Page Rule nicht funktioniert

"Always Use HTTPS" ist eine globale Einstellung, die **vor** den Page Rules ausgewertet wird. Die Page Rule für `/ws` sollte eigentlich Priorität haben, aber Cloudflare wendet "Always Use HTTPS" trotzdem an.

## Mögliche Lösungen

### Option 1: Transform Rules (empfohlen)
Transform Rules haben höhere Priorität als "Always Use HTTPS":
1. Gehe zu: Rules → Transform Rules → URL Rewrite
2. Erstelle eine Regel:
   - **When:** `http.request.uri.path matches "/ws*"`
   - **Then:** `Set static` → `Original URL`
   - **Status:** Enabled

### Option 2: Cloudflare Workers
Ein Worker kann die Anfrage abfangen und direkt an den Origin weiterleiten, ohne Redirect.

### Option 3: "Always Use HTTPS" temporär deaktivieren
Nicht empfohlen, da Sicherheit wichtig ist.

### Option 4: Socket.IO über anderen Pfad
Wir könnten Socket.IO über einen anderen Pfad routen, der nicht von "Always Use HTTPS" betroffen ist (z.B. über einen Subdomain).

## Nächste Schritte

1. **Versuche Transform Rules** (höchste Priorität)
2. Falls das nicht funktioniert, **kontaktiere Cloudflare Support**
3. Als letzte Option: **"Always Use HTTPS" temporär deaktivieren** und testen

