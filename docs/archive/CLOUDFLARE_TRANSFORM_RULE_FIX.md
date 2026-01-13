# Cloudflare Transform Rule - Fehler beheben

## Fehlermeldung
"Eine Regel zum erneuten Schreiben kann nicht gleichzeitig den Pfad und die Anfrage beibehalten."

## Lösung

Bei URL Rewrite Rules muss man **mindestens einen Wert umschreiben**. Wir können nicht beide auf "Beibehalten" setzen.

### Korrekte Konfiguration:

**Pfad (Path):**
- **Wähle:** "Umschreiben in..."
- **Dropdown:** Wähle "Original URL" (nicht "Static")
- **Feld:** Lass es leer oder setze auf "Original URL"

**Abfrage (Query):**
- **Wähle:** "Beibehalten" (Keep) ✅

ODER

**Pfad (Path):**
- **Wähle:** "Beibehalten" (Keep) ✅

**Abfrage (Query):**
- **Wähle:** "Umschreiben in..."
- **Feld:** Lass es leer oder setze auf "Original URL"

## Empfehlung

**Pfad auf "Original URL" setzen:**
1. **Pfad:** "Umschreiben in..." → "Original URL"
2. **Abfrage:** "Beibehalten" ✅

Das sollte den Fehler beheben und die Anfrage trotzdem korrekt durchleiten.

