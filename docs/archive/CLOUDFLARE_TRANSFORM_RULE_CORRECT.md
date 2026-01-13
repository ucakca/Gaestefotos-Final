# Cloudflare Transform Rule - Korrekte Konfiguration

## Problem im Screenshot
Im "Wert" Feld steht: `hhttp.request.uri.path matches "/ws*"` (falsch - doppeltes "h")

## Korrekte Konfiguration

### Schritt 1: Regelname
- **Regelname:** `Socket.IO /ws Passthrough` ✅ (korrekt)

### Schritt 2: Wenn eingehende Anforderungen übereinstimmen mit...
- **Wähle:** "Benutzerdefinierter Filterausdruck" ✅ (korrekt ausgewählt)

### Schritt 3: Bei Übereinstimmung von eingehenden Anfragen...

**Option A: Mit Platzhalter (einfacher)**
1. **Feld:** Wähle "URI Path" oder "Vollständige URI"
2. **Operator:** Wähle "matches" oder "contains"
3. **Wert:** `/ws*` (ohne Anführungszeichen, ohne `http.request.uri.path`)

**Option B: Mit Filterausdruck (empfohlen)**
1. Klicke auf "Ausdruck bearbeiten" (rechts neben "Ausdrucksvorschau")
2. Gib ein: `http.request.uri.path matches "/ws*"`
3. (Ohne das doppelte "h" am Anfang!)

### Schritt 4: Dann... Umschreibungsparameter festlegen

**Pfad (Path):**
- **Wähle:** "Beibehalten" (Keep) ✅
  - Das behält den ursprünglichen Pfad `/ws` bei

**Abfrage (Query):**
- **Wähle:** "Beibehalten" (Keep) ✅
  - Das behält Query-Parameter wie `?EIO=4&transport=polling` bei

### Schritt 5: Speichern
- Klicke auf "Bereitstellen" (Deploy)

## Korrekte Ausdrucksvorschau sollte sein:
```
http.request.uri.path matches "/ws*"
```

**NICHT:**
```
(http.request.full_uri eq "hhttp.request.uri.path matches \"/ws*\"")
```

## Nach dem Speichern
1. Warte 1-2 Minuten auf Propagierung
2. Teste: `./test-socketio-ws.sh`

