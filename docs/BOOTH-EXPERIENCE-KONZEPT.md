# Booth Experience Konzept — KI-Avatar + Spiele + Async Delivery

> Stand: 27. Februar 2026
> Status: KONZEPTPHASE — Architektur-Entscheidungen getroffen ✅

---

## 1. Vision

Die Photo Booth ist keine Maschine — sie ist eine **Bühne**. Jeder Gast bekommt ein 30-60 Sekunden **Entertainment-Erlebnis** mit einem interaktiven KI-Avatar, Mini-Spielen und KI-Effekten. Die Schlange vor der Booth ist kein Problem — sie ist **Marketing**.

### Kernprinzipien

| Prinzip | Bedeutung |
|---|---|
| **Schlange = Social Proof** | Jeder in der Schlange sieht das Spektakel → will auch → erzählt weiter |
| **Avatar = Booth-Host** | Kein stummer Automat, sondern eine virtuelle Person mit Charakter |
| **Keine Sprache, nur Gestik** | Events sind laut → Avatar kommuniziert über Gesten + Text-Bubbles |
| **Spiele sind Pflicht** | Nicht optional — Teil des Erlebnisses und der Live-Demo für die Schlange |
| **Jeder Kontakt = Marketing** | QR, E-Mail, WhatsApp → alles über gästefotos.com → Traffic + Leads |

---

## 2. Der KI-Avatar-Assistent

### 2.1 Konzept

Ein KI-generierter Avatar der den Gast durch die gesamte Booth-Session begleitet. Der Avatar **spricht nicht** (laute Events), sondern kommuniziert über:

- **Gesten** (winken, klopfen, zeigen, klatschen, Daumen hoch, Komm-Geste, Kopfschütteln, etc.)
- **Mimik** (lächeln, staunen, lachen, Augenbrauen hochziehen, zwinkern, etc.)
- **Text-Bubbles** auf dem Screen (LLM-generiert, passend zur Situation)
- **Interaktive Elemente** (zeigt auf Buttons, reagiert auf Gast-Aktionen)

### 2.2 Avatar-Galerie (mehrere Charaktere)

Host wählt im Dashboard den Avatar-Charakter für sein Event:

| Avatar | Stil | Passt zu | Persönlichkeit |
|---|---|---|---|
| **Sophie** | Junge Frau, modern, lässig | Party, Geburtstag, Festival | Frech, flirty, energetisch |
| **Viktor** | Junger Mann, charmant | Hochzeit, Firmenfeier | Warmherzig, witzig, gentleman |
| **Prof. Einstein** | Karikatur, verrückt | Firmen, Messe, Bildung | Skurril, überraschend, clever |
| **Robo** | Cartoon-Roboter, niedlich | Kinder-Events, Tech-Events | Tollpatschig, niedlich, lustig |
| **Glamour** | Elegante Person, Abendgarderobe | Gala, Award-Show, Hochzeit | Sophisticated, elegant, charmant |
| **Pirat** | Piraten-Charakter | Motto-Party, Festival | Wild, abenteuerlich, laut (gestisch) |
| **Custom** | KI-generiert nach Host-Wunsch | Alles | Host definiert per Prompt |

### 2.3 Persönlichkeits-Slider (Host-Dashboard)

```
Avatar-Konfiguration:
┌──────────────────────────────────────────┐
│  Charakter: [Sophie ▼]                    │
│                                          │
│  Energie:     😴 ─────●──── 🤪           │
│               ruhig        ausgelassen    │
│                                          │
│  Humor:       😐 ──●────── 😂           │
│               ernst        witzig         │
│                                          │
│  Flirt:       🤝 ────────●─ 😘          │
│               neutral      charmant       │
│                                          │
│  Formalität:  👔 ●──────── 🎉           │
│               formell      locker         │
│                                          │
│  Interaktion: 📷 ──●────── 🎮           │
│               foto-fokus   spiel-fokus    │
│                                          │
│  [Vorschau] [Speichern]                  │
└──────────────────────────────────────────┘
```

Die Slider beeinflussen:
- Welche Gesten der Avatar nutzt (z.B. hoher Flirt-Slider = Zwinkern, Kusshand)
- Welche Text-Bubbles das LLM generiert (z.B. hoher Humor = Witze + Wortspiele)
- Wie oft Spiele angeboten werden (hoher Interaktion-Slider = öfter)
- Wie übertrieben die Reaktionen sind (hoher Energie-Slider = mehr Gesten)

### 2.4 Avatar-Verhalten pro Phase

| Phase | Gesten | Text-Bubbles (Beispiele) |
|---|---|---|
| **IDLE** (kein Gast) | Klopft an Scheibe, winkt, Komm-Geste, guckt gelangweilt, spielt mit Requisiten, zählt Leute, lehnt sich an Rahmen | "Heeey! Ja DU! 👋", "Mir ist langweilig... 😴", "Traut sich keiner? 🤨" |
| **BEGRÜSSUNG** | Springt auf, strahlt, zeigt auf Start-Button, Daumen hoch | "Endlich! Willkommen! 🎉", "Oh, gleich so viele? Top! 👥" |
| **KONTAKT** | Zeigt auf Input-Felder, nickt ermutigend | "Wo soll dein Bild hin? 📱", "Kein Stress, QR reicht auch! 😉" |
| **COUNTDOWN** | Zählt mit Fingern, macht Grimassen, hält "Cheese"-Schild, schaut durch Finger-Rahmen | "3... 2... 1... 📸", "Nicht blinzeln! 😆" |
| **EFFEKT-WAHL** | Zeigt auf Effekte, reagiert auf Auswahl (Superheld → Avatar macht Muskeln, Vintage → zeigt auf Taschenuhr) | "Ohhh, gute Wahl! 🔥", "Mutig! Das wird gut. 😏" |
| **SPIEL** | Spielt aktiv mit (zeigt Becher, zeigt Gesten, reagiert auf Gewinnen/Verlieren) | "Haha, erwischt! 😂", "Du bist gut... 🤔" |
| **WARTEN** (ohne Spiel) | Schaut auf unsichtbare Uhr, tippt mit Fuß, macht Yoga-Pose, jongliert | "Gleich fertig... ⏳", "Die KI gibt sich Mühe! 🎨" |
| **REVEAL** | Springt, klatscht, macht WOW-Geste, übertriebenes Staunen, Kinnlade runter | "WAHNSINN! 🤯", "Das bist wirklich DU?! 😍" |
| **VERABSCHIEDUNG** | Winkt, macht Kusshand, zeigt auf QR, Daumen hoch | "Tschüss! Erzähl's weiter! 😘", "Der/Die Nächste bitte! 👋" |

### 2.5 Technische Umsetzung

**Stufe 1 (MVP): Pre-rendered Clip-Bibliothek + LLM-Steuerung**

```
Architektur:
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  LLM (Groq) │───▶│ Clip-Selektor │───▶│ Video-Player  │
│  oder lokal  │    │ (State Machine)│   │ (nahtlos)     │
└─────────────┘    └──────────────┘    └──────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐                        ┌──────────────┐
│ Text-Bubble  │                        │ Booth-Screen  │
│ Generator    │                        │ (Vollbild)    │
└─────────────┘                        └──────────────┘
```

**Clip-Bibliothek pro Avatar-Charakter:**
- ~80-120 kurze Clips (2-8 Sekunden)
- Kategorisiert nach Phase + Emotion + Geste
- 1x generiert mit HeyGen/D-ID/Kling → unbegrenzt wiederverwendbar
- Neue Clips hinzufügen = neues Verhalten, kein Code-Change
- Gesamt ~8-15 min Material pro Avatar-Charakter

**State Machine entscheidet:**
- Aktuelle Phase (idle, greeting, countdown, game, reveal, bye)
- Kontext (Effekt-Typ, Spiel-Zustand, Gast-Interaktion)
- Persönlichkeits-Slider → filtert welche Clips verfügbar sind
- Zufalls-Variation → nie exakt dieselbe Sequenz

**Stufe 2 (Upgrade): Echtzeit Lip-Sync auf LLM-Text**
- LLM generiert dynamischen Text
- Lip-Sync-Library animiert Avatar-Standbild in Echtzeit
- Komplett dynamische "Gespräche" ohne vorgerenderte Clips
- Technologien: SadTalker, LivePortrait, Wav2Lip (lokal oder Cloud)

**Stufe 3 (Premium): Gast-Reaktion-Tracking**
- Webcam erkennt Gast-Mimik in Echtzeit
- Avatar reagiert direkt (Gast lächelt → Avatar lächelt, Gast skeptisch → Avatar ermutigt)
- Face Detection + Emotion Recognition (MediaPipe, lokal)

---

## 3. Mini-Spiele Katalog

### ⚠️ WICHTIG: 3-Schichten-Architektur (Hybrid, NICHT rein MP4)

Die Spiele sind **nicht rein MP4-basiert**. Der Avatar ist MP4 — die Spiele sind interaktiver Code. Drei Schichten arbeiten zusammen:

| Schicht | Was | Technologie | Beispiel TicTacToe |
|---|---|---|---|
| **1: Game Engine** | Spiellogik, Regeln, KI-Gegner, Zustand, Win/Lose | TypeScript (pure Logic) | Minimax-Algorithmus, Win-Check |
| **2: Game UI** | Interaktives Spielfeld, Touch-Input, Animationen | React/Canvas auf Touchscreen | 3×3 Grid, Tap → X setzen |
| **3: Avatar** | Visuelle Reaktionen auf Game-Events | MP4-Clips, nahtlos | "Hmm..." → denkt, "Oh nein!" → verliert |

```
Ablauf bei TicTacToe:
  1. Game Engine wählt Spiel, initialisiert Board
  2. Avatar-Clip: "Spielen wir?" + zeigt auf Spielfeld
  3. Game UI: 3×3 Grid erscheint auf Screen
  4. Gast tippt Feld → Engine registriert Zug
  5. Avatar-Clip: "thinking" (2s) → Engine berechnet KI-Zug
  6. Game UI zeigt KI-Zug → Avatar-Clip: "confident"
  7. ... Runden wiederholen ...
  8. Engine: Win-Check → "player_wins" Event
  9. Avatar-Clip: "losing_reaction" (dramatisch verlieren)
  10. Game UI: Gewinn-Animation + Konfetti
```

**Der Avatar spielt NICHT das Spiel. Er REAGIERT auf Events der Game Engine.**

```
Game-Event-System:
  gameEngine.emit('game_start')     → avatar.play('game_intro')
  gameEngine.emit('player_move')    → avatar.play('thinking')
  gameEngine.emit('ai_move')        → avatar.play('confident')
  gameEngine.emit('player_wins')    → avatar.play('losing_dramatic')
  gameEngine.emit('ai_wins')        → avatar.play('winning_celebration')
  gameEngine.emit('draw')           → avatar.play('shrug')
  gameEngine.emit('funny_moment')   → avatar.play('laughing')
```

**Konsequenz für Clip-Bibliothek:** Neben phasen-spezifischen Clips (idle, greeting, etc.) braucht jeder Avatar auch **Game-Reaktions-Clips**:

| Clip-Kategorie | Clips pro Avatar | Beispiele |
|---|---|---|
| **Game Start** | 3-5 | Aufregung, "Bereit?", Hände reiben |
| **Thinking** | 3-5 | Kinn kratzen, Stirn runzeln, Finger tippen |
| **Confident Move** | 3-5 | Smirk, Augenbraue hoch, Nicken |
| **Winning** | 3-5 | Jubeln, Klatschen, Tanz, Muskeln |
| **Losing** | 3-5 | Dramatisch, Kopf auf Tisch, "Nein!", Schmollen |
| **Draw** | 2-3 | Schulter zucken, "Nochmal?", Handschlag |
| **Funny Moment** | 3-5 | Lachen, Staunen, erschrecken |
| **Gesamt** | ~25-35 Game-Clips pro Avatar | |

### Prinzip: Spiele sind GESTIK-basiert, kein Audio nötig

Alle Spiele funktionieren rein visuell — Avatar zeigt Gesten, Gast interagiert per Touch oder Kamera.

### 3.1 Touch-Spiele (Gast tippt auf Screen)

| Spiel | Beschreibung | Dauer | Zuschauer-Wow |
|---|---|---|---|
| **Hütchenspiel** | Avatar mischt 3 Becher, Ball versteckt → Gast tippt auf richtigen Becher | 10-15s | ⭐⭐⭐⭐ — Schlange rät mit |
| **TicTacToe** | Avatar vs. Gast, Avatar reagiert gestisch auf Züge | 15-30s | ⭐⭐ — simpel, verständlich |
| **Schnick-Schnack-Schnuck** | Avatar zeigt Geste, Gast tippt Auswahl, Best-of-3 | 10-15s | ⭐⭐⭐ — schnell, Spaß |
| **Memory** | 6-8 Karten aufdecken, Avatar hilft/verwirrt mit Gesten | 20-30s | ⭐⭐ — ruhiger |
| **Reaktions-Test** | Objekte fliegen über Screen → Gast muss tippen wenn Avatar Signal gibt | 10s | ⭐⭐⭐ — spannend |
| **Emoji-Roulette** | Rad dreht sich → Emoji → Gast muss Emotion nachmachen → Kamera vergleicht | 15s | ⭐⭐⭐⭐ — lustig |
| **Farb-Chaos** | Simon Says mit Farben — Avatar zeigt Reihenfolge, Gast tippt nach | 15-20s | ⭐⭐⭐ — Gruppen-tauglich |
| **Wimmelbild** | "Finde den Fehler" oder "Finde das Objekt" im KI-generierten Bild | 15s | ⭐⭐ — ruhig |
| **Ballon-Pop** | Ballons steigen auf → Gast tippt → Avatar feiert/weint bei Treffer/Fehl | 10s | ⭐⭐⭐ — aktiv |
| **Quiz** | Event-bezogene Frage (LLM generiert) → 3 Antworten → Avatar reagiert | 10-15s | ⭐⭐⭐ — Gelächter bei Fails |

### 3.2 Kamera-Spiele (Gast nutzt Körper/Gesicht)

| Spiel | Beschreibung | Dauer | Zuschauer-Wow |
|---|---|---|---|
| **Mimik-Duell** | Avatar macht Gesicht → Gast nachmachen → Kamera-Score 0-100 | 15-20s | ⭐⭐⭐⭐⭐ — ALLE lachen |
| **Blind Mimicry** | Avatar zeigt Referenz-Pose → Gast stellt nach OHNE sich zu sehen → Reveal | 15-20s | ⭐⭐⭐⭐⭐ — größter Lacher |
| **Freeze!** | Avatar sagt (per Geste) "FREEZE!" → Gast muss einfrieren → Kamera-Shot → lustigstes Foto gewinnt | 10s | ⭐⭐⭐⭐ — spontan |
| **Spiegelbild** | Gast muss Avatar-Bewegungen spiegeln (links/rechts vertauscht) | 15s | ⭐⭐⭐ — tricky |
| **Gesichts-Stretching** | Avatar macht übertriebene Grimasse → Gast übertreibt noch mehr → Score | 10s | ⭐⭐⭐⭐⭐ — viral |
| **Kopf-Pong** | Ball bounced über Screen → Gast bewegt Kopf um Ball zu "fangen" (Head-Tracking) | 15-20s | ⭐⭐⭐⭐ — innovativ |
| **Tanz-Pose** | Avatar zeigt Tanz-Pose → Gast muss es nachmachen → Reihenfolge wird schneller | 20-30s | ⭐⭐⭐⭐ — Party-Stimmung |
| **Statuen-Challenge** | Referenz-Statue/Pose → Gruppe stellt nach → AI Pose-Score + Side-by-Side | 15-20s | ⭐⭐⭐⭐ — Gruppen-Spektakel |

### 3.3 Avatar-Interaktions-Spiele (Avatar agiert, Gast reagiert)

| Spiel | Beschreibung | Dauer | Zuschauer-Wow |
|---|---|---|---|
| **Avatar klopft an Scheibe** | Avatar klopft → wartet → klopft lauter → Gast muss zurückklopfen (Touch) → Avatar erschrickt | 5-10s | ⭐⭐⭐ — süß |
| **Verstecken** | Avatar versteckt sich hinter Objekten auf dem Screen → Gast muss ihn finden (Touch) | 10-15s | ⭐⭐⭐ — niedlich |
| **Geschenk-Auspacken** | Avatar gibt virtuelles Geschenk → Gast tippt um auszupacken → Überraschungs-Effekt drin | 10s | ⭐⭐⭐ — spannend |
| **Avatar-Dress-Up** | Gast zieht dem Avatar lustige Klamotten an (Drag & Drop) | 15-20s | ⭐⭐⭐ — kreativ |
| **Foto-Duell** | Avatar zeigt eigenes "Foto" → Side-by-Side mit Gast-Foto → wer sieht besser aus? (immer der Gast) | 10s | ⭐⭐⭐ — Charme |
| **Wetter-Vorhersage** | Avatar als "Wetterfee" → zeigt absurde Vorhersage für den Gast basierend auf Foto | 10s | ⭐⭐ — witzig |

### 3.4 Spiel-Auswahl-Logik

```
Welches Spiel wird angeboten?

Faktoren:
  - Effekt-Dauer: kurzer Effekt → kurzes Spiel, langer Effekt → längeres Spiel
  - Host-Setting: "Spiel-Fokus" Slider → mehr/weniger Spiele
  - Zufalls-Rotation: kein Spiel 2x hintereinander
  - Gruppen-Erkennung: >1 Person → Gruppen-Spiele bevorzugen
  - Event-Typ: Hochzeit → elegantere Spiele, Party → wilde Spiele
  - Avatar-Charakter: Prof. Einstein → Quiz, Pirat → Abenteuer-Spiele

Timing:
  - Spiel startet sofort nach Effekt-Wahl
  - AI-Ergebnis kommt im Hintergrund
  - Wenn Ergebnis fertig VOR Spiel-Ende → Spiel endet, Reveal startet
  - Wenn Spiel endet VOR Ergebnis → kurze Warte-Animation → Reveal
```

---

## 4. Async Delivery — Ergebnis-Zustellung

### 4.1 QR-Code Flow (Standard, immer)

```
Booth zeigt QR nach Reveal
     ↓
Gast scannt → app.gästefotos.com/r/A3F9K2
     ↓
Ergebnis-Seite:
  - Bild-Download (mit gästefotos.com Branding)
  - Social Share (WhatsApp, Instagram, etc.)
  - "Mehr Effekte?" → Event-Galerie
  - "Eigenes Event?" → gästefotos.com CTA
  - Google Review Prompt (bei 4-5★)
```

### 4.2 E-Mail / WhatsApp / SMS (Optional, DSGVO-konform)

```
Am Booth (Phase 3: Kontakt):
  "Wie möchtest du dein Ergebnis erhalten?"
  
  [📱 Nur QR-Code]        ← Standard, kein Opt-in nötig
  [📧 E-Mail eingeben]    ← E-Mail + DSGVO ✓
  [💬 Nummer eingeben]    ← WhatsApp/SMS + DSGVO ✓
  
  ☐ Ich akzeptiere die Datenschutzerklärung (Pflicht bei E-Mail/Nummer)
  ☐ Ich möchte Updates von gästefotos.com erhalten (Optional, NICHT vorausgewählt)
```

**Zustellung per E-Mail:**
```
Betreff: Dein KI-Foto ist fertig! 🎭✨
Von: noreply@gästefotos.com

Hey [Name]!

Dein Foto vom [Event-Name] ist fertig!
→ [Jetzt ansehen] (Button → app.gästefotos.com/r/A3F9K2)

Teile es mit deinen Freunden:
[WhatsApp] [Instagram] [Download]

---
Powered by gästefotos.com
Dein nächstes Event? → gästefotos.com
```

**Zustellung per WhatsApp/SMS:**
```
Hey! 📸 Dein KI-Foto ist da!
Schau es dir an: app.gästefotos.com/r/A3F9K2
— gästefotos.com
```

### 4.3 Ergebnis-Seite (/r/:shortCode)

```
app.gästefotos.com/r/A3F9K2

┌─────────────────────────────────────┐
│  gästefotos.com          [Event-Name]│
│                                     │
│  Noch nicht fertig:                 │
│  ┌─────────────────────────────┐    │
│  │  ⏳ Dein KI-Bild wird       │    │
│  │     gerade erstellt...      │    │
│  │                             │    │
│  │  ████████████░░░░  75%      │    │
│  │  ~8 Sekunden               │    │
│  └─────────────────────────────┘    │
│                                     │
│  Fertig:                            │
│  ┌─────────────────────────────┐    │
│  │  🎉 Dein Bild ist da!      │    │
│  │                             │    │
│  │  [KI-ERGEBNIS BILD]        │    │
│  │                             │    │
│  │  [📥 Download]              │    │
│  │  [📱 Teilen] [📸 Insta]    │    │
│  │  [💬 WhatsApp]              │    │
│  └─────────────────────────────┘    │
│                                     │
│  ─── Nach Download ───              │
│                                     │
│  Wie war's? ⭐⭐⭐⭐⭐               │
│  → 4-5★: "Bewerte uns auf Google!"  │
│  → 1-3★: "Was können wir besser?"   │
│                                     │
│  ─── Footer ───                     │
│  Mehr KI-Effekte? → Event-Galerie   │
│  Eigenes Event? → gästefotos.com    │
│                                     │
└─────────────────────────────────────┘
```

**Status-Abfrage:** Smart Polling
- 0-15s: alle 2 Sekunden
- 15-60s: alle 5 Sekunden
- 60s+: alle 10 Sekunden

### 4.4 Download-Link Strategie

**Alle Links gehen über gästefotos.com** — kein direkter CDN-Link zum Bild.

| Was der Gast sieht | Was passiert |
|---|---|
| "Download" Button | → gästefotos.com/r/A3F9K2/download → branded Image + Traffic |
| WhatsApp Share | → "Schau mal: gästefotos.com/r/A3F9K2" → Freunde besuchen Seite |
| Instagram Share | → Bild mit gästefotos.com Wasserzeichen |
| E-Mail Link | → "Jetzt ansehen" → gästefotos.com/r/A3F9K2 |

**Jeder Share generiert Traffic auf gästefotos.com.** Jeder Besucher sieht das Branding + CTA.

---

## 5. Sync vs. Async Logik

### Wann Sync (Ergebnis direkt am Booth)?

```
Effekt-Dauer < 8 Sekunden UND kein Spiel aktiv
  → Ergebnis direkt am Booth zeigen
  → DANACH: QR zum Mitnehmen (5s)
  
Beispiele: Style Transfer, BG Removal, einfache Filter
```

### Wann Async (QR → Handy)?

```
Effekt-Dauer ≥ 8 Sekunden ODER Spiel aktiv
  → Spiel am Booth (Entertainment)
  → Ergebnis kommt parallel
  → Reveal am Booth wenn fertig
  → QR zum Mitnehmen (5s)
  → ZUSÄTZLICH: E-Mail/WhatsApp wenn Kontakt gegeben
  
Beispiele: Face Swap, Video, Survey→AI, Multi-Step
```

### Immer gilt:

- **Ergebnis wird IMMER am Booth gezeigt** (Reveal-Moment für die Schlange)
- **QR wird IMMER angeboten** (zum Mitnehmen aufs Handy)
- **Link geht IMMER über gästefotos.com** (Traffic)

---

## 6. DSGVO Kontakt-Strategie

### 6.1 Opt-in Flow

| Kontakt-Methode | DSGVO-Anforderung | Wann fragen? |
|---|---|---|
| **QR-Code** | Kein Opt-in nötig (kein personenbezogenes Datum) | Immer |
| **E-Mail** | Einwilligung + Datenschutz-Link | Am Booth, Phase 3 |
| **WhatsApp/SMS** | Einwilligung + Datenschutz-Link | Am Booth, Phase 3 |
| **Newsletter** | Separate Einwilligung (NICHT vorausgewählt) | Am Booth, optional |

### 6.2 Lead-Generierung

```
Marketing-Funnel pro Gast:
  1. Booth-Erlebnis → WOW-Moment
  2. Kontakt-Opt-in → E-Mail ODER Nummer
  3. Ergebnis-Delivery → gästefotos.com Traffic
  4. Google Review → bei 4-5★
  5. Newsletter → optional, für Wiederkontakt
  6. Social Share → neue Besucher → neuer Funnel-Eintritt
```

---

## 7. Google Review Integration

### Flow:

```
Gast bekommt Ergebnis auf Handy (/r/:shortCode)
     ↓ (nach Download)
"Hat dir das gefallen? ⭐⭐⭐⭐⭐"
     ↓
4-5 Sterne: "Bewerte uns auf Google! 🙏"
  → Direktlink: https://search.google.com/local/writereview?placeid=PLACE_ID
  → Google öffnet sich → Review schreiben → fertig
     
1-3 Sterne: "Was können wir besser machen?"
  → Internes Feedback-Formular (NICHT Google)
  → Feedback geht an unser Team
```

**Wichtig:** Nur zufriedene Gäste werden zu Google geleitet. Unzufriedene geben Feedback intern → wir können reagieren ohne negative öffentliche Bewertung.

---

## 8. Kompletter Booth-Flow

```
┌──────────────────── BOOTH ──────────────────────────┐
│                                                      │
│  PHASE 1: IDLE                                       │
│  Avatar: klopft an Scheibe, winkt, Komm-Geste        │
│  Screen: Event-Slideshow + Avatar-Animation           │
│  → Face Detection erkennt Person                     │
│       ↓                                              │
│                                                      │
│  PHASE 2: BEGRÜSSUNG                                │
│  Avatar: strahlt, zeigt auf Start-Button              │
│  Text: "Hey! Willst du ein Foto? 📸"                │
│       ↓ Gast drückt Start                            │
│                                                      │
│  PHASE 3: KONTAKT (1x, DSGVO)                       │
│  Avatar: zeigt auf Input-Felder                      │
│  Text: "Wo soll dein Bild hin?"                      │
│  [📱 QR] [📧 E-Mail] [💬 WhatsApp]                  │
│       ↓                                              │
│                                                      │
│  PHASE 4: FOTO                                       │
│  Avatar: Countdown 3-2-1 mit Fingern                 │
│  → DSLR Foto                                         │
│  Avatar: Daumen hoch, staunende Geste                │
│       ↓                                              │
│                                                      │
│  PHASE 5: EFFEKT-WAHL                                │
│  Avatar: zeigt auf Effekte, reagiert auf Auswahl     │
│  → Gast wählt KI-Effekt                             │
│  → AI-Job startet im Hintergrund                    │
│       ↓                                              │
│                                                      │
│  PHASE 6: SPIEL + ENTERTAINMENT                      │
│  Avatar: "Spielen wir ein Spiel? 🎭" (Saw-Style)    │
│  [JA] → Mini-Spiel startet (siehe Katalog)           │
│  [NEIN] → Avatar unterhält (Gesten, Witze, Tricks)   │
│  → AI-Ergebnis kommt parallel im Hintergrund        │
│       ↓ AI fertig                                    │
│                                                      │
│  PHASE 7: REVEAL                                     │
│  Avatar: MEGA-Reaktion (Staunen, Klatschen, Sprung)  │
│  → KI-Ergebnis groß auf Screen (Schlange sieht!)     │
│  Text: "WAHNSINN! 🤯"                               │
│       ↓ 5 Sekunden                                   │
│                                                      │
│  PHASE 8: QR + BYE                                   │
│  Avatar: zeigt auf QR-Code, winkt                    │
│  Text: "Scan mich! Erzähl's weiter! 😘"             │
│  → QR-Code + gästefotos.com/r/XXXXXX                │
│  → E-Mail/WhatsApp wird parallel gesendet            │
│       ↓                                              │
│                                                      │
│  → Zurück zu PHASE 1 (nächster Gast)                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 9. Entscheidungs-Register

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Schlange vermeiden? | **NEIN** — Schlange ist Social Proof + Marketing |
| 2 | Spiele überspringen bei Schlange? | **NEIN** — Spiele sind Teil des Erlebnisses |
| 3 | Avatar spricht? | **NEIN** — nur Gestik + Text-Bubbles (laute Events) |
| 4 | Mehrere Avatare? | **JA** — Galerie + Custom + Persönlichkeits-Slider |
| 5 | Gast-Tracking für Spiel-Logik? | **NEIN** — unnötige Ressourcen, jeder bekommt volles Erlebnis |
| 6 | Wo werden Spiele gespielt? | **NUR am Booth** — nie am Handy |
| 7 | Ergebnis-Delivery? | **QR (immer) + optional E-Mail/WhatsApp/SMS** |
| 8 | DSGVO? | **Opt-in am Booth** für E-Mail/Nummer, QR ohne Opt-in |
| 9 | Download-Links? | **Immer über gästefotos.com** → Traffic + Branding |
| 10 | Google Review? | **Nur bei 4-5★** → bei 1-3★ internes Feedback |
| 11 | Sync vs. Async? | **Ergebnis immer am Booth zeigen** + QR zum Mitnehmen |
| 12 | Avatar-Technik (MVP)? | **Pre-rendered Clips** + LLM-gesteuerte Auswahl |
| 13 | Avatar-Technik (Upgrade)? | **Echtzeit Lip-Sync** auf LLM-Text |
| 14 | Avatar-Technik (Premium)? | **Gast-Reaktion-Tracking** (Emotion Recognition) |

---

## 10. Implementierungs-Reihenfolge

### Sprint A: Async Delivery Foundation
- [ ] `/r/:shortCode` Ergebnis-Seite (Frontend)
- [ ] Smart Polling (2s/5s/10s Intervalle)
- [ ] Download mit gästefotos.com Branding
- [ ] Social Share Buttons
- [ ] Google Review Prompt

### Sprint B: Kontakt + DSGVO
- [ ] E-Mail Delivery (Transactional E-Mail Service)
- [ ] WhatsApp/SMS Delivery
- [ ] DSGVO Opt-in Flow am Booth
- [ ] Newsletter Opt-in (separate Einwilligung)
- [ ] Lead-Tracking im Admin Dashboard

### Sprint C: Avatar MVP
- [ ] Avatar-Clip-Bibliothek erstellen (1 Charakter, ~80 Clips)
- [ ] Clip-Selektor State Machine
- [ ] LLM-gesteuerte Text-Bubble-Generation
- [ ] Integration in Booth-App (Electron)
- [ ] Avatar-Konfiguration im Host-Dashboard

### Sprint D: Mini-Spiele (Basis)
- [ ] Hütchenspiel
- [ ] Schnick-Schnack-Schnuck
- [ ] Mimik-Duell (Kamera + Face Detection)
- [ ] Blind Mimicry
- [ ] Spiel-Auswahl-Logik (Rotation, Effekt-Dauer, Event-Typ)

### Sprint E: Avatar-Galerie + Mehr Spiele
- [ ] Weitere Avatar-Charaktere (5+)
- [ ] Persönlichkeits-Slider im Dashboard
- [ ] Custom Avatar per Host-Prompt
- [ ] Weitere Spiele aus Katalog (je nach Feedback)

### Sprint F: Avatar Upgrade (Echtzeit)
- [ ] Lip-Sync auf LLM-generierten Text
- [ ] Emotion Recognition → Avatar reagiert auf Gast
- [ ] Dynamische Gesten-Generation

---

> *Letzte Aktualisierung: 27. Februar 2026 — Konzeptphase abgeschlossen*
