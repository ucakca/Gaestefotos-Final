# Offline-AI-Strategie – gästefotos.com

> Stand: Juli 2025 | Status: Lernendes Cache-System implementiert ✅

---

## 1. Problemstellung

Bei Events (Hochzeiten, Firmenfeiern) kann die Internetverbindung instabil oder gar nicht vorhanden sein. Die AI-Features der App (Text-Vorschläge, Chat-Bot) dürfen dadurch nicht ausfallen.

### Hardware-Realität
| Szenario | Hardware | GPU | Internet | AI-Fähigkeit |
|----------|----------|-----|----------|-------------|
| **Cloud-Server** | Ryzen 9 5950X, 128GB RAM, NVMe | Keine | ✅ Stabil | Cloud-AI + Ollama möglich |
| **Event-Terminal (NUC)** | Mini-PC, 8-16GB RAM | Keine | ❌ Instabil | Nur Cache + Fallbacks |
| **Gäste-Smartphones** | Diverse | - | ❌ Event-WLAN | Über Terminal/Server |

### Fazit
- **Text-AI** (Vorschläge, Chat): Offline via Cache möglich ✅
- **Bild-AI** (Face-Switch, Style Transfer): Cloud-abhängig, kein Offline ❌
- **Gesichtserkennung**: Lokales Modell denkbar, aber aufwändig ⚠️

---

## 2. Lernendes AI-Cache-System

### Architektur

```
┌─────────────────────────────────────────────────────┐
│                    Request                           │
│                      │                               │
│              ┌───────▼───────┐                       │
│              │  Cache prüfen │                       │
│              │  (Redis)      │                       │
│              └───────┬───────┘                       │
│                      │                               │
│            ┌─────────┼─────────┐                     │
│            │                   │                     │
│      Cache-Hit           Cache-Miss                  │
│        │                       │                     │
│   Sofortige              ┌─────▼─────┐               │
│   Antwort ✅             │  Online?  │               │
│   (< 1ms)                └─────┬─────┘               │
│                          ┌─────┼─────┐               │
│                          │           │               │
│                       Online     Offline             │
│                          │           │               │
│                    ┌─────▼─────┐  Statischer         │
│                    │ AI-API    │  Fallback            │
│                    │ aufrufen  │  (Hardcoded)         │
│                    └─────┬─────┘                     │
│                          │                           │
│                    ┌─────▼─────┐                     │
│                    │ Antwort   │                     │
│                    │ cachen    │                     │
│                    │ (30 Tage) │                     │
│                    └───────────┘                     │
│                                                     │
│              ══════════════════                      │
│              DAS SYSTEM LERNT:                       │
│              Jede Anfrage füllt                      │
│              den Cache weiter                        │
│              ══════════════════                      │
└─────────────────────────────────────────────────────┘
```

### Implementierte Dateien

| Datei | Funktion |
|-------|----------|
| `src/services/cache/aiCache.ts` | Kern-Cache-System mit Get/Set/Stats/WarmUp/Clear |
| `src/lib/groq.ts` | 6 AI-Funktionen mit Cache-Integration |
| `src/routes/ai.ts` | Admin-Endpoints für Cache-Management |
| `src/services/cache/redis.ts` | Redis-Client (Basis-Infrastruktur) |

### Gecachte Features

| Feature | Cache-Key-Parameter | TTL | Offline-Fallback |
|---------|-------------------|-----|-----------------|
| `suggest-albums` | eventType, eventTitle | 30 Tage | Hardcoded Album-Namen pro Event-Typ |
| `suggest-description` | eventType, eventTitle, eventDate | 30 Tage | Generischer Willkommenstext |
| `suggest-invitation` | eventType, eventTitle, hostName | 30 Tage | Generischer Einladungstext |
| `suggest-challenges` | eventType | 30 Tage | Hardcoded Challenges pro Event-Typ |
| `suggest-guestbook` | eventType, eventTitle | 30 Tage | Generische Gästebuch-Nachricht |
| `suggest-colors` | eventType, keywords, mood | 30 Tage | Hardcoded Farbschemata pro Event-Typ |
| `chat` | Nachrichteninhalt | 7 Tage | FAQ-Keywords + generische Antwort |

### Cache-Key-Generierung

Keys werden deterministisch aus Feature + sortierten Parametern generiert:
```
ai:cache:{feature}:{md5_hash_der_parameter}
```

Beispiel: `ai:cache:suggest-albums:a1b2c3d4e5f6`

Dadurch liefern identische Anfragen immer denselben Cache-Eintrag.

---

## 3. Warm-Up System

### Automatisches Vorwärmen

Vor einem Event kann der Cache aufgewärmt werden, sodass häufige Anfragen bereits gecacht sind:

```bash
# API-Aufruf: Cache aufwärmen
POST /api/ai/cache/warm-up
Body: { "eventTypes": ["wedding", "party"] }
```

### Was wird vorgeladen?

Für jeden Event-Typ werden generiert:
- Album-Vorschläge
- Challenge-Ideen  
- Farbschemata
- Beschreibungen (mit häufigen Titeln: "Unsere Hochzeit", "Feier", etc.)
- Gästebuch-Nachrichten
- Einladungstexte

### Häufige Event-Titel pro Typ

| Event-Typ | Vorgeladene Titel |
|-----------|------------------|
| wedding | "Unsere Hochzeit", "Hochzeit" |
| party | "Feier", "Party" |
| business | "Firmenfeier", "Teambuilding", "Konferenz" |
| family | "Familientreffen", "Familienfeier" |
| milestone | "Geburtstag", "Jubiläum" |
| custom | "Event", "Veranstaltung" |

---

## 4. Admin-API-Endpoints

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/ai/cache/stats` | GET | Cache-Statistiken (Einträge, Hits, pro Feature) |
| `/api/ai/cache/warm-up` | POST | Cache aufwärmen (optional: eventTypes Array) |
| `/api/ai/cache` | DELETE | Gesamten AI-Cache löschen |
| `/api/ai/cache/online-status` | GET | Prüft ob AI-Provider erreichbar sind |

### Beispiel-Antwort `/api/ai/cache/stats`

```json
{
  "stats": {
    "totalEntries": 42,
    "totalHits": 156,
    "features": {
      "suggest-albums": { "entries": 8, "hits": 34 },
      "suggest-challenges": { "entries": 6, "hits": 28 },
      "suggest-colors": { "entries": 12, "hits": 45 }
    }
  },
  "entries": {
    "suggest-albums": 8,
    "suggest-description": 6,
    "suggest-invitation": 5,
    "suggest-challenges": 6,
    "suggest-guestbook": 5,
    "suggest-colors": 12,
    "chat": 3
  },
  "aiOnline": true,
  "offlineReady": true
}
```

---

## 5. Offline-Ablauf am Event

### Vorbereitung (mit Internet)

1. **Event erstellen** → AI-Vorschläge werden automatisch gecacht
2. **Warm-Up ausführen** → Häufige Anfragen vorladen
3. **Redis-Datenbank** → Enthält alle gecachten Antworten

### Während des Events (ohne Internet)

1. **Gast öffnet App** → Statische Assets aus Service Worker
2. **AI-Feature angefragt** → Cache-Hit → Sofortige Antwort
3. **Cache-Miss** → Statischer Fallback → Funktionale, aber generische Antwort
4. **Bild-AI** → Nicht verfügbar, Hinweis anzeigen

### Nach dem Event (mit Internet)

1. **Neue Anfragen** → Werden an Cloud-AI gesendet
2. **Ergebnisse** → Automatisch gecacht für zukünftige Events
3. **Cache wächst** → System wird mit jeder Nutzung besser

---

## 6. Resilience-Stufen

| Stufe | Internet | AI-Qualität | Verfügbare Features |
|-------|----------|-------------|-------------------|
| 🟢 **Voll Online** | Stabil | Beste | Alle Features inkl. Bild-AI |
| 🟡 **Cache-Modus** | Instabil | Gut (gecacht) | Text-AI aus Cache, Bild-AI instabil |
| 🟠 **Offline + Cache** | Keins | Gut (gecacht) | Nur gecachte Text-AI |
| 🔴 **Offline + Leer** | Keins | Basisfunktional | Nur statische Fallbacks |

---

## 7. Zukunft: Ollama-Integration

### Dedizierter Server (Ryzen 9 5950X)

Ollama kann als lokaler LLM-Server auf dem dedizierten Server laufen:

```
NUC (Event) → [Internet?] → Dedizierter Server (Ollama)
                                    ↓ Fallback
                              Cloud-Provider (Groq/OpenAI)
```

**Vorteile:**
- Volle Kontrolle über die Modelle
- Keine API-Kosten für Text-AI
- Datenschutz (keine Daten an Dritte)
- OpenAI-kompatible API → minimaler Code-Aufwand

**Empfohlene Modelle:**
| Modell | RAM-Bedarf | Qualität | Geschwindigkeit |
|--------|-----------|----------|----------------|
| Llama 3.1 8B | ~8 GB | Gut | Sehr schnell |
| Llama 3.1 70B | ~40 GB | Sehr gut | Mittel |
| Mistral 7B | ~6 GB | Gut | Sehr schnell |

**Status:** Geplant (TODO #36)

---

## 8. Was NICHT offline funktioniert

| Feature | Grund | Alternative |
|---------|-------|------------|
| Face Switch | Cloud-GPU erforderlich | Hinweis: "Nur mit Internet verfügbar" |
| Background Removal | Cloud-GPU erforderlich | Einfache lokale Lösung möglich |
| Style Transfer | Stability AI / Replicate API | Vorher generierte Styles cachen |
| AI Oldify / Cartoon | Cloud-GPU erforderlich | Keine |
| Highlight Reel | Video-Verarbeitung in Cloud | Keine |
| Face Search | ML-Modell lokal möglich | Lokales Modell (TBD) |

---

## 9. Metriken & Monitoring

Das Cache-System trackt automatisch:

- **Hit Count pro Eintrag** → Beliebte Anfragen identifizieren
- **Globale Hit-Statistiken** → Cache-Effizienz messen
- **Entry Count pro Feature** → Cache-Abdeckung überwachen
- **Online-Status** → AI-Verfügbarkeit in Echtzeit

### KPIs

| Metrik | Ziel | Beschreibung |
|--------|------|-------------|
| Cache-Hit-Rate | > 70% | Anteil der Anfragen aus dem Cache |
| Offline-Abdeckung | > 90% | Gecachte Event-Typen |
| Warm-Up-Vollständigkeit | 100% | Alle 6 Features pro Event-Typ |

---

## 10. Zusammenfassung

```
✅ Implementiert:
   - Lernendes AI-Cache-System (Redis-basiert)
   - 6 Text-AI-Features mit Cache-Integration
   - Warm-Up-System für Event-Vorbereitung
   - Admin-API für Cache-Verwaltung
   - Online-Status-Prüfung
   - Statische Fallbacks für alle Features
   - Hit-Tracking und Statistiken

⏳ Geplant:
   - Ollama auf dediziertem Server
   - Admin-Dashboard UI für Cache-Verwaltung
   - Automatisches Warm-Up bei Event-Erstellung
   - Service Worker für komplette Offline-PWA
```
