"""
Studio API — standalone AI tools, fully independent.
Works out-of-the-box with local Ollama (llava + llama3.2).
Optional: fal.ai key for image effects/generation, remove.bg for BG removal.
"""
import base64
import json
import os
import httpx
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/studio", tags=["studio"])

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", "llava:7b")
OLLAMA_TEXT_MODEL = os.getenv("OLLAMA_TEXT_MODEL", "llama3.2:3b")

# ── helpers ──────────────────────────────────────────────────────────────────

def _get_key(provider: str) -> Optional[str]:
    """Load stored API key from DB."""
    try:
        from core.database import get_db
        db = get_db()
        row = db.execute(
            "SELECT key_value FROM api_keys WHERE provider=? AND is_active=1",
            (provider,)
        ).fetchone()
        if not row:
            return None
        val = row[0]
        # decrypt if needed
        try:
            from cryptography.fernet import Fernet
            secret = os.getenv("ENCRYPTION_KEY", "")
            if secret:
                f = Fernet(secret.encode() if isinstance(secret, str) else secret)
                val = f.decrypt(val.encode()).decode()
        except Exception:
            pass
        return val
    except Exception:
        return None


async def _ollama_chat(model: str, messages: list, images: list = None) -> str:
    payload = {"model": model, "messages": messages, "stream": False}
    if images:
        payload["messages"][-1]["images"] = images
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        r.raise_for_status()
        return r.json()["message"]["content"]


# ── tool catalog ─────────────────────────────────────────────────────────────

TEXT_TOOLS = {
    "caption":       "Generate an engaging image caption for social media.",
    "alt_text":      "Write descriptive, SEO-friendly alt text for an image.",
    "instagram":     "Write an Instagram post (caption + 10 relevant hashtags).",
    "linkedin":      "Write a professional LinkedIn post.",
    "tweet":         "Write a punchy tweet under 280 characters.",
    "blog_intro":    "Write an engaging blog introduction paragraph.",
    "blog_outline":  "Create a structured blog post outline with H2/H3 headers.",
    "email_subject": "Generate 5 compelling email subject lines.",
    "seo_meta":      "Write an SEO meta title (60 chars) and meta description (155 chars).",
    "product_desc":  "Write a compelling product description.",
    "press_release": "Write a press release opening paragraph.",
    "roast":         "Write a funny, light-hearted roast.",
    "tagline":       "Generate 5 creative taglines/slogans.",
    "cold_email":    "Write a personalized cold outreach email.",
    "faq":           "Generate 5 frequently asked questions with answers.",
}

IMAGE_EFFECTS = [
    "cartoon", "anime", "watercolor", "oil_painting", "sketch",
    "neon_noir", "vintage", "pop_art", "pencil_drawing", "renaissance",
]


@router.get("/tools")
async def list_tools():
    """List all available Studio tools and their status."""
    fal_key = _get_key("fal.ai")
    removebg_key = _get_key("remove.bg")
    openai_key = _get_key("openai")
    groq_key = _get_key("groq")

    return {
        "text_tools": list(TEXT_TOOLS.keys()),
        "image_analysis": True,
        "image_effects": {
            "available": bool(fal_key),
            "effects": IMAGE_EFFECTS,
            "requires": "fal.ai API key",
        },
        "image_generation": {
            "available": bool(fal_key),
            "requires": "fal.ai API key",
        },
        "background_removal": {
            "available": bool(removebg_key),
            "requires": "remove.bg API key",
        },
        "providers": {
            "ollama": True,
            "openai": bool(openai_key),
            "groq": bool(groq_key),
        }
    }


# ── Image Analysis ────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    question: str = Form(default="Describe this image in detail. What do you see?"),
):
    """Analyze / describe an image using local Ollama llava (free, no API key needed)."""
    data = await file.read()
    b64 = base64.b64encode(data).decode()

    try:
        answer = await _ollama_chat(
            OLLAMA_VISION_MODEL,
            [{"role": "user", "content": question}],
            images=[b64],
        )
        return {"result": answer, "model": OLLAMA_VISION_MODEL}
    except Exception as e:
        raise HTTPException(500, f"Vision model error: {e}")


@router.post("/caption-from-image")
async def caption_from_image(
    file: UploadFile = File(...),
    style: str = Form(default="instagram"),
    language: str = Form(default="English"),
):
    """Upload an image, get back a ready-to-use social media caption."""
    data = await file.read()
    b64 = base64.b64encode(data).decode()

    prompt = (
        f"Look at this image and write a {style} post in {language}. "
        f"Make it engaging, natural, and include relevant hashtags if applicable."
    )
    try:
        result = await _ollama_chat(
            OLLAMA_VISION_MODEL,
            [{"role": "user", "content": prompt}],
            images=[b64],
        )
        return {"result": result, "style": style, "language": language}
    except Exception as e:
        raise HTTPException(500, f"Error: {e}")


# ── Text Tools ────────────────────────────────────────────────────────────────

class TextToolRequest(BaseModel):
    tool: str
    input: str
    language: str = "English"
    tone: str = "professional"
    extra: Optional[str] = None


@router.post("/text")
async def run_text_tool(req: TextToolRequest):
    """Run any text generation tool using local Ollama or a configured LLM."""
    if req.tool not in TEXT_TOOLS:
        raise HTTPException(400, f"Unknown tool '{req.tool}'. Available: {list(TEXT_TOOLS.keys())}")

    instruction = TEXT_TOOLS[req.tool]
    system = (
        f"You are an expert copywriter and content strategist. "
        f"Tone: {req.tone}. Language: {req.language}. "
        f"Be concise, creative, and output only the requested content without explanations."
    )
    user_msg = f"{instruction}\n\nInput/Context:\n{req.input}"
    if req.extra:
        user_msg += f"\n\nAdditional instructions: {req.extra}"

    try:
        # Try a premium provider first if available
        groq_key = _get_key("groq")
        openai_key = _get_key("openai")

        if groq_key:
            result = await _call_groq(groq_key, system, user_msg)
        elif openai_key:
            result = await _call_openai(openai_key, system, user_msg)
        else:
            result = await _ollama_chat(
                OLLAMA_TEXT_MODEL,
                [{"role": "system", "content": system},
                 {"role": "user", "content": user_msg}]
            )
        return {"result": result, "tool": req.tool}
    except Exception as e:
        raise HTTPException(500, f"Text tool error: {e}")


async def _call_groq(api_key: str, system: str, user_msg: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_msg},
                ],
                "max_tokens": 1024,
            }
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


async def _call_openai(api_key: str, system: str, user_msg: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_msg},
                ],
                "max_tokens": 1024,
            }
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


# ── Image Effects (fal.ai) ────────────────────────────────────────────────────

class ImageEffectRequest(BaseModel):
    image_base64: str
    effect: str
    strength: float = 0.75


EFFECT_PROMPTS = {
    "cartoon":        "cartoon style, vibrant colors, bold outlines, animated movie style",
    "anime":          "anime style, Japanese animation, Studio Ghibli inspired",
    "watercolor":     "watercolor painting, soft brushstrokes, artistic, pastel tones",
    "oil_painting":   "oil painting, thick brushstrokes, classical art style, painterly",
    "sketch":         "pencil sketch, detailed line art, charcoal drawing style",
    "neon_noir":      "neon cyberpunk, dark background, glowing neon colors, futuristic",
    "vintage":        "vintage photo, aged film effect, sepia tones, 1970s style",
    "pop_art":        "Andy Warhol pop art style, bold flat colors, halftone dots",
    "pencil_drawing": "realistic pencil drawing, black and white, detailed shading",
    "renaissance":    "Renaissance oil painting style, classical portrait, museum quality",
}


@router.post("/effect")
async def apply_image_effect(req: ImageEffectRequest):
    """Apply style effect to an image using fal.ai FLUX img2img."""
    fal_key = _get_key("fal.ai")
    if not fal_key:
        raise HTTPException(402, "fal.ai API key required. Add it in Settings → API Keys.")

    if req.effect not in EFFECT_PROMPTS:
        raise HTTPException(400, f"Unknown effect. Available: {list(EFFECT_PROMPTS.keys())}")

    prompt = EFFECT_PROMPTS[req.effect]

    try:
        # Submit job
        async with httpx.AsyncClient(timeout=120) as client:
            submit = await client.post(
                "https://queue.fal.run/fal-ai/flux/dev/image-to-image",
                headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                json={
                    "image_url": f"data:image/jpeg;base64,{req.image_base64}",
                    "prompt": prompt,
                    "strength": req.strength,
                    "num_inference_steps": 28,
                    "guidance_scale": 3.5,
                }
            )
            submit.raise_for_status()
            data = submit.json()

            # Poll for result
            status_url = data.get("status_url")
            response_url = data.get("response_url")

            if not status_url:
                # Synchronous response
                images = data.get("images", [])
                return {"result": images[0]["url"] if images else None, "effect": req.effect}

            for _ in range(60):
                import asyncio
                await asyncio.sleep(2)
                status_r = await client.get(status_url, headers={"Authorization": f"Key {fal_key}"})
                status_data = status_r.json()
                if status_data.get("status") in ("COMPLETED", "FAILED"):
                    break

            if status_data.get("status") == "FAILED":
                raise HTTPException(500, "fal.ai processing failed")

            result_r = await client.get(response_url, headers={"Authorization": f"Key {fal_key}"})
            result = result_r.json()
            images = result.get("images", [])
            return {"result": images[0]["url"] if images else None, "effect": req.effect}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Image effect error: {e}")


# ── Image Generation (fal.ai FLUX) ───────────────────────────────────────────

class ImageGenRequest(BaseModel):
    prompt: str
    style: str = "photo"
    width: int = 1024
    height: int = 1024
    steps: int = 4


STYLE_SUFFIXES = {
    "photo":       "photorealistic, high quality, 8K",
    "illustration":"digital illustration, colorful, detailed",
    "painting":    "oil painting, artistic, museum quality",
    "cartoon":     "cartoon style, animated, vibrant",
    "minimalist":  "minimalist design, clean, simple",
    "cinematic":   "cinematic photography, dramatic lighting, film still",
}


@router.post("/generate")
async def generate_image(req: ImageGenRequest):
    """Generate an image from a text prompt using fal.ai FLUX Schnell."""
    fal_key = _get_key("fal.ai")
    if not fal_key:
        raise HTTPException(402, "fal.ai API key required. Add it in Settings → API Keys.")

    suffix = STYLE_SUFFIXES.get(req.style, "")
    full_prompt = f"{req.prompt}, {suffix}" if suffix else req.prompt

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            submit = await client.post(
                "https://queue.fal.run/fal-ai/flux/schnell",
                headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
                json={
                    "prompt": full_prompt,
                    "image_size": {"width": req.width, "height": req.height},
                    "num_inference_steps": req.steps,
                    "num_images": 1,
                }
            )
            submit.raise_for_status()
            data = submit.json()

            status_url = data.get("status_url")
            response_url = data.get("response_url")

            if not status_url:
                images = data.get("images", [])
                return {"result": images[0]["url"] if images else None, "prompt": full_prompt}

            for _ in range(60):
                import asyncio
                await asyncio.sleep(2)
                sr = await client.get(status_url, headers={"Authorization": f"Key {fal_key}"})
                sd = sr.json()
                if sd.get("status") in ("COMPLETED", "FAILED"):
                    break

            rr = await client.get(response_url, headers={"Authorization": f"Key {fal_key}"})
            result = rr.json()
            images = result.get("images", [])
            return {"result": images[0]["url"] if images else None, "prompt": full_prompt}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Image generation error: {e}")


# ── Background Removal (remove.bg) ───────────────────────────────────────────

@router.post("/remove-bg")
async def remove_background(file: UploadFile = File(...)):
    """Remove image background using remove.bg API."""
    removebg_key = _get_key("remove.bg")
    if not removebg_key:
        raise HTTPException(402, "remove.bg API key required. Add it in Settings → API Keys.")

    data = await file.read()
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                "https://api.remove.bg/v1.0/removebg",
                headers={"X-Api-Key": removebg_key},
                files={"image_file": (file.filename, data, file.content_type)},
                data={"size": "auto"},
            )
            r.raise_for_status()
            result_b64 = base64.b64encode(r.content).decode()
            return {"result": f"data:image/png;base64,{result_b64}"}
    except Exception as e:
        raise HTTPException(500, f"Background removal error: {e}")
