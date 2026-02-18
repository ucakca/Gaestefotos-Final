# AI-Effekte Katalog — gästefotos.com

> Stand: Februar 2026 | Basierend auf Competitor-Analyse, Trend-Research & eigenen Ideen

---

## 1. BILD-EFFEKTE (Image-to-Image)

### Bereits implementiert ✅

| Effekt | Feature-Key | Provider | Prompt-Typ | Credits |
|--------|-------------|----------|------------|---------|
| Ölgemälde | `style_transfer:oil-painting` | Stability AI / Replicate | img2img | 5 |
| Aquarell | `style_transfer:watercolor` | Stability AI / Replicate | img2img | 5 |
| Pop Art | `style_transfer:pop-art` | Stability AI / Replicate | img2img | 5 |
| Bleistiftzeichnung | `style_transfer:sketch` | Stability AI / Replicate | img2img | 5 |
| Cartoon | `style_transfer:cartoon` | Stability AI / Replicate | img2img | 5 |
| Vintage Retro | `style_transfer:vintage` | Stability AI / Replicate | img2img | 5 |
| Cyberpunk | `style_transfer:cyberpunk` | Stability AI / Replicate | img2img | 5 |
| Renaissance | `style_transfer:renaissance` | Stability AI / Replicate | img2img | 5 |
| Anime | `style_transfer:anime` | Stability AI / Replicate | img2img | 5 |
| Neon Glow | `style_transfer:neon-glow` | Stability AI / Replicate | img2img | 5 |

### Neue Bild-Effekte (HIGH Priority) 🔴

| Effekt | Feature-Key | Prompt | Negative Prompt | Strength | Provider |
|--------|-------------|--------|-----------------|----------|----------|
| **Oldify / Aging** | `ai_oldify` | aged elderly version, wrinkles, grey hair, realistic aging, same person 40 years older | young, smooth skin, child, cartoon | 0.65 | Replicate (SDXL) |
| **Pixar 3D Cartoon** | `ai_cartoon` | pixar style 3d cartoon character, animated movie, colorful, expressive | realistic, photograph, blurry | 0.75 | Replicate (SDXL) |
| **Style Pop** | `ai_style_pop` | vibrant pop art, bold colors, warhol inspired, high contrast, modern portrait | dull, muted, black and white | 0.70 | Stability AI |
| **AI Karikatur** | `style_transfer:caricature` | exaggerated caricature drawing, big head, small body, humorous, colorful, professional caricature artist style | realistic, photograph, normal proportions | 0.75 | Replicate |
| **Magazine Cover** | `style_transfer:magazine-cover` | professional magazine cover photo, glamorous lighting, high fashion, vogue style, dramatic pose, editorial photography | amateur, casual, low quality | 0.55 | Stability AI |
| **Comic Book Hero** | `style_transfer:comic-hero` | marvel comic book style, bold outlines, halftone dots, dynamic pose, superhero comic panel, vibrant colors | photograph, realistic, muted | 0.70 | Replicate |
| **Lego Minifig** | `style_transfer:lego` | lego minifigure version of person, plastic toy, yellow skin, simple features, lego world background | realistic, photograph, detailed | 0.80 | Replicate |
| **Claymation** | `style_transfer:claymation` | stop motion claymation character, wallace and gromit style, plasticine texture, warm lighting | photograph, realistic, digital | 0.75 | Replicate |
| **Neon Cyberpunk Portrait** | `style_transfer:neon-portrait` | cyberpunk neon portrait, dark background, vibrant neon lights reflecting on skin, futuristic, blade runner aesthetic | daylight, natural, flat lighting | 0.65 | Stability AI |
| **Barbie / Ken Doll** | `style_transfer:barbie` | barbie doll version, perfect plastic skin, glossy, pink background, toy box aesthetic, fashion doll | realistic, wrinkles, natural skin | 0.75 | Replicate |
| **Studio Ghibli** | `style_transfer:ghibli` | studio ghibli anime style, miyazaki inspired, soft watercolor, dreamy atmosphere, detailed background, spirited away aesthetic | realistic, photograph, dark, gritty | 0.70 | Replicate |
| **AI Headshot** | `style_transfer:headshot` | professional linkedin headshot, studio lighting, clean background, business attire, confident expression | casual, blurry, dark, amateur | 0.50 | Stability AI |
| **Stained Glass** | `style_transfer:stained-glass` | stained glass window art style, vibrant colored glass pieces, black lead lines, church window, backlit | photograph, realistic, modern | 0.75 | Stability AI |
| **Ukiyo-e / Japanese Woodblock** | `style_transfer:ukiyo-e` | ukiyo-e japanese woodblock print style, flat colors, wave patterns, traditional japanese art | photograph, 3d, modern, digital | 0.70 | Replicate |

### Neue Bild-Effekte (MEDIUM Priority) 🟡

| Effekt | Feature-Key | Beschreibung | Provider |
|--------|-------------|-------------|----------|
| **Face Swap** | `face_switch` | Gesichter tauschen (InsightFace/ReActor) | Replicate |
| **BG Removal** | `bg_removal` | Hintergrund entfernen (remove.bg API) | remove.bg |
| **AI Group Theme** | `ai_group_theme` | Gruppenfoto → alle im gleichen Stil | Replicate (multi-face) |
| **Trading Card** | `ai_trading_card` | Selfie → personalisierte Sammelkarte mit Stats | Template + img2img |
| **Film Poster** | `style_transfer:film-poster` | Als Filmplakat (Action, Horror, Romance) | Stability AI |
| **Mosaic Portrait** | `style_transfer:mosaic` | Portrait aus vielen kleinen Fotos | Custom (Sharp.js) |
| **Double Exposure** | `style_transfer:double-exposure` | Doppelbelichtungs-Effekt | Stability AI |
| **Glitch Art** | `style_transfer:glitch` | Digitaler Glitch/Datamosh-Effekt | Custom (Sharp.js) |
| **Low Poly** | `style_transfer:low-poly` | Geometrisches Low-Poly Portrait | Replicate |
| **Vaporwave** | `style_transfer:vaporwave` | 80er Retro Vaporwave Aesthetic | Replicate |

---

## 2. GIF-EFFEKTE (Animated)

| Effekt | Feature-Key | Beschreibung | Implementierung | Priority |
|--------|-------------|-------------|-----------------|----------|
| **Face Morph GIF** | `gif_face_morph` | Gesicht morpht zwischen 2 Styles (z.B. Normal → Cartoon → Normal) | 3 Frames: Original + 2 Styles → GIF | 🔴 HIGH |
| **Aging GIF** | `gif_aging` | Zeigt Alterungsprozess als Animation (20→40→60→80 Jahre) | 4 Frames verschiedene Strengths → GIF | 🔴 HIGH |
| **Style Carousel GIF** | `gif_style_carousel` | 5 verschiedene Styles als animiertes Karussell | 5 Style-Transfers → GIF | 🟡 MEDIUM |
| **Glitch Transition** | `gif_glitch` | Glitch-Übergang zwischen Original und Style | Sharp.js Pixel-Manipulation → GIF | 🟡 MEDIUM |
| **Zoom Reveal** | `gif_zoom_reveal` | Reinzoomen ins Gesicht → Style erscheint | Crop-Sequence + Style overlay | 🟢 LOW |
| **Before/After Wipe** | `gif_before_after` | Wischeffekt Original ↔ Styled | 2 Frames + CSS/Canvas wipe | 🟡 MEDIUM |
| **Bobblehead** | `gif_bobblehead` | Wackelkopf-Animation aus Selfie | Face Detection + Head Wobble | 🟢 LOW |
| **Living Portrait** | `gif_living_portrait` | Harry-Potter-Style lebendiges Portrait | Replicate (SadTalker/LivePortrait) | 🟡 MEDIUM |

---

## 3. VIDEO-EFFEKTE (Image-to-Video)

| Effekt | Feature-Key | Beschreibung | Provider | Priority | Credits |
|--------|-------------|-------------|----------|----------|---------|
| **Selfie → Cyberpunk Scene** | `video_cyberpunk` | Foto wird lebendig in Cyberpunk-Welt | Replicate (Kling/SVD) | 🔴 HIGH | 10 |
| **Time Travel Video** | `video_time_travel` | Person "reist" durch Epochen (50er→Zukunft) | Replicate (Kling) | 🔴 HIGH | 10 |
| **Selfie → Superhero Intro** | `video_superhero` | Dramatisches Superhero-Intro aus Selfie | Replicate (Kling) | 🟡 MEDIUM | 10 |
| **Dancing Photo** | `video_dancing` | Foto fängt an zu tanzen | Replicate (SadTalker) | 🟡 MEDIUM | 8 |
| **Talking Photo** | `video_talking` | Foto "spricht" einen Text | Replicate (SadTalker/Wav2Lip) | 🟡 MEDIUM | 8 |
| **Event Highlight Reel** | `highlight_reel` | Automatisches Best-of-Video aus Event-Fotos | ffmpeg + AI Sorting | 🔴 HIGH | 10 |
| **Cinemagraph** | `video_cinemagraph` | Teilweise animiertes Standbild (z.B. Haare wehen) | Replicate (Stable Video) | 🟢 LOW | 8 |
| **AI Music Video** | `video_music` | Fotos zu Musik-Slideshow mit Effekten | ffmpeg + Transition AI | 🟢 LOW | 15 |

---

## 4. TEXT-KI-EFFEKTE (LLM-basiert)

### Bereits implementiert ✅

| Effekt | Feature-Key | Provider | Credits |
|--------|-------------|----------|---------|
| KI Chat-Assistent | `chat` | Groq | 1 |
| Album-Vorschläge | `album_suggest` | Groq | 1 |
| Event-Beschreibung | `description_suggest` | Groq | 1 |
| Einladungstext | `invitation_suggest` | Groq | 1 |
| Challenge-Ideen | `challenge_suggest` | Groq | 1 |
| Gästebuch-Nachricht | `guestbook_suggest` | Groq | 1 |
| Farbschema | `color_scheme` | Groq | 1 |
| Compliment Mirror | `compliment_mirror` | Groq | 2 |

### Neue Text-Effekte 🔴

| Effekt | Feature-Key | Beschreibung | Prompt-Idee | Credits |
|--------|-------------|-------------|-------------|---------|
| **AI Fortune Teller** | `fortune_teller` | Witzige Zukunftsvorhersage basierend auf Selfie-Beschreibung | "Du bist eine mystische Wahrsagerin auf einer Party. Gib eine lustige Vorhersage..." | 2 |
| **AI Roast** | `ai_roast` | Liebevoller Comedy-Roast des Gastes | "Du bist ein Stand-Up-Comedian. Roaste den Gast liebevoll und witzig..." | 2 |
| **Persona Quiz** | `persona_quiz` | "Welcher Typ bist du?" basierend auf Antworten | "Basierend auf den Antworten, generiere eine lustige Persona mit Titel und Beschreibung..." | 2 |
| **Wedding Speech** | `wedding_speech` | KI generiert eine kurze, lustige Hochzeitsrede | "Schreibe eine kurze, witzige Rede für die Hochzeit von {{names}}..." | 3 |
| **AI Stories** | `ai_stories` | Gast gibt 3 Wörter → KI generiert Mini-Geschichte | "Schreibe eine lustige 3-Satz-Geschichte die {{word1}}, {{word2}} und {{word3}} enthält..." | 2 |
| **Caption Generator** | `caption_suggest` | Social-Media Caption für Event-Foto | "Generiere 3 Instagram-Captions für ein Foto von {{eventType}}..." | 1 |
| **AI DJ** | `ai_dj_suggest` | Musikvorschläge basierend auf Event-Stimmung | "Schlage 5 Songs vor die zur Stimmung von {{eventType}} passen..." | 1 |

---

## 5. FOTO-SPIELE (Game-Prompts)

### Bereits implementiert ✅

| Spiel | ChallengeType | Beschreibung |
|-------|--------------|-------------|
| Photobomb | `PHOTOBOMB` | Schmuggle dich in Fotos anderer |
| Cover-Shooting | `COVER_SHOOT` | Magazin-Cover nachstellen |
| Emoji Challenge | `EMOJI_CHALLENGE` | Emoji-Gesichter nachstellen |
| Filter Roulette | `FILTER_ROULETTE` | Zufälliger KI-Effekt |

### Neue Spiele 🔴

| Spiel | ChallengeType | Beschreibung | KI-Nutzung |
|-------|--------------|-------------|------------|
| **AI Trading Card Battle** | `TRADING_CARD` | Selfie → Trading Card → Vergleiche Stats mit anderen Gästen | img2img + LLM Stats |
| **Fortune Teller** | `FORTUNE_TELLER` | Selfie → KI gibt lustige Zukunftsvorhersage | LLM + Style Transfer |
| **AI Roast Battle** | `ROAST_BATTLE` | 2 Gäste → KI roastet beide liebevoll | LLM |
| **Time Machine** | `TIME_MACHINE` | Selfie → "So sahst du in den 80ern aus" | img2img Decades |
| **Celebrity Lookalike** | `CELEB_LOOKALIKE` | "Du siehst aus wie..." → Ähnlichkeit in % | Face Recognition + LLM |
| **Pet Me** | `PET_ME` | Selfie → KI verwandelt dich in ein Tier | img2img |
| **Yearbook** | `YEARBOOK` | Selfie → 90er/2000er Yearbook-Foto | img2img |
| **AI Bingo** | `AI_BINGO` | Foto-Aufgaben-Bingo (z.B. "Foto mit DJ") | LLM generiert Aufgaben |
| **Mystery Overlay** | `MYSTERY_OVERLAY` | Blind posieren + zufälliger Overlay/Frame | Template |

---

## 6. IMPLEMENTIERUNGS-REIHENFOLGE

### Sprint 1 — Quick Wins (1-2 Wochen)
1. **14 neue Style Transfer Prompts** in PromptTemplate-DB seeden (nur Prompts, kein Code)
2. **AI Fortune Teller** als neues Foto-Spiel
3. **AI Trading Cards** als Template-basiertes Feature
4. **Oldify / Aging** als Style-Effekt
5. **GIF: Face Morph** (3 Frames → GIF)

### Sprint 2 — Medium Effort (2-4 Wochen)
6. **Face Swap** via Replicate InsightFace
7. **AI Caricature** neue Modell-Kategorie
8. **GIF: Aging Animation** (4 Frames)
9. **Magazine Cover** Template-Overlay
10. **AI Roast** als Foto-Spiel

### Sprint 3 — Major Features (4-8 Wochen)
11. **AI Video Booth** (Selfie → Cyberpunk/Time Travel Video)
12. **Event Highlight Reel** (Automatisches Best-of-Video)
13. **AI Group Theme** (Multi-Face Processing)
14. **Persona Quiz** mit AI Portrait

---

## 7. PROVIDER-EMPFEHLUNG PRO EFFEKT-TYP

| Effekt-Typ | Primär | Fallback | Kosten/Request |
|------------|--------|----------|----------------|
| Style Transfer (img2img) | **Stability AI** (SDXL) | Replicate (SDXL) | ~$0.03 |
| Face Swap | **Replicate** (InsightFace) | — | ~$0.05 |
| BG Removal | **remove.bg** | Replicate (BRIA) | ~$0.02 |
| Aging/Cartoon | **Replicate** (spezialisierte Modelle) | Stability AI | ~$0.04 |
| Video Generation | **Replicate** (Kling/SVD) | — | ~$0.15-0.30 |
| LLM Text | **Groq** (Llama 3.3) | Grok → OpenAI | ~$0.001 |
| GIF Assembly | **Lokal** (Sharp.js + gifenc) | — | $0 |
| Face Recognition | **Lokal** (WASM) | — | $0 |

---

> *Letzte Aktualisierung: 18. Februar 2026*
