# Gästefotos Interaktives Photo Booth - Konzept

**Erstellt:** 2026-01-29  
**Aktualisiert:** 2026-01-29  
**Status:** ⚠️ VERALTET — nur zur Referenz
**Hardware:** Mirror Booth mit kapazitivem Touch + Sony ZV-E10

> ⚠️ **VERALTET (Stand: März 2026)**
> Dieses Dokument basiert auf einem frühen Konzept mit Sony ZV-E10 (kein USB-Capture-Support) und Electron.
> 
> **Aktuelle Architektur:** → `docs/PHOTO-BOOTH-PLATFORM-PLAN.md` (§ Architektur-Update März 2026)
> **Aktuelle Experience-Konzepte:** → `docs/BOOTH-EXPERIENCE-KONZEPT.md`
> 
> Inhalte dieses Dokuments (Fortuna AI, AR-Filter, Wiedererkennung, Director Mode) sind in die aktuellen Docs übernommen.

---

## 1. Vision

Ein Photo Booth das mehr ist als nur Fotos machen - ein **Entertainment-System** das Gäste immer wieder anzieht:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   "Hey, ich war gerade am Booth - du MUSST das probieren!" │
│   "Der hat mich wiedererkannt und mir eine Aufgabe gegeben!"│
│   "Hast du schon Fortuna gefragt? Die ist so witzig!"      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Interaktive Features

### 2.1 Fortuna AI (Palm Reading)

```
┌─────────────────────────────────────────────────────────────┐
│                    MIRROR DISPLAY                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │     👻 FORTUNA (Video-Animation)                   │   │
│  │     "Willkommen, Suchender..."                     │   │
│  │                                                     │   │
│  │     ┌─────────────────────────┐                    │   │
│  │     │   🖐️ HAND HIER HALTEN   │ ← Touch-Zone      │   │
│  │     │                         │                    │   │
│  │     │   (5 Finger = erkannt)  │                    │   │
│  │     └─────────────────────────┘                    │   │
│  │                                                     │   │
│  │     "Ich spüre große Energie..."                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Flow:**
1. Fortuna erscheint im Spiegel (Video-Overlay)
2. Gast legt Hand auf Touch-Display (5 Finger erkannt)
3. Webcam macht Foto der Hand
4. GPT-4 Vision "analysiert" Handfläche
5. Fortuna "spricht" die Fortune (TTS + Lip-Sync Video)
6. AI-generiertes mystisches Portrait
7. QR-Code zum Teilen

**Kosten:** ~€0.05 pro Reading (GPT-4 + TTS)

---

### 2.2 Wiedererkennung & Challenges

```
ERSTER BESUCH:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     "Willkommen! 📸"                                        │
│                                                             │
│     [Normaler Foto-Flow]                                   │
│                                                             │
│     → Face Embedding wird gespeichert (Event-Scope)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

2. BESUCH (Face Match):
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     "Hey, dich kenne ich! 😏"                              │
│                                                             │
│     🎯 CHALLENGE: "Mach ein Foto mit 3 Freunden!"          │
│                                                             │
│     [Challenge annehmen]     [Nur Foto machen]             │
│                                                             │
│     Belohnung: 🔓 Geheimer "Party Animal" Filter           │
│                                                             │
└─────────────────────────────────────────────────────────────┘

3.+ BESUCH:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     "Wieder du! Du bist ja überall 🎉"                     │
│                                                             │
│     🏆 Du hast 5 Challenges geschafft!                     │
│                                                             │
│     [Achievements ansehen]   [Weiter zum Foto]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.3 AR Face Filters (Live)

```
┌─────────────────────────────────────────────────────────────┐
│  Gast sieht sich im Spiegel + Live AR Filter               │
│                                                             │
│  🦁 Löwe      👑 Krone      🎭 Maske      👓 Brille        │
│  🐱 Katze     💀 Skelett    🤡 Clown     👽 Alien         │
│  🎩 Zylinder  🌸 Blumen     ⭐ Sterne    🔥 Flammen       │
│                                                             │
│  → Filter folgt Gesicht in Echtzeit (MediaPipe/face-api.js)│
│  → Gast wählt durch Touch auf dem Spiegel                  │
│  → Preview zeigt Filter live bevor Foto gemacht wird       │
└─────────────────────────────────────────────────────────────┘
```

**Technisch:**
- MediaPipe Face Mesh für 468 Gesichtspunkte
- WebGL für Echtzeit-Rendering
- ~30fps auf modernem PC
- Filter als PNG/SVG Assets mit Ankerpunkten

---

### 2.4 Director Mode (Mini-Filmszenen)

```
┌─────────────────────────────────────────────────────────────┐
│  "Spiel eine Szene nach!" 🎬                               │
│                                                             │
│  SZENE: "Der dramatische Abschied"                         │
│                                                             │
│  Anweisung:                                                │
│  "Schau traurig in die Ferne... JETZT lächle!"            │
│                                                             │
│  [Kamera macht Burst von 5 Fotos]                         │
│  [AI wählt das beste aus]                                 │
│                                                             │
│  Szenen:                                                   │
│  🦸 Actionheld    💕 Romcom      👻 Horror                │
│  🏆 Oscar-Gewinner 🕺 Disco      🤠 Western               │
└─────────────────────────────────────────────────────────────┘
```

**Flow:**
1. Gast wählt Szene
2. Anweisungen erscheinen auf Screen
3. ZV-E10 macht Burst (5-10 Fotos)
4. AI wählt bestes Foto (Gesichtserkennung + Emotion)
5. Passender Filter wird angewendet

---

### 2.5 Zeitreise (Age Morphing)

```
┌─────────────────────────────────────────────────────────────┐
│  "Sieh dich in der Zukunft!" ⏳                            │
│                                                             │
│  [Dein Foto]                                               │
│       ↓                                                    │
│  Wähle Transformation:                                     │
│                                                             │
│  👶 Als Kind       → -20 Jahre                             │
│  👴 Als Senior     → +30 Jahre                             │
│  🏰 Mittelalter    → Renaissance-Style                     │
│  🚀 Zukunft        → Sci-Fi Style                          │
│  🎨 Gemälde        → Ölgemälde-Look                        │
│                                                             │
│  [Video zeigt sanften Morph-Übergang]                     │
└─────────────────────────────────────────────────────────────┘
```

**API:** Replicate Face-to-Many oder ähnlich (~€0.02-0.05 pro Bild)

---

### 2.6 Pose Challenge

```
┌─────────────────────────────────────────────────────────────┐
│  "Mach diese Pose nach!" 🎯                                │
│                                                             │
│       [Silhouette einer Pose]                              │
│                                                             │
│  ⏱️ 5... 4... 3... 2... 1... 📸                           │
│                                                             │
│  AI vergleicht: "92% Übereinstimmung! �"                 │
│                                                             │
│  Posen:                                                    │
│  🦸 Superheld     🕺 Dab          🚢 Titanic              │
│  🏃 Usain Bolt    🧘 Yoga         💪 Bodybuilder          │
│  👯 Duo-Pose      🎭 Freeze       🤳 Selfie-Pose          │
│                                                             │
│  Highscore-Liste: Wer trifft die Pose am besten?          │
└─────────────────────────────────────────────────────────────┘
```

**Technisch:**
- MediaPipe Pose Detection (33 Körperpunkte)
- Vergleich mit Referenz-Pose
- Score basierend auf Winkel-Übereinstimmung
- Leaderboard pro Event

---

### 2.7 Sprechblase / Meme Generator

```
┌─────────────────────────────────────────────────────────────┐
│  "Was denkst du gerade?" 💭                                │
│                                                             │
│  [Dein Foto mit Sprechblase]                               │
│                                                             │
│  Optionen:                                                 │
│  ○ Selbst tippen (Touch-Keyboard)                         │
│  ○ AI generiert basierend auf Gesichtsausdruck:           │
│     → 😍 "Als ich den Kuchen sah..."                      │
│     → 😩 "Montag um 8 Uhr..."                             │
│     → 🤔 "Wenn du merkst dass..."                         │
│                                                             │
│  Styles:                                                   │
│  💬 Klassisch    💭 Gedankenblase    📢 Schrei            │
│  ❤️ Herz         💥 Comic            🎵 Gesang             │
│                                                             │
│  → Instant Meme zum Teilen!                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.8 Mystery Box

```
┌─────────────────────────────────────────────────────────────┐
│  "Öffne die Mystery Box!" 🎁                               │
│                                                             │
│  [Animierte Box die sich öffnet]                          │
│                                                             │
│  Mögliche Inhalte:                                         │
│  🎰 Glücksrad           (20%)                              │
│  🔮 Fortuna Session     (15%)                              │
│  🎭 Zufälliger Filter   (30%)                              │
│  🎯 Challenge           (20%)                              │
│  ⏳ Zeitreise-Foto      (10%)                              │
│  💎 LEGENDÄRER Filter   (5%)  ← Super selten!             │
│                                                             │
│  "Du hast den REGENBOGEN-EINHORN Filter bekommen!"        │
│                                                             │
│  [Nochmal?] → Nur 1x pro Besuch                           │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.9 Requisiten Roulette

```
┌─────────────────────────────────────────────────────────────┐
│  "Welche Requisite bekommst du?" 🎭                        │
│                                                             │
│  [Rad dreht sich]                                          │
│                                                             │
│  Physische Requisiten (falls vorhanden):                   │
│  🎩 Zylinder      👓 Riesenbrille    🎭 Maske              │
│  👑 Krone         🎀 Schleife        🕶️ Sonnenbrille       │
│                                                             │
│  ODER digitale AR-Requisiten:                              │
│  🎩 AR-Hut        👑 AR-Krone        🎭 AR-Maske           │
│                                                             │
│  "Du musst den ZYLINDER tragen für dein Foto!"            │
│                                                             │
│  [Zeigt wo Requisite liegt / aktiviert AR-Filter]         │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.10 Slot Machine

```
┌─────────────────────────────────────────────────────────────┐
│  "Zieh am Hebel!" 🎰                                       │
│                                                             │
│     ┌─────┬─────┬─────┐                                    │
│     │ 🎭 │ 📸 │ 🎭 │  ← Slots drehen sich                 │
│     └─────┴─────┴─────┘                                    │
│                                                             │
│  Kombinationen:                                            │
│  🎭🎭🎭 = Geheimer VIP Filter                              │
│  📸📸📸 = Gratis Druck (falls Drucker vorhanden)          │
│  🎁🎁🎁 = Mystery Überraschung                             │
│  🔮🔮🔮 = Gratis Fortuna Session                           │
│  ⭐⭐⭐ = JACKPOT! Alle Filter freigeschaltet              │
│  Mix    = Normaler zufälliger Filter                       │
│                                                             │
│  [Tippe zum Stoppen / Auto-Stop nach 3 Sek]               │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.11 Emotions Roulette

```
┌─────────────────────────────────────────────────────────────┐
│  "Zeig mir diese Emotion!" 🎭                              │
│                                                             │
│  [Rad dreht sich und stoppt auf:]                         │
│                                                             │
│  😱 SCHOCK    😍 VERLIEBT    🤔 VERWIRRT                  │
│  😤 WÜTEND    🥺 TRAURIG     🤪 VERRÜCKT                  │
│  😎 COOL      🤩 BEGEISTERT  😏 FLIRTY                    │
│                                                             │
│  "Zeig mir: SCHOCK! 😱"                                   │
│                                                             │
│  [3 Sekunden Zeit - FOTO!]                                │
│                                                             │
│  AI bewertet: "92% Schock erkannt! PERFEKT!"              │
│  (face-api.js Emotion Detection)                          │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.12 Mini-Games

#### � "Wo ist der Ball?" (Shell Game)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     "Finde den Ball! 👀"                                   │
│                                                             │
│     ┌─────┐    ┌─────┐    ┌─────┐                         │
│     │ 🥤 │    │ 🥤 │    │ 🥤 │                           │
│     └─────┘    └─────┘    └─────┘                         │
│                                                             │
│     [Animation: Becher mischen]                            │
│                                                             │
│     Tippe auf den richtigen!                               │
│                                                             │
│     ✅ Richtig! → Spezial-Filter freigeschaltet           │
│     ❌ Falsch!  → Nochmal versuchen                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 🎰 Glücksrad

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     "Dreh das Glücksrad! 🎰"                               │
│                                                             │
│           ╭─────────────╮                                  │
│          ╱   VINTAGE    ╲                                  │
│         │    CARTOON     │                                 │
│         │  ▶ NEON ◀     │ ← Zeiger                        │
│         │    RETRO       │                                 │
│          ╲   GLAMOUR    ╱                                  │
│           ╰─────────────╯                                  │
│                                                             │
│     [Tippen zum Drehen]                                    │
│                                                             │
│     Ergebnis: Du bekommst den NEON Filter! 🎉             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 🎯 Reaktionstest

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     "Wie schnell bist du? ⚡"                              │
│                                                             │
│     Tippe wenn der Kreis GRÜN wird!                        │
│                                                             │
│              ┌───────┐                                     │
│              │  🔴   │  ← Wechselt zu 🟢                  │
│              └───────┘                                     │
│                                                             │
│     Deine Zeit: 0.234 Sekunden! 🏆                         │
│     Top 10 heute: Platz 3!                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 🎵 Musik-Quiz

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     "Erkennst du den Song? 🎵"                             │
│                                                             │
│     [▶ Spielt 5 Sekunden ab]                               │
│                                                             │
│     A) "Dancing Queen" - ABBA                              │
│     B) "Stayin' Alive" - Bee Gees                          │
│     C) "I Will Survive" - Gloria Gaynor                    │
│     D) "Billie Jean" - Michael Jackson                     │
│                                                             │
│     ✅ Richtig! Hier ist dein Disco-Filter! 🕺            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.4 Gamification System

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 DEINE ACHIEVEMENTS                          [3/12]     │
│  ┌─────────────────────────────────────────────────────────┤
│  │                                                          │
│  │  ✅ Newcomer           → Erstes Foto gemacht            │
│  │  ✅ Socializer         → Foto mit 3+ Personen           │
│  │  ✅ Fortune Seeker     → Fortuna AI befragt             │
│  │  ⬜ Party Animal       → 5x am Booth gewesen            │
│  │  ⬜ Filter Master      → Alle Filter ausprobiert        │
│  │  ⬜ Speed Demon        → Reaktionstest < 0.2s           │
│  │  ⬜ Music Expert       → 5 Songs richtig erraten        │
│  │  ⬜ Lucky Winner       → Jackpot beim Glücksrad         │
│  │  ⬜ VIP                 → Foto mit Brautpaar            │
│  │  ⬜ Collector          → 10 verschiedene Filter         │
│  │  ⬜ Night Owl          → Foto nach Mitternacht          │
│  │  ⬜ Legend             → Alle Achievements!             │
│  │                                                          │
│  └─────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

**Belohnungen:**
- Achievements → Spezial-Filter/Overlays freischalten
- Highscores → Leaderboard auf Live-Wall
- Badges → Im Foto einblenden optional

---

## 3. Idle-Modus (Attract Screen)

Wenn niemand vor dem Booth steht:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     [Wechselt alle 10 Sekunden]                            │
│                                                             │
│     🔮 "Wage es, deine Zukunft zu erfahren..."            │
│        [Fortuna Animation]                                 │
│                                                             │
│     📸 "Mach ein Foto mit deinen Freunden!"               │
│        [Slideshow der besten Event-Fotos]                  │
│                                                             │
│     🎮 "Teste deine Reaktion - bist du schnell genug?"    │
│        [Mini-Game Preview]                                 │
│                                                             │
│     🏆 "Sarah hat gerade 'Party Animal' erreicht!"        │
│        [Live Achievement Feed]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Person erkannt → Wechsel zu Welcome Screen**

---

## 4. Hauptmenü (nach Erkennung)

```
┌─────────────────────────────────────────────────────────────┐
│                    MIRROR DISPLAY                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │   "Hey [Name/du]! Was möchtest du machen?"         │   │
│  │                                                     │   │
│  │   ┌──────────────┐  ┌──────────────┐              │   │
│  │   │              │  │              │              │   │
│  │   │   📸 FOTO    │  │  🔮 FORTUNA  │              │   │
│  │   │              │  │              │              │   │
│  │   └──────────────┘  └──────────────┘              │   │
│  │                                                     │   │
│  │   ┌──────────────┐  ┌──────────────┐              │   │
│  │   │              │  │              │              │   │
│  │   │  🎮 SPIELE   │  │  🏆 RANKING  │              │   │
│  │   │              │  │              │              │   │
│  │   └──────────────┘  └──────────────┘              │   │
│  │                                                     │   │
│  │   [Wiederkehrend: 🎯 DEINE CHALLENGE wartet!]      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Technische Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    BOOTH HARDWARE                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Mirror Display (Kapazitiver Touch)                 │   │
│  │  ├── Browser im Kiosk-Modus (Chromium)             │   │
│  │  └── WebSocket-Verbindung zu gaestefotos.com       │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Sony ZV-E10 (USB-Webcam + High-Res Capture)       │   │
│  │  ├── USB-Streaming Modus für Live-Preview          │   │
│  │  ├── Face Detection via face-api.js/MediaPipe      │   │
│  │  ├── AR Filter Rendering via WebGL                 │   │
│  │  └── Remote Capture für High-Res Fotos             │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Optional: LED-Ring, Drucker, Roboter-Arm          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    GÄSTEFOTOS.COM BACKEND                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Face Embeddings (Event-Scope, 24h Retention)      │   │
│  │  Achievement/Gamification State                     │   │
│  │  AI Services (GPT-4, TTS, Image Generation)        │   │
│  │  Foto-Storage (SeaweedFS)                          │   │
│  │  Real-time Updates (WebSocket)                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LIVE WALL / GALERIE                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Achievement Feed ("Sarah hat 'VIP' erreicht!")    │   │
│  │  Leaderboard (Reaktionstest Highscores)            │   │
│  │  Foto-Stream (Live neue Fotos)                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Datenmodell

```typescript
// Face Embedding für Wiedererkennung
interface EventFaceEmbedding {
  id: string;
  eventId: string;
  embedding: number[];        // 128-dim Vektor
  visitCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  completedChallenges: string[];
  unlockedFilters: string[];
  achievements: string[];
  gameScores: {
    reactionTest?: number;    // Beste Zeit in ms
    quizCorrect?: number;     // Anzahl richtige Antworten
  };
  // Auto-Delete 24h nach Event
  expiresAt: Date;
}

// Challenge-Definition
interface Challenge {
  id: string;
  type: 'photo_with_people' | 'use_filter' | 'find_person' | 'facial_expression';
  title: string;
  description: string;
  requirement: {
    minPeople?: number;
    filterId?: string;
    personRole?: 'bride' | 'groom' | 'any';
    expression?: 'smile' | 'surprised' | 'duckface';
  };
  reward: {
    filterId?: string;
    achievementId?: string;
    points?: number;
  };
  triggerOnVisit: number;     // Bei welchem Besuch zeigen
}

// Achievement-Definition
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: {
    type: 'visit_count' | 'challenge_count' | 'filter_count' | 'game_score' | 'time_based';
    value: number;
  };
  reward?: {
    filterId?: string;
    badgeOverlay?: string;
  };
}
```

---

## 7. Kosten pro Event

| Feature | Kosten pro Nutzung | Bei 100 Nutzungen |
|---------|-------------------|-------------------|
| Face Detection | €0 (Client-Side) | €0 |
| Face Embedding | €0 (face-api.js) | €0 |
| Fortuna AI (GPT-4 + TTS) | ~€0.05 | €5 |
| AI Filter (StylePop etc.) | ~€0.03 | €3 |
| Mini-Games | €0 (Client-Side) | €0 |
| **TOTAL** | | **~€8-15 pro Event** |

vs. Foto Master: €150-200/Monat

---

## 8. Implementierungs-Roadmap

### Phase 1: Basis-Booth (2-3 Wochen)
- [ ] Kiosk-Web-App (Vollbild-Browser)
- [ ] Webcam-Integration (Face Detection)
- [ ] DSLR-Trigger (gPhoto2)
- [ ] Basis Foto-Flow
- [ ] Upload zu gaestefotos.com

### Phase 2: Wiedererkennung (1-2 Wochen)
- [ ] Face Embedding speichern/matchen
- [ ] Visit-Counter
- [ ] Challenge-System
- [ ] Basis-Challenges (3-5 Stück)

### Phase 3: Fortuna AI (1 Woche)
- [ ] Touch-Erkennung (5 Finger)
- [ ] GPT-4 Vision Integration
- [ ] TTS für Fortune
- [ ] Fortuna Video-Assets erstellen
- [ ] Mystisches Portrait generieren

### Phase 4: Mini-Games (1-2 Wochen)
- [ ] Glücksrad
- [ ] Wo ist der Ball
- [ ] Reaktionstest
- [ ] Musik-Quiz (optional)

### Phase 5: Gamification (1 Woche)
- [ ] Achievement-System
- [ ] Leaderboard
- [ ] Live-Wall Integration
- [ ] Filter-Freischaltung

### Phase 6: Polish (1 Woche)
- [ ] Idle/Attract Screen
- [ ] Animationen & Sounds
- [ ] Performance-Optimierung
- [ ] Testing auf Hardware

**Geschätzte Gesamtzeit:** 8-12 Wochen

---

## 9. Hardware-Setup

### 9.1 Mirror Booth: 65" Magic Mirror (ausgewählt)

```
┌─────────────────────────────────────────────────────────────┐
│  65" MAGIC MIRROR PHOTO BOOTH                              │
│  Hersteller: Shenzhen Mingtai Weiye (WIVIKIOSK)           │
│                                                             │
│     ┌─────────────────────────┐                            │
│     │   LED FILL LIGHT (48W)  │  ← Weißes Panel oben      │
│     │   12V 5050 LEDs, 612 Beads                          │
│     └─────────────────────────┘                            │
│                                                             │
│     ┌─────────────────────────────────────────────────┐    │
│     │                                                 │    │
│     │            65" MIRROR GLASS                     │    │
│     │                                                 │    │
│     │         ┌───────┐                               │    │
│     │         │ 📷    │  ← KAMERA-LOCH im Spiegel    │    │
│     │         │ZV-E10 │    (Kamera eingelassen)      │    │
│     │         └───────┘                               │    │
│     │                                                 │    │
│     │   ┌─────────────────────────────────────┐      │    │
│     │   │      43" TOUCH DISPLAY              │      │    │
│     │   │      FHD 1920x1080, 700cd/m²        │      │    │
│     │   │      10-Punkt Kapazitiv Touch       │      │    │
│     │   └─────────────────────────────────────┘      │    │
│     │                                                 │    │
│     │         RGB ATMOSPHERE LEDS (36W)              │    │
│     │         5050 RGB, IC 1903                      │    │
│     └─────────────────────────────────────────────────┘    │
│                                                             │
│  Maße: 685mm x 1545mm x 70mm                               │
│  Gewicht: 48kg (+ Flightcase = 96kg)                       │
│  Flightcase: 165 x 30 x 89 cm                              │
└─────────────────────────────────────────────────────────────┘
```

**Inkludierte Specs:**
- Display: 43" BOE FHD, 700cd/m², 1200:1 Kontrast
- Touch: 10-Punkt kapazitiv, 4mm Glas
- Fill Light: 48W weiß LED (oben)
- Atmosphere: 36W RGB LED (Rahmen)
- PC: i5-4310M ⚠️ **(zu schwach für AR - Upgrade nötig!)**
- OS: Windows 10 Pro
- Software: DslrBooth (wird ersetzt durch eigene Web-App)

---

### 9.2 Mini-PC Upgrade (ERFORDERLICH für AR-Features)

Der inkludierte i5-4310M (2014) ist **zu schwach** für MediaPipe/AR-Filter!

#### Empfohlene Mini-PCs

| Modell | CPU | RAM | Preis | Für AR |
|--------|-----|-----|-------|--------|
| **Beelink S12 Pro** | Intel N100 | 16GB | ~€180 | ⭐⭐⭐ OK |
| **Beelink SER5** | Ryzen 5 5560U | 16GB | ~€280 | ⭐⭐⭐⭐ Gut |
| **Minisforum UM560** | Ryzen 5 5625U | 16GB | ~€350 | ⭐⭐⭐⭐⭐ Sehr gut |
| **Intel NUC 12** | i5-1240P | 16GB | ~€450 | ⭐⭐⭐⭐⭐ Excellent |

**Empfehlung:** 
- **Budget:** Beelink SER5 (~€280) - Ryzen 5 für flüssige AR
- **Optimal:** Minisforum UM560 (~€350) - Beste Preis-Leistung

```
┌─────────────────────────────────────────────────────────────┐
│  MINI-PC ANFORDERUNGEN                                     │
│                                                             │
│  Minimum:                                                  │
│  • 4+ Kerne                                                │
│  • 16GB RAM                                                │
│  • USB 3.0 (für ZV-E10)                                   │
│  • HDMI (für 43" Display)                                 │
│  • Windows 10/11 oder Linux                               │
│                                                             │
│  Für AR-Filter:                                            │
│  • Ryzen 5 oder Intel i5 (12th Gen+)                      │
│  • Integrierte GPU mit OpenGL 3.0+                        │
│  • SSD für schnellen Start                                │
└─────────────────────────────────────────────────────────────┘
```

---

### 9.3 Kamera: Sony ZV-E10 (vorhanden)

```
┌─────────────────────────────────────────────────────────────┐
│  SONY ZV-E10 - Perfekt für Photo Booth!                    │
│                                                             │
│  ✅ APS-C Sensor (26MP, gutes Bokeh)                       │
│  ✅ USB-Webcam Modus eingebaut (kein Capture Card nötig!)  │
│  ✅ Wechselobjektive (E-Mount)                             │
│  ✅ Eye-AF / Face Detection                                │
│  ✅ Flip-Screen für Monitoring                             │
│  ✅ 4K Video                                               │
│  ✅ Compact - passt ins Kamera-Loch des Booths            │
│                                                             │
│  Setup:                                                    │
│  MENU → Netzwerk → Streaming → USB-Streaming: Ein          │
│  → Kamera erscheint als Webcam im Browser!                 │
│  → Live-Preview + Face Detection + AR Filter               │
│  → Bei Foto-Trigger: High-Res Capture via Remote API       │
└─────────────────────────────────────────────────────────────┘
```

#### Empfohlene Objektive

| Objektiv | Preis | Verwendung | Für Booth |
|----------|-------|------------|-----------|
| Kit 16-50mm f/3.5-5.6 | (dabei) | Flexibel, gut für Start | ⭐⭐⭐⭐ |
| **Sony E 35mm f/1.8 OSS** | €350 | Portraits, gutes Bokeh | ⭐⭐⭐⭐ |
| **Sigma 16mm f/1.4 DC DN** | €350 | Weitwinkel + Bokeh | ⭐⭐⭐⭐⭐ |
| Sigma 30mm f/1.4 DC DN | €300 | Scharf, gutes Bokeh | ⭐⭐⭐⭐ |

**Empfehlung für 65" Booth:**
- **Starte mit Kit 16-50mm** - teste verschiedene Brennweiten
- Position ist fix (~1.5-2m Abstand zum Gast)
- Wenn Gruppen zu eng: **Sigma 16mm f/1.4** (Weitwinkel + super Bokeh)
- Wenn nur Portraits: **Sony 35mm f/1.8** (cremiges Bokeh)

#### Kamera-Zubehör

| Komponente | Preis | Status |
|------------|-------|--------|
| Dummy-Akku (NP-FW50 AC-Adapter) | €35 | Nötig für Dauerbetrieb |
| USB-C Kabel (3m, hochwertig) | €15 | Nötig |
| **Gesamt Zubehör** | **~€50** | |

---

### 9.4 LED Panel (Optional - für bessere Ausleuchtung)

Die eingebauten 48W LEDs reichen aus, aber für **professionellere Ergebnisse**:

#### Empfohlene LED Panels

| Modell | Leistung | CRI | Preis | Empfehlung |
|--------|----------|-----|-------|------------|
| **Neewer 660 LED** | 40W | 96+ | ~€80 | Budget ⭐⭐⭐⭐ |
| **Godox SL60W** | 60W | 95+ | ~€120 | Preis-Leistung ⭐⭐⭐⭐⭐ |
| **Aputure Amaran 100d** | 100W | 95+ | ~€200 | Pro ⭐⭐⭐⭐⭐ |
| **Godox SL100D** | 100W | 96+ | ~€180 | Pro Value ⭐⭐⭐⭐⭐ |

```
┌─────────────────────────────────────────────────────────────┐
│  WANN BRAUCHST DU EIN EXTRA LED PANEL?                     │
│                                                             │
│  ❌ NICHT NÖTIG wenn:                                      │
│     • Nur 1-3 Personen                                     │
│     • Du f/1.8 Objektiv verwendest                         │
│     • ISO 800-1600 akzeptabel ist                          │
│                                                             │
│  ✅ EMPFOHLEN wenn:                                        │
│     • Große Gruppen (5+)                                   │
│     • Professionelle Hautfarben wichtig (CRI 95+)         │
│     • ISO unter 400 gewünscht (weniger Rauschen)          │
│     • Drucker verwendet wird (Print braucht Qualität)     │
│                                                             │
│  POSITION:                                                 │
│     • 45° von oben, leicht seitlich                       │
│     • Ergänzt die eingebaute Top-LED                      │
│     • Softbox/Diffusor für weicheres Licht               │
└─────────────────────────────────────────────────────────────┘
```

---

### 9.5 Hardware-Einkaufsliste (komplett)

| Komponente | Preis | Status |
|------------|-------|--------|
| **Bereits vorhanden:** | | |
| Sony ZV-E10 + Kit-Objektiv | - | ✅ Vorhanden |
| | | |
| **Booth (Kern):** | | |
| 65" Magic Mirror Booth | ~€2.500-4.000 | Kaufen |
| Mini-PC (Beelink SER5 / UM560) | €280-350 | Kaufen (Upgrade!) |
| ZV-E10 Zubehör (Akku, Kabel) | €50 | Kaufen |
| | | |
| **Optional (Upgrade):** | | |
| Objektiv Sigma 16mm f/1.4 | €350 | Optional |
| LED Panel (Godox SL60W) | €120 | Optional |
| Drucker (DNP DS620) | €500-800 | Optional |
| Roboter-Arm (Draw Me Bot) | €400-800 | Optional |

#### Kosten-Übersicht

| Setup | Kosten | Enthält |
|-------|--------|---------|
| **Minimum** | ~€2.900-4.500 | Booth + Mini-PC + Zubehör |
| **Empfohlen** | ~€3.400-5.000 | + Sigma 16mm f/1.4 + LED Panel |
| **Premium** | ~€4.500-6.500 | + Drucker + Roboter-Arm |

---

## 10. Rechtliches

### DSGVO-Compliance
- ✅ Face Embeddings nur Event-Scope
- ✅ Automatische Löschung 24h nach Event
- ✅ Kein Cross-Event Tracking
- ✅ Host ist Verantwortlicher (wir = Auftragsverarbeiter)
- ✅ Transparente Info im Setup (Host sieht Feature)

### Nutzungsbedingungen
- Host aktiviert interaktiven Modus bewusst
- Mustertext für Aushang/Einladung bereitstellen
- AVV (Auftragsverarbeitungsvertrag) mit Hosts

---

*Konzept erstellt: 2026-01-29*
*Status: Bereit für Hardware-Beschaffung und Entwicklungs-Start*
