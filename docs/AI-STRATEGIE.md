# AI-Strategie – gästefotos.com

> Stand: Juli 2025 | Aktive Provider: Groq ✅ | Grok (xAI) ⏳ | OpenAI ⏳

---

## 1. Provider-Übersicht

### Groq (Llama 3.1 70B) ✅ AKTIV
- **Stärke**: Schnellste Inferenz (~100ms), kostenlos/sehr günstig
- **Modelle**: `llama-3.1-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`
- **Kosten**: ~$0.00059 / 1k Tokens (70B) — nahezu kostenlos
- **Ideal für**: Kurze Texte, Vorschläge, Chat-Bot, Echtzeit-Antworten
- **API**: `https://api.groq.com/openai/v1` (OpenAI-kompatibel)
- **Env**: `GROQ_API_KEY=gsk_...`

### Grok (xAI) ⏳ KEY FEHLT
- **Stärke**: Hohe Qualität, kreative Texte, gut für Marketing
- **Modelle**: `grok-2-latest`, `grok-3-mini-fast`
- **Kosten**: ~$0.01 / 1k Tokens
- **Ideal für**: Komplexe Texte, Marketing-Content, kreative Aufgaben
- **API**: `https://api.x.ai/v1` (OpenAI-kompatibel)
- **Env**: `XAI_API_KEY=xai-...`

### OpenAI ⏳ KEY FEHLT
- **Stärke**: Höchste Qualität, größtes Ökosystem
- **Modelle**: `gpt-4o-mini`, `gpt-4o`
- **Kosten**: ~$0.00015 / 1k Tokens (4o-mini) bis ~$0.005 (4o)
- **Ideal für**: Komplexe Reasoning-Aufgaben, Fallback, Premium-Features
- **API**: `https://api.openai.com/v1`
- **Env**: `OPENAI_API_KEY=sk-...`

---

## 2. Feature-zu-Provider-Zuordnung

### LLM-Features (Text-Generierung)

| Feature | Slug | Primär | Fallback | Credits | Prompt-Typ |
|---------|------|--------|----------|---------|------------|
| Album-Vorschläge | `album_suggest` | **Groq** | Grok → OpenAI | 1 | JSON-Array |
| Event-Beschreibung | `description_suggest` | **Groq** | Grok → OpenAI | 1 | Freitext kurz |
| Einladungstext | `invitation_suggest` | **Groq** | Grok → OpenAI | 1 | Freitext kurz |
| Challenge-Ideen | `challenge_suggest` | **Groq** | Grok → OpenAI | 1 | JSON-Array |
| Gästebuch-Nachricht | `guestbook_suggest` | **Groq** | Grok → OpenAI | 1 | Freitext kurz |
| Farbschema | `color_scheme` | **Groq** | Grok → OpenAI | 1 | JSON-Array |
| Chat-Bot | `chat` | **Groq** | Grok → OpenAI | 1 | Konversation |
| Compliment Mirror | `compliment_mirror` | **Groq** | Grok → OpenAI | 2 | Freitext |

### Bild-KI-Features

| Feature | Slug | Provider-Typ | Credits | Status |
|---------|------|-------------|---------|--------|
| Face Switch | `face_switch` | IMAGE_GEN | 5 | ⏳ Braucht Bild-API |
| BG Removal | `bg_removal` | IMAGE_GEN | 3 | ⏳ Braucht Bild-API |
| AI Oldify | `ai_oldify` | IMAGE_GEN | 4 | ⏳ Braucht Bild-API |
| AI Cartoon | `ai_cartoon` | IMAGE_GEN | 4 | ⏳ Braucht Bild-API |
| AI Style Pop | `ai_style_pop` | IMAGE_GEN | 4 | ⏳ Braucht Bild-API |
| Style Transfer | `style_transfer` | IMAGE_GEN | 5 | ⏳ Braucht Bild-API |
| DrawBot | `drawbot` | IMAGE_GEN | 8 | ⏳ Braucht Bild-API |
| Highlight Reel | `highlight_reel` | VIDEO_GEN | 10 | ⏳ Braucht Video-API |

### Sonstige Features

| Feature | Slug | Provider-Typ | Credits | Status |
|---------|------|-------------|---------|--------|
| Gesichtserkennung | `face_search` | FACE_RECOGNITION | 0 (gratis) | ✅ Lokal |

---

## 3. Prompts pro Feature

### Album-Vorschläge (`album_suggest`)
```
System: Du bist ein Assistent für eine Foto-Sharing-App für Events. 
Generiere passende Album-Namen auf Deutsch. 
Antworte NUR mit einer JSON-Array von Strings, keine Erklärungen.
Beispiel: ["Getting Ready", "Trauung", "Feier"]

User: Generiere 5-7 passende Album-Namen für ein Event vom Typ "{eventType}"
{optional: mit dem Titel "{eventTitle}"}.
Die Namen sollten kurz und prägnant sein (max 3 Wörter).

Params: temperature=0.8
```

### Event-Beschreibung (`description_suggest`)
```
System: Du bist ein Assistent für eine Foto-Sharing-App.
Generiere eine kurze, einladende Event-Beschreibung auf Deutsch.
Max 2 Sätze, freundlicher Ton, mit Emoji.

User: Schreibe eine kurze Beschreibung für "{eventTitle}" ({eventType})
{optional: am {eventDate}}.

Params: temperature=0.7, maxTokens=100
```

### Einladungstext (`invitation_suggest`)
```
System: Du bist ein Assistent für eine Foto-Sharing-App.
Generiere einen kurzen Einladungstext auf Deutsch für Gäste.
Max 3 Sätze, einladend und persönlich, mit Emoji.

User: Schreibe einen Einladungstext für "{eventTitle}" ({eventType})
{optional: von {hostName}}.
Die Gäste sollen motiviert werden, Fotos hochzuladen.

Params: temperature=0.7, maxTokens=150
```

### Challenge-Ideen (`challenge_suggest`)
```
System: Du bist ein Assistent für eine Foto-Sharing-App.
Generiere kreative Foto-Challenge-Ideen auf Deutsch.
Antworte NUR mit einem JSON-Array von Objekten mit "title" und "description".
Beispiel: [{"title": "Selfie mit Brautpaar", "description": "Macht ein Selfie mit den Frischvermählten!"}]

User: Generiere 5 kreative Foto-Challenge-Ideen für ein "{eventType}" Event.
Jede Challenge sollte einen kurzen Titel und eine einladende Beschreibung haben.

Params: temperature=0.9
```

### Gästebuch-Nachricht (`guestbook_suggest`)
```
System: Du bist ein Assistent für eine Foto-Sharing-App.
Generiere eine einladende Gästebuch-Begrüßungsnachricht auf Deutsch.
Max 2 Sätze, herzlich und persönlich.

User: Schreibe eine Willkommensnachricht für das Gästebuch von 
"{eventTitle}" ({eventType}).

Params: temperature=0.7, maxTokens=100
```

### Farbschema (`color_scheme`)
```
System: Du bist ein Farbdesign-Experte für Event-Apps.
Generiere harmonische Farbschemata als HEX-Werte.
Antworte NUR mit einem JSON-Array von Objekten.
Jedes Objekt hat: primary, secondary, accent, background (alle als HEX), und name (deutscher Name).

User: Generiere 4 passende Farbschemata für ein "{eventType}" Event.
{optional: Stichworte: {keywords}.}
{optional: Stimmung: {mood}.}
Berücksichtige: Kontrast für Lesbarkeit, moderne Ästhetik, emotionale Wirkung.

Params: temperature=0.8, maxTokens=800
```

### Chat-Bot (`chat`)
```
System: Du bist der freundliche KI-Assistent von gästefotos.com, 
einer App für Event-Fotogalerien.
Deine Aufgabe ist es, Hosts (Event-Ersteller) bei Fragen zu helfen.
Antworte kurz, freundlich und auf Deutsch.
Nutze Emojis sparsam aber passend.
Fokussiere dich auf praktische Hilfe.

Die App bietet:
- Event-Fotogalerien mit QR-Code-Zugang
- Gesichtserkennung "Finde mein Foto"
- Alben und Foto-Challenges
- Digitales Gästebuch
- Co-Host Einladungen

Params: temperature=0.7, maxTokens=300
```

---

## 4. Fallback-Logik (bereits implementiert)

Die Provider-Auflösung in `aiExecution.ts` funktioniert so:

```
1. Prüfe AiFeatureMapping → Gibt es eine explizite Zuordnung für dieses Feature?
   → Ja → Nutze diesen Provider (falls aktiv)
   → Nein → Weiter

2. Fallback auf Default-Provider → Finde den Standard-Provider für den Feature-Typ (LLM/IMAGE_GEN/etc.)
   → Gefunden → Nutze diesen
   → Nicht gefunden → Weiter

3. Irgendeinen aktiven Provider des Typs → Finde irgendeinen aktiven Provider
   → Gefunden → Nutze diesen
   → Nicht gefunden → Feature nicht verfügbar
```

Zusätzlich: `llmClient.ts` hat eine env-basierte Priorität:
```
XAI_API_KEY (Grok) → GROQ_API_KEY (Groq) → OPENAI_API_KEY (OpenAI) → Fallback leer
```

**Aktuell**: Nur `GROQ_API_KEY` gesetzt → Groq wird für alle LLM-Features genutzt.

---

## 5. Kosten-Schätzung pro Monat

### Szenario: 100 Events / Monat, je 5 AI-Aufrufe

| Provider | Aufrufe | Tokens/Aufruf | Gesamt-Tokens | Kosten |
|----------|---------|---------------|---------------|--------|
| Groq (70B) | 500 | ~500 | 250.000 | **~$0.15** |
| Grok (2) | 500 | ~500 | 250.000 | **~$2.50** |
| OpenAI (4o-mini) | 500 | ~500 | 250.000 | **~$0.04** |
| OpenAI (4o) | 500 | ~500 | 250.000 | **~$1.25** |

**Empfehlung**: Groq für 95% der Anfragen, Grok/OpenAI nur für Premium-Features.

---

## 6. Offline-Strategie & Lernendes Cache-System

✅ **Implementiert** – siehe [OFFLINE-AI-STRATEGIE.md](./OFFLINE-AI-STRATEGIE.md)

- Lernendes Redis-Cache-System für alle Text-AI-Features
- Warm-Up-System zur Event-Vorbereitung
- Statische Fallbacks für vollständigen Offline-Betrieb
- Admin-API für Cache-Verwaltung und Monitoring

---

## 7. Nächste Schritte

- [ ] Grok (xAI) API-Key besorgen → `XAI_API_KEY=xai-...` in .env
- [ ] OpenAI API-Key besorgen → `OPENAI_API_KEY=sk-...` in .env
- [ ] Seed erneut ausführen: `npx tsx prisma/seed-ai-providers.ts`
- [ ] AiFeatureMapping-Einträge in DB anlegen (Admin-Dashboard → AI Provider)
- [ ] Bild-KI-Provider evaluieren (Replicate, Stability AI, fal.ai)
- [ ] Groq-Modell auf neuestes Llama prüfen (z.B. Llama 3.3)
- [x] Lernendes AI-Cache-System implementieren
- [ ] Ollama auf dediziertem Server integrieren
- [ ] Admin-Dashboard UI für Cache-Statistiken
