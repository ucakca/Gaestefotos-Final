# AI Offline-Strategie – gästefotos.com

> Stand: Juli 2025 | Lernendes AI-Cache-System implementiert ✅

---

## 1. Ausgangslage

### Architektur
- **Cloud-Server** (Hetzner, AMD Ryzen 9 5950X, 128GB RAM): Haupt-Backend mit Redis, DB, AI-APIs
- **Event-Terminal (NUC/Mini-PC)**: Booth-Software am Event-Standort, verbindet sich mit Cloud-Backend
- **AI-Provider**: Groq, Grok (xAI), OpenAI – alle Cloud-basiert

### Problem
Events finden oft an Locations mit schlechtem/keinem Internet statt. Text-AI-Features (Vorschläge, Chat) sollten trotzdem funktionieren.

### Lösung: Hybrid-Ansatz
| Szenario | Text-AI | Bild-AI |
|----------|---------|---------|
| **Online (normal)** | Cloud-API → Ergebnis cachen | Cloud-API (Stability, Replicate) |
| **Online (langsam)** | Cache-Hit bevorzugt | Cloud mit Timeout |
| **Offline** | Cache-Hit oder Fallback | ❌ Nicht verfügbar |

---

## 2. Lernendes AI-Cache-System

### Implementierung
**Datei**: `packages/backend/src/services/cache/aiCache.ts`

### Funktionsweise

```
Request → Cache-Lookup (Redis)
            ├── HIT  → Sofortige Antwort (funktioniert offline!)
            └── MISS → AI-API aufrufen
                         ├── Erfolg → Ergebnis cachen (30 Tage TTL) → zurückgeben
                         └── Fehler → Statischer Fallback
```

### Was "lernt" das System?
1. **Jede erfolgreiche AI-Antwort** wird in Redis gespeichert (30 Tage TTL, Chat: 7 Tage)
2. **Hit-Counts** werden pro Eintrag getrackt → beliebte Anfragen bleiben priorisiert
3. **Warm-Up** lädt häufige Kombinationen vorab (Event-Typen × Titel)

### Gecachte Features

| Feature | Cache-Key-Parameter | TTL | Fallback |
|---------|---------------------|-----|----------|
| `suggest-albums` | eventType, eventTitle | 30 Tage | Statische Album-Listen pro Event-Typ |
| `suggest-description` | eventType, eventTitle, eventDate | 30 Tage | Template-basierte Beschreibung |
| `suggest-invitation` | eventType, eventTitle, hostName | 30 Tage | Standard-Einladungstext |
| `suggest-challenges` | eventType | 30 Tage | Statische Challenge-Listen pro Event-Typ |
| `suggest-guestbook` | eventType, eventTitle | 30 Tage | Standard-Willkommensnachricht |
| `suggest-colors` | eventType, keywords, mood | 30 Tage | Statische Farbschemata pro Event-Typ |
| `chat` | Frage-Hash | 7 Tage | FAQ-basierte Antworten |

### API-Übersicht

```typescript
// Cache-Wrapper – wickelt jede AI-Funktion automatisch ein
withAiCache<TParams, TResult>(feature, generateFn, { fallback })

// Manueller Zugriff
aiCacheGet<T>(feature, params)      // Cache lesen
aiCacheSet<T>(feature, params, val) // Cache schreiben
isAiOnline()                        // Connectivity-Check

// Verwaltung
warmUpCache(generateFn, eventTypes) // Cache vorwärmen
getAiCacheStats()                   // Statistiken
clearAiCache()                      // Cache leeren
getAiCacheEntryCount()              // Einträge zählen
```

---

## 3. Cache-Architektur (Redis)

### Key-Schema
```
ai:cache:{feature}:{md5-hash}     → Gecachte Antwort (JSON)
ai:cache:stats:entries:{feature}  → Anzahl gespeicherter Einträge
ai:cache:stats:hits:{feature}     → Anzahl Cache-Hits
```

### Datenstruktur pro Eintrag
```json
{
  "response": "<AI-Antwort>",
  "createdAt": 1720000000000,
  "hitCount": 42,
  "provider": "groq",
  "params": { "eventType": "wedding", "eventTitle": "Unsere Hochzeit" }
}
```

### Warum Redis?
- **Bereits im Stack** – kein zusätzlicher Service nötig
- **Persistent** (mit AOF/RDB) – überlebt Neustarts
- **Schnell** – Sub-Millisekunde Zugriff
- **TTL-Support** – automatische Bereinigung alter Einträge

---

## 4. Warm-Up-System

### Automatischer Warm-Up
Vor einem Event kann der Cache vorgewärmt werden:

```typescript
import { warmUpCache } from '../services/cache/aiCache';

// Alle Standard-Event-Typen vorwärmen
await warmUpCache(generateFn);

// Spezifische Event-Typen
await warmUpCache(generateFn, ['wedding', 'party']);
```

### Was wird vorgewärmt?
Pro Event-Typ werden generiert:
- Album-Vorschläge
- Challenge-Vorschläge  
- Farbschemata
- Beschreibungen (mit gängigen Titeln: "Unsere Hochzeit", "Hochzeit", etc.)
- Gästebuch-Nachrichten
- Einladungstexte

### Vorgewärmte Event-Typen
`wedding`, `party`, `business`, `family`, `milestone`, `custom`

### Geschätzter Cache-Umfang
- ~6 Event-Typen × ~5 Features × ~2 Titel = **~60 Cache-Einträge**
- Speicherbedarf: < 1 MB in Redis
- Warm-Up-Dauer: ~30-60 Sekunden (je nach API-Rate-Limits)

---

## 5. Offline-Szenarien

### Szenario A: Event-Terminal am NUC (kein Internet)

**Voraussetzung**: Cache wurde vorher aufgewärmt (z.B. durch Admin)

| Aktion | Verhalten |
|--------|-----------|
| Gast erstellt Event (Typ: "wedding") | Album-Vorschläge aus Cache ✅ |
| Admin fordert Beschreibung an | Aus Cache oder Fallback ✅ |
| Gast stellt Chat-Frage | FAQ-Match oder Fallback ✅ |
| Admin will Farbschema | Aus Cache oder statische Defaults ✅ |
| Gast will Face-Switch | ❌ Nicht verfügbar (Cloud-only) |
| Gast will Hintergrund entfernen | ❌ Nicht verfügbar (Cloud-only) |

### Szenario B: Instabile Verbindung

Das System erkennt Ausfälle automatisch:
1. `isAiOnline()` prüft API-Erreichbarkeit (3s Timeout)
2. Bei Fehler → Cache wird bevorzugt
3. Bei Cache-Miss → statischer Fallback
4. Kein Absturz, kein Warten

### Szenario C: Server mit Ollama (Zukunft → Task #36)

Auf dem dedizierten Server (Ryzen 9 5950X, 128GB RAM):
- Ollama als lokaler LLM-Server
- Läuft als zusätzlicher Fallback-Provider
- Funktioniert ohne Internet-Verbindung zu Cloud-APIs
- Nur für den Server selbst, nicht für den Event-NUC

---

## 6. Bild-AI: Warum keine Offline-Lösung?

| Aspekt | Anforderung | NUC-Realität |
|--------|-------------|--------------|
| **Face-Switch** | GPU + große Modelle (>4GB VRAM) | Keine dedizierte GPU |
| **Hintergrund entfernen** | Segmentierungsmodell | Zu langsam auf CPU |
| **Style Transfer** | Stable Diffusion | 10-30 Min pro Bild auf CPU |
| **AI Cartoon/Oldify** | Spezialisierte Modelle | Nicht machbar ohne GPU |

**Fazit**: Bild-AI bleibt Cloud-only. Text-AI (wenige KB pro Anfrage) ist ideal für Caching.

---

## 7. Fallback-Kette

```
1. Redis-Cache (30 Tage TTL, lernt mit)
   ↓ Miss
2. Cloud-AI-Provider (Groq → Grok → OpenAI)
   ↓ Fehler / Offline
3. Ollama auf Server (Zukunft, Task #36)
   ↓ Nicht verfügbar
4. Statischer Fallback (hardcoded pro Event-Typ + Feature)
   ↓ Immer verfügbar ✅
```

---

## 8. Monitoring & Statistiken

### Cache-Stats abrufen
```typescript
const stats = await getAiCacheStats();
// → { totalEntries: 142, totalHits: 1203, features: { ... } }
```

### Log-Ausgaben
```
[AI-Cache] Hit   feature=suggest-albums hitCount=5 ageHours=48
[AI-Cache] Miss  feature=suggest-description
[AI-Cache] Stored feature=suggest-albums ttlDays=30 provider=groq
```

### Admin-Dashboard Integration (Empfehlung)
- Cache-Hit-Rate pro Feature anzeigen
- Warm-Up-Button für Events
- Cache-Clear-Button für Debugging

---

## 9. Nächste Schritte

| # | Aufgabe | Priorität | Status |
|---|---------|-----------|--------|
| 1 | AI-Cache-System implementieren | Hoch | ✅ Fertig |
| 2 | groq.ts mit withAiCache wrappen | Hoch | ✅ Fertig |
| 3 | Offline-Strategie dokumentieren | Hoch | ✅ Dieses Dokument |
| 4 | Warm-Up-Endpoint in AI-Routes | Mittel | ⏳ Offen |
| 5 | Cache-Stats-Endpoint in AI-Routes | Mittel | ⏳ Offen |
| 6 | Admin-Dashboard: Cache-Verwaltung UI | Niedrig | ⏳ Offen |
| 7 | Ollama als Fallback-Provider (Task #36) | Mittel | ⏳ Offen |
| 8 | Redis-Persistenz konfigurieren (AOF) | Niedrig | ⏳ Offen |

---

## 10. Zusammenfassung

Das **lernende AI-Cache-System** löst das Offline-Problem pragmatisch:

- **Kein zusätzlicher Service** nötig – nutzt bestehendes Redis
- **Automatisches Lernen** – jede erfolgreiche Antwort wird gecacht
- **Warm-Up** möglich – Cache vor Events auffüllen
- **Graceful Degradation** – von Cache → Cloud → Ollama → Fallback
- **Text-AI offline-fähig** – Vorschläge, Chat, Farbschemata funktionieren
- **Bild-AI bleibt Cloud-only** – Hardware-Limitation akzeptiert
- **Minimal-invasiv** – `withAiCache` Wrapper ändert keine bestehende Logik
