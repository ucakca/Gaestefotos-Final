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
| Caption Generator | `caption_suggest` | Groq | Prompt ready | 1 |
| **Compliment Mirror** | `compliment_mirror` | Groq | **AiGamesModal** | 2 |
| **AI Fortune Teller** | `fortune_teller` | Groq | **AiGamesModal** | 2 |
| **AI Roast** | `ai_roast` | Groq | **AiGamesModal** | 2 |

### Neue Text-Effekte (noch nicht implementiert) 🔴

| Effekt | Feature-Key | Beschreibung | Credits |
|--------|-------------|-------------|---------|
| **Persona Quiz** | `persona_quiz` | "Welcher Typ bist du?" basierend auf Antworten | 2 |
| **Wedding Speech** | `wedding_speech` | KI generiert eine kurze, lustige Hochzeitsrede | 3 |
| **AI Stories** | `ai_stories` | Gast gibt 3 Wörter → KI generiert Mini-Geschichte | 2 |
| **AI DJ** | `ai_dj_suggest` | Musikvorschläge basierend auf Event-Stimmung | 1 |

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
| **AI Trading Card Battle** | `TRADING_CARD` | Selfie → Trading Card → Vergleiche Stats | img2img + LLM Stats |
| **Time Machine** | `TIME_MACHINE` | Selfie → "So sahst du in den 80ern aus" | img2img Decades |
| **Celebrity Lookalike** | `CELEB_LOOKALIKE` | "Du siehst aus wie..." → Ähnlichkeit in % | Face Recognition + LLM |
| **Pet Me** | `PET_ME` | Selfie → KI verwandelt dich in ein Tier | img2img |
| **Yearbook** | `YEARBOOK` | Selfie → 90er/2000er Yearbook-Foto | img2img |
| **AI Bingo** | `AI_BINGO` | Foto-Aufgaben-Bingo | LLM generiert Aufgaben |

---

## 6. IMPLEMENTIERUNGS-REIHENFOLGE

### Sprint 1 — Quick Wins ✅ DONE (19. Feb 2026)
1. ~~14 neue Style Transfer Prompts seeden~~ → 40 Prompts in DB ✅
2. ~~AI Fortune Teller als Foto-Spiel~~ → AiGamesModal ✅
3. ~~Oldify / Aging als Style-Effekt~~ → AiEffectsModal ✅
4. ~~AI Roast als Foto-Spiel~~ → AiGamesModal ✅
5. ~~Compliment Mirror Guest-UI~~ → AiGamesModal ✅
6. ~~Auto-Setup Button~~ → One-Click Provider-Mapping + Prompt-Seeding ✅

### Sprint 2 — Nächste Schritte
7. **GIF: Face Morph** (3 Frames → GIF)
8. **Face Swap Guest-UI** (Backend ready, InsightFace via Replicate)
9. **BG Removal Guest-UI** (Backend ready, remove.bg)
10. **AI Trading Cards** als Template-basiertes Feature
11. **Caption Generator Guest-UI** (Prompt ready)

### Sprint 3 — Major Features
12. **AI Video Booth** (Selfie → Cyberpunk/Time Travel via Runway/Luma)
13. **Event Highlight Reel** (Automatisches Best-of-Video)
14. **AI Group Theme** (Multi-Face Processing)
15. **Persona Quiz** mit AI Portrait

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

> *Letzte Aktualisierung: 19. Februar 2026*
