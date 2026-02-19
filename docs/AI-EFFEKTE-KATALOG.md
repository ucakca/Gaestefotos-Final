# AI-Effekte Katalog — gästefotos.com

> Stand: Februar 2026 | Basierend auf Competitor-Analyse, Trend-Research & eigenen Ideen

---

## 1. BILD-EFFEKTE (Image-to-Image)

### Bereits implementiert ✅ (Backend + Frontend + Prompts in DB)

| Effekt | Feature-Key | Provider | Guest-UI | Credits |
|--------|-------------|----------|----------|---------|
| Ölgemälde | `style_transfer:oil-painting` | Replicate | StyleTransferModal | 5 |
| Aquarell | `style_transfer:watercolor` | Replicate | StyleTransferModal | 5 |
| Pop Art | `style_transfer:pop-art` | Replicate | StyleTransferModal | 5 |
| Bleistiftzeichnung | `style_transfer:sketch` | Replicate | StyleTransferModal | 5 |
| Cartoon | `style_transfer:cartoon` | Replicate | StyleTransferModal | 5 |
| Vintage Retro | `style_transfer:vintage` | Replicate | StyleTransferModal | 5 |
| Cyberpunk | `style_transfer:cyberpunk` | Replicate | StyleTransferModal | 5 |
| Renaissance | `style_transfer:renaissance` | Replicate | StyleTransferModal | 5 |
| Anime | `style_transfer:anime` | Replicate | StyleTransferModal | 5 |
| Neon Glow | `style_transfer:neon-glow` | Replicate | StyleTransferModal | 5 |
| AI Karikatur | `style_transfer:caricature` | Replicate | StyleTransferModal | 5 |
| Magazine Cover | `style_transfer:magazine-cover` | Replicate | StyleTransferModal | 5 |
| Comic Book Hero | `style_transfer:comic-hero` | Replicate | StyleTransferModal | 5 |
| Lego Minifig | `style_transfer:lego` | Replicate | StyleTransferModal | 5 |
| Claymation | `style_transfer:claymation` | Replicate | StyleTransferModal | 5 |
| Neon Cyberpunk Portrait | `style_transfer:neon-portrait` | Replicate | StyleTransferModal | 5 |
| Barbie / Ken Doll | `style_transfer:barbie` | Replicate | StyleTransferModal | 5 |
| Studio Ghibli | `style_transfer:ghibli` | Replicate | StyleTransferModal | 5 |
| AI Headshot | `style_transfer:headshot` | Replicate | StyleTransferModal | 5 |
| Stained Glass | `style_transfer:stained-glass` | Replicate | StyleTransferModal | 5 |
| Ukiyo-e | `style_transfer:ukiyo-e` | Replicate | StyleTransferModal | 5 |
| **Oldify / Aging** | `ai_oldify` | Replicate | **AiEffectsModal** | 4 |
| **Pixar 3D Cartoon** | `ai_cartoon` | Replicate | **AiEffectsModal** | 4 |
| **Style Pop** | `ai_style_pop` | Replicate | **AiEffectsModal** | 4 |

### Neue Bild-Effekte (MEDIUM Priority) 🟡

| Effekt | Feature-Key | Beschreibung | Provider | Status |
|--------|-------------|-------------|----------|--------|
| **Face Swap** | `face_switch` | Gesichter tauschen (InsightFace/ReActor) | Replicate | Backend ✅, Guest-UI fehlt |
| **BG Removal** | `bg_removal` | Hintergrund entfernen (remove.bg API) | remove.bg | Backend ✅, Guest-UI fehlt |
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

### Bereits implementiert ✅

| Effekt | Feature-Key | Beschreibung | Guest-UI | Status |
|--------|-------------|-------------|----------|--------|
| **GIF Face Morph** | `gif_morph` | 5 Frames: Orig → Style1 → Style2 → Style1 → Orig | **AiEffectsModal** | ✅ Backend + Frontend |
| **Aging GIF** | `gif_aging` | Bounce-GIF: Orig → 30 → 50 → 70 → 90 → 70 → 50 → 30 → Orig | **AiEffectsModal** | ✅ Backend + Frontend |

### Noch nicht implementiert

| Effekt | Feature-Key | Beschreibung | Implementierung | Priority |
|--------|-------------|-------------|-----------------|----------|
| **Style Carousel GIF** | `gif_style_carousel` | 5 verschiedene Styles als animiertes Karussell | 5 Style-Transfers → GIF | 🟡 MEDIUM |
| **Glitch Transition** | `gif_glitch` | Glitch-Übergang zwischen Original und Style | Sharp.js Pixel-Manipulation → GIF | 🟡 MEDIUM |
| **Zoom Reveal** | `gif_zoom_reveal` | Reinzoomen ins Gesicht → Style erscheint | Crop-Sequence + Style overlay | 🟢 LOW |
| **Before/After Wipe** | `gif_before_after` | Wischeffekt Original ↔ Styled | 2 Frames + CSS/Canvas wipe | 🟡 MEDIUM |
| **Bobblehead** | `gif_bobblehead` | Wackelkopf-Animation aus Selfie | Face Detection + Head Wobble | 🟢 LOW |
| **Living Portrait** | `gif_living_portrait` | Harry-Potter-Style lebendiges Portrait | Replicate (SadTalker/LivePortrait) | 🟡 MEDIUM |

---

## 3. VIDEO-EFFEKTE (Image-to-Video)

### Bereits implementiert ✅

| Effekt | Feature-Key | Provider | Guest-UI | Credits |
|--------|-------------|----------|----------|---------|
| **AI Video** (Image-to-Video) | `ai_video` | Runway (gen4_turbo) / LumaAI (ray2) | **AiEffectsModal** (8 Presets) | 10 |
| **Event Highlight Reel** | `highlight_reel` | ffmpeg (lokal) | Host-Dashboard | 10 |

### Noch nicht implementiert

| Effekt | Feature-Key | Beschreibung | Provider | Priority | Credits |
|--------|-------------|-------------|----------|----------|---------|
| **Selfie → Cyberpunk Scene** | `video_cyberpunk` | Foto wird lebendig in Cyberpunk-Welt | Runway/LumaAI (prompt) | � MEDIUM | 10 |
| **Time Travel Video** | `video_time_travel` | Person "reist" durch Epochen | Runway/LumaAI (prompt) | 🟡 MEDIUM | 10 |
| **Dancing Photo** | `video_dancing` | Foto fängt an zu tanzen | Replicate (SadTalker) | 🟡 MEDIUM | 8 |
| **Talking Photo** | `video_talking` | Foto "spricht" einen Text | Replicate (SadTalker/Wav2Lip) | 🟡 MEDIUM | 8 |
| **Cinemagraph** | `video_cinemagraph` | Teilweise animiertes Standbild | Replicate (Stable Video) | 🟢 LOW | 8 |

---

## 4. TEXT-KI-EFFEKTE (LLM-basiert)

### Bereits implementiert ✅ (Backend + Prompts in DB + Guest-UI)

| Effekt | Feature-Key | Provider | Guest-UI | Credits |
|--------|-------------|----------|----------|---------|
| KI Chat-Assistent | `chat` | Groq | AIChatPanel | 1 |
| Album-Vorschläge | `album_suggest` | Groq | Dashboard | 1 |
| Event-Beschreibung | `description_suggest` | Groq | Dashboard | 1 |
| Einladungstext | `invitation_suggest` | Groq | Dashboard | 1 |
| Challenge-Ideen | `challenge_suggest` | Groq | Dashboard | 1 |
| Gästebuch-Nachricht | `guestbook_suggest` | Groq | Dashboard | 1 |
| Farbschema | `color_scheme` | Groq | Dashboard | 1 |
| **Caption Generator** | `caption_suggest` | Groq | **AiGamesModal** | 1 |
| **Compliment Mirror** | `compliment_mirror` | Groq | **AiGamesModal** | 2 |
| **AI Fortune Teller** | `fortune_teller` | Groq | **AiGamesModal** | 2 |
| **AI Roast** | `ai_roast` | Groq | **AiGamesModal** | 2 |
| **Persona Quiz** | `persona_quiz` | Groq | **AiGamesModal** (3 Fragen → Quiz) | 2 |
| **Hochzeitsrede** | `wedding_speech` | Groq | **AiGamesModal** (Brautpaar + Rolle) | 3 |
| **Story Generator** | `ai_stories` | Groq | **AiGamesModal** (3 Wörter → Geschichte) | 2 |
| **Promi-Doppelgänger** | `celebrity_lookalike` | Groq | **AiGamesModal** (Ähnlichkeit% + Fun Fact) | 2 |
| **Foto-Bingo** | `ai_bingo` | Groq | **AiGamesModal** (3x3 Grid + Bonus) | 1 |
| **AI DJ** | `ai_dj` | Groq | **AiGamesModal** (Stimmung → 5 Songs) | 1 |
| **Meme Generator** | `ai_meme` | Groq | **AiGamesModal** (3 Meme-Captions + Template) | 1 |
| **Party Awards** | `ai_superlatives` | Groq | **AiGamesModal** (5 "Am ehesten..." Awards) | 1 |
| **Foto-Kritiker** | `ai_photo_critic` | Groq | **AiGamesModal** (Sterne + Kunstkritik) | 1 |
| **Couple Match** | `ai_couple_match` | Groq | **AiGamesModal** (match_input → Score + Ship-Name) | 2 |

---

## 5. FOTO-SPIELE (Game-Prompts)

### Bereits implementiert ✅

| Spiel | ChallengeType / GameType | Beschreibung | Guest-UI |
|-------|--------------------------|-------------|----------|
| Photobomb | `PHOTOBOMB` | Schmuggle dich in Fotos anderer | ChallengesTab |
| Cover-Shooting | `COVER_SHOOT` | Magazin-Cover nachstellen | ChallengesTab |
| Emoji Challenge | `EMOJI_CHALLENGE` | Emoji-Gesichter nachstellen | BottomNav |
| Filter Roulette | `FILTER_ROULETTE` | Zufälliger KI-Effekt | BottomNav |
| **Compliment Mirror** | `compliment_mirror` | KI-Kompliment nach Selfie | **AiGamesModal** |
| **Fortune Teller** | `fortune_teller` | Witzige KI-Zukunftsvorhersage | **AiGamesModal** |
| **AI Roast** | `ai_roast` | Liebevoller Comedy-Roast | **AiGamesModal** |
| Mystery Overlay | `mystery_overlay` | Blind posieren + Overlay | Backend only |

### Neue Spiele (noch nicht implementiert) 🔴

| Spiel | ChallengeType | Beschreibung | KI-Nutzung |
|-------|--------------|-------------|------------|
| ~~AI Trading Card~~ | ~~TRADING_CARD~~ | ~~Selfie → Trading Card~~ | ✅ AiEffectsModal |
| ~~Time Machine~~ | ~~TIME_MACHINE~~ | ~~5 Jahrzehnte (60s-2000s)~~ | ✅ AiEffectsModal (decade_select) |
| ~~Celebrity Lookalike~~ | ~~CELEB_LOOKALIKE~~ | ~~Promi-Vergleich~~ | ✅ AiGamesModal |
| ~~Pet Me~~ | ~~PET_ME~~ | ~~Tier-Transformation~~ | ✅ AiEffectsModal |
| ~~Yearbook~~ | ~~YEARBOOK~~ | ~~90er Yearbook-Foto~~ | ✅ AiEffectsModal |
| ~~AI Bingo~~ | ~~AI_BINGO~~ | ~~Foto-Aufgaben-Bingo~~ | ✅ AiGamesModal |

---

## 6. IMPLEMENTIERUNGS-REIHENFOLGE

### Sprint 1 — Quick Wins ✅ DONE (19. Feb 2026)
1. ~~14 neue Style Transfer Prompts seeden~~ → 40 Prompts in DB ✅
2. ~~AI Fortune Teller als Foto-Spiel~~ → AiGamesModal ✅
3. ~~Oldify / Aging als Style-Effekt~~ → AiEffectsModal ✅
4. ~~AI Roast als Foto-Spiel~~ → AiGamesModal ✅
5. ~~Compliment Mirror Guest-UI~~ → AiGamesModal ✅
6. ~~Auto-Setup Button~~ → One-Click Provider-Mapping + Prompt-Seeding ✅

### Sprint 2 — ✅ DONE (19. Feb 2026)
7. ~~GIF Face Morph~~ → AiEffectsModal (5 Frames, gif-encoder-2) ✅
8. ~~Face Swap Guest-UI~~ → AiEffectsModal ✅
9. ~~BG Removal Guest-UI~~ → AiEffectsModal ✅
10. ~~Caption Generator Guest-UI~~ → AiGamesModal ✅
11. ~~AI Video (Image-to-Video)~~ → AiEffectsModal (Runway/LumaAI Polling) ✅
12. ~~24 Style-Transfer-Stile~~ (von 10 auf 24 erweitert) ✅

### Sprint 3 — ✅ DONE (19. Feb 2026)
13. ~~Aging GIF~~ → AiEffectsModal (Bounce-GIF: Orig→30→50→70→90→70→50→30→Orig) ✅
14. ~~Video-Presets~~ → 8 Stile (Cinematic, Cyberpunk, Zeitreise, Superhero, Unterwasser, Märchen, Weltraum, Disco) ✅
15. ~~Persona Quiz~~ → AiGamesModal (3 Fragen → KI-Persönlichkeitsanalyse) ✅

### Sprint 4 — ✅ DONE (19. Feb 2026)
16. ~~Wedding Speech~~ → AiGamesModal (Brautpaar + Rolle → Rede + Trinkspruch) ✅
17. ~~AI Stories~~ → AiGamesModal (3 Wörter → Titel + Geschichte + Genre) ✅
18. ~~AI Trading Cards~~ → AiEffectsModal (Canvas + LLM-Stats: Charisma, Humor, Dance, Style, Energy) ✅

### Sprint 5 — ✅ DONE (19. Feb 2026)
19. ~~Time Machine~~ → AiEffectsModal (5 Jahrzehnte: 60s/70s/80s/90s/2000s, decade_select Step) ✅
20. ~~Pet Me~~ → AiEffectsModal (Tier-Transformation via img2img) ✅
21. ~~Yearbook~~ → AiEffectsModal (90er Yearbook-Foto via img2img) ✅
22. ~~Celebrity Lookalike~~ → AiGamesModal (LLM Promi-Vergleich mit Ähnlichkeit% + Fun Fact) ✅
23. ~~AI Bingo~~ → AiGamesModal (3x3 Foto-Aufgaben-Bingo + Bonus-Aufgabe) ✅
24. ~~AI DJ~~ → AiGamesModal (mood_input → 5 Songs + DJ-Name + Vibe) ✅

### Sprint 6 — ✅ DONE (19. Feb 2026)
25. ~~Emoji Me~~ → AiEffectsModal (Emoji-Avatar via img2img SDXL) ✅
26. ~~Miniature~~ → AiEffectsModal (Tilt-Shift Miniatur-Effekt) ✅
27. ~~Meme Generator~~ → AiGamesModal (3 Captions mit Template-Namen) ✅
28. ~~Party Awards~~ → AiGamesModal (5 "Am ehesten..." Awards) ✅
29. ~~Foto-Kritiker~~ → AiGamesModal (Sterne-Rating + Kunstkritik + Technik) ✅
30. ~~Couple Match~~ → AiGamesModal (match_input → Score + Ship-Name + Song) ✅

### Sprint 7 — Nächste Schritte
31. **AI Group Theme** (Multi-Face Processing)

---

## 7. PROVIDER-KONFIGURATION (aktiv)

| Provider | Typ | Model | Features | Status |
|----------|-----|-------|----------|--------|
| **Groq** | LLM | llama-3.3-70b | 11 Features (Chat, Games, Suggest) | ✅ aktiv |
| **Grok/xAI** | LLM | grok-3-mini | ai_categorize | ✅ aktiv |
| **Replicate** | IMAGE_GEN | SDXL | 6 Features (Style Transfer, Effekte) | ✅ aktiv |
| **Stability AI** | IMAGE_GEN | SDXL | Backup | ✅ aktiv |
| **remove.bg** | IMAGE_GEN | — | bg_removal | ✅ aktiv |
| **Runway** | VIDEO_GEN | gen4_turbo | highlight_reel | ✅ aktiv |
| **LumaAI** | VIDEO_GEN | ray2 | Backup | ✅ aktiv |

### Kosten/Request

| Effekt-Typ | Primär | Fallback | Kosten/Request |
|------------|--------|----------|----------------|
| Style Transfer (img2img) | **Replicate** (SDXL) | Stability AI | ~$0.03 |
| Face Swap | **Replicate** (InsightFace) | — | ~$0.05 |
| BG Removal | **remove.bg** | Replicate (BRIA) | ~$0.02 |
| Aging/Cartoon | **Replicate** (SDXL) | Stability AI | ~$0.04 |
| Video Generation | **Runway** (gen4_turbo) | LumaAI (ray2) | ~$0.15-0.30 |
| LLM Text | **Groq** (Llama 3.3) | Grok → OpenAI | ~$0.001 |
| GIF Assembly | **Lokal** (Sharp.js + gifenc) | — | $0 |
| Face Recognition | **Lokal** (WASM) | — | $0 |

---

> *Letzte Aktualisierung: 19. Februar 2026 — Sprint 6 abgeschlossen (14 Effekte + 14 Spiele + 24 Stile + 8 Video-Presets + 5 Jahrzehnt-Presets)*
