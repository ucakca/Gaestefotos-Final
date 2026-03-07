# ComfyUI Custom Workflows

Jeder Style-Effect kann seinen eigenen ComfyUI Workflow haben.

## Workflow hinzufügen

1. Öffne den **ComfyUI Node Editor** (RunPod Pod)
2. Erstelle/importiere einen Workflow
3. Klicke **"Save (API Format)"** → speichert als JSON
4. Benenne die Datei nach dem Effect: `{effect_name}.json`
5. Lege sie in diesen Ordner

## Verfügbare Effect-Namen

| Dateiname | Effect |
|-----------|--------|
| `ai_cartoon.json` | Cartoon |
| `ai_oldify.json` | Aging/Oldify |
| `ai_style_pop.json` | Pop Art |
| `neon_noir.json` | Cyberpunk/Neon Noir |
| `anime.json` | Anime |
| `watercolor.json` | Watercolor |
| `oil_painting.json` | Oil Painting |
| `sketch.json` | Pencil Sketch |
| `renaissance.json` | Renaissance |
| `comic_book.json` | Comic Book |
| `pixel_art.json` | Pixel Art |
| `yearbook.json` | 90s Yearbook |
| `pet_me.json` | Pet Me (Animal) |
| `emoji_me.json` | Emoji Avatar |
| `miniature.json` | Tilt-Shift |
| `trading_card.json` | Trading Card |
| `time_machine.json` | Time Machine |

## Platzhalter in Workflows

Nutze diese Platzhalter in deinem Workflow-JSON — sie werden automatisch ersetzt:

| Platzhalter | Wird ersetzt mit |
|-------------|-----------------|
| `{{INPUT_IMAGE}}` | Dateiname des hochgeladenen Bildes |
| `{{PROMPT}}` | Style-Prompt aus STYLE_PROMPTS |
| `{{NEG_PROMPT}}` | Negative Prompt |
| `{{STRENGTH}}` | Denoise-Stärke (0.0-1.0) |
| `{{SEED}}` | Zufälliger Seed |
| `{{STEPS}}` | Anzahl Schritte |
| `{{WIDTH}}` | Ausgabe-Breite |
| `{{HEIGHT}}` | Ausgabe-Höhe |

## Beispiel

Wenn du einen Cartoon-Workflow erstellst und als `ai_cartoon.json` speicherst,
wird beim nächsten "Cartoon" Request automatisch DIESER Workflow verwendet
statt dem generischen Flux img2img.

Falls kein custom Workflow existiert → Fallback auf generisches Flux img2img mit Prompt.
