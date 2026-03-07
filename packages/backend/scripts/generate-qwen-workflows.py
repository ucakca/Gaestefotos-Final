#!/usr/bin/env python3
"""
Generate ComfyUI API-format workflow JSONs for all style effects.
All workflows use Qwen Image Edit model with Lightning LoRA (4 steps).

This gives consistent quality across all effects with only ONE model.
"""

import json
import os

WORKFLOW_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'workflows')
os.makedirs(WORKFLOW_DIR, exist_ok=True)

# ─── Models (all FREE from HuggingFace) ────────────────────────────────────
DIFFUSION_MODEL = "qwen_image_edit_fp8_e4m3fn.safetensors"
TEXT_ENCODER = "qwen_2.5_vl_7b_fp8_scaled.safetensors"
VAE_MODEL = "qwen_image_vae.safetensors"
LIGHTNING_LORA = "Qwen-Image-Edit-Lightning-4steps-V1.0-bf16.safetensors"

# ─── Style Effect Prompts ───────────────────────────────────────────────────
# Each prompt is an INSTRUCTION to Qwen Image Edit telling it how to transform the image.
# Qwen understands natural language editing instructions very well.

STYLE_EFFECTS = {
    "ai_cartoon": {
        "prompt": "Transform this photo into a high-quality Pixar-style 3D cartoon character. Keep the person's face recognizable with the same expression, but render everything in colorful animated movie style with smooth skin, big expressive eyes, and vibrant cartoon lighting. The result should look like a frame from a Pixar or Disney animated film.",
        "description": "Pixar/Disney 3D Cartoon"
    },
    "ai_oldify": {
        "prompt": "Age this person by 40 years. Add realistic wrinkles, age spots, sagging skin, grey/white hair, and deeper facial lines. Keep the same person recognizable but make them look naturally elderly. The aging should look photorealistic, not artificial.",
        "description": "Realistic Aging +40 years"
    },
    "ai_style_pop": {
        "prompt": "Transform this photo into vibrant Andy Warhol style pop art. Use bold, saturated contrasting colors, high contrast areas, and the iconic screen-printing aesthetic. Apply bright neon color blocks and strong outlines. The result should look like a classic Warhol silkscreen print.",
        "description": "Andy Warhol Pop Art"
    },
    "neon_noir": {
        "prompt": "Transform this photo into a cyberpunk neon noir scene. Add vivid neon purple and cyan lighting, rain-slicked reflections, dark moody atmospheric lighting, and a synthwave Blade Runner aesthetic. The person should be bathed in colorful neon glow against a dark environment.",
        "description": "Cyberpunk Neon Noir"
    },
    "anime": {
        "prompt": "Convert this photo into beautiful anime art style inspired by Studio Ghibli and modern Japanese animation. Use clean cel-shaded lines, vibrant anime colors, expressive stylized eyes, and detailed anime illustration techniques. Keep the person recognizable but fully rendered in anime art style.",
        "description": "Anime / Manga Style"
    },
    "watercolor": {
        "prompt": "Transform this photo into an elegant watercolor painting. Use soft wet-on-wet technique with delicate color washes, visible paper texture, loose artistic brushstrokes, and an impressionistic quality. The result should look like a professional fine art watercolor portrait.",
        "description": "Watercolor Painting"
    },
    "oil_painting": {
        "prompt": "Convert this photo into a classical oil painting portrait in the style of Rembrandt and the Old Masters. Apply rich textured brushstrokes, warm golden lighting, deep shadows, and the impasto technique. The result should look like a museum-quality fine art painting.",
        "description": "Classical Oil Painting"
    },
    "sketch": {
        "prompt": "Transform this photo into a detailed pencil sketch drawing. Use fine graphite hatching, cross-hatching, and shading techniques. Create a high-contrast black and white artistic sketch that looks hand-drawn by a professional illustrator.",
        "description": "Pencil Sketch Drawing"
    },
    "renaissance": {
        "prompt": "Transform this portrait into an Italian Renaissance painting in the style of Leonardo da Vinci. Apply the sfumato technique, warm amber tones, classical composition, ornate period clothing, and the lighting typical of Renaissance masterpieces.",
        "description": "Renaissance Masterpiece"
    },
    "comic_book": {
        "prompt": "Convert this photo into bold Marvel/DC comic book art style. Apply strong black ink outlines, halftone dot shading, dynamic comic coloring with vibrant saturated colors, and dramatic action-hero style lighting. The result should look like a professional comic book illustration.",
        "description": "Comic Book Art"
    },
    "pixel_art": {
        "prompt": "Transform this photo into detailed 16-bit pixel art in retro video game sprite style. Use a limited color palette, visible chunky pixels, and the nostalgic SNES-era game art aesthetic. The result should look like a classic retro video game character portrait.",
        "description": "16-bit Pixel Art"
    },
    "yearbook": {
        "prompt": "Transform this photo to look like a 1990s school yearbook portrait. Add a blue gradient studio background, soft diffused flash lighting, slightly overexposed warm tones, and subtle 90s hairstyle adjustments. The result should look authentically like a vintage 90s school photo.",
        "description": "90s Yearbook Photo"
    },
    "emoji_me": {
        "prompt": "Convert this person into a cute emoji avatar in the Apple emoji style. Create a round face with simplified features, big friendly eyes, and minimal flat design. Keep the same hair color and general appearance but in adorable emoji form.",
        "description": "Emoji Avatar"
    },
    "pet_me": {
        "prompt": "Transform this person into an adorable anthropomorphic animal character version of themselves. Keep the same facial expression and pose but render them as a cute furry animal character in Pixar animation style. Choose an animal that matches their personality.",
        "description": "Cute Animal Character"
    },
    "miniature": {
        "prompt": "Apply a tilt-shift miniature effect to this photo. Add selective focus blur at top and bottom, increase color saturation to make everything look like a toy-scale diorama, and enhance the illusion that this is a photograph of a tiny model world.",
        "description": "Tilt-Shift Miniature"
    },
    "trading_card": {
        "prompt": "Transform this portrait into an epic collectible trading card character illustration. Add a dramatic holographic-style border frame, intense dramatic lighting, and render the person as a powerful hero character with epic card game art style. Keep their face recognizable.",
        "description": "Trading Card Hero"
    },
    "time_machine": {
        "prompt": "Transform this photo to look like an authentic 1980s photograph. Add film grain, slightly faded warm colors, VHS-era aesthetic, and period-appropriate styling with big hair and neon fashion elements. The result should look like a genuine photo from the 1980s.",
        "description": "80s Time Machine"
    },
}

# ─── Head/Face Swap (2 images) ──────────────────────────────────────────────

HEAD_SWAP_PROMPT = (
    "head_swap: start with Picture 1 as the base image, keeping its lighting, "
    "environment, and background. Remove the head from Picture 1 completely and "
    "replace it with the head from Picture 2. Ensure the head and body have correct "
    "anatomical proportions, and blend the skin tones, shadows, and lighting naturally "
    "so the final result appears as one coherent, realistic person."
)


def build_style_workflow(prompt: str) -> dict:
    """
    Build a ComfyUI API-format workflow for single-image style transfer.
    Uses Qwen Image Edit with Lightning LoRA (4 steps).
    """
    return {
        # 1. Load diffusion model
        "1": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": DIFFUSION_MODEL,
                "weight_dtype": "default"
            }
        },
        # 2. Load text encoder
        "2": {
            "class_type": "CLIPLoader",
            "inputs": {
                "clip_name": TEXT_ENCODER,
                "type": "qwen_image",
                "device": "default"
            }
        },
        # 3. Load VAE
        "3": {
            "class_type": "VAELoader",
            "inputs": {
                "vae_name": VAE_MODEL
            }
        },
        # 4. Load Lightning LoRA (4-step acceleration)
        "4": {
            "class_type": "LoraLoaderModelOnly",
            "inputs": {
                "model": ["1", 0],
                "lora_name": LIGHTNING_LORA,
                "strength_model": 1.0
            }
        },
        # 5. Load input image
        "5": {
            "class_type": "LoadImage",
            "inputs": {
                "image": "input_image.png"
            }
        },
        # 6. Encode prompt with image context
        "6": {
            "class_type": "TextEncodeQwenImageEdit",
            "inputs": {
                "clip": ["2", 0],
                "image": ["5", 0],
                "text": prompt
            }
        },
        # 7. Zero-out negative conditioning
        "7": {
            "class_type": "ConditioningZeroOut",
            "inputs": {
                "conditioning": ["6", 0]
            }
        },
        # 8. KSampler (4 steps with Lightning)
        "8": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["10", 0],
                "seed": 42,
                "control_after_generate": "randomize",
                "steps": 4,
                "cfg": 1.0,
                "sampler_name": "euler",
                "scheduler": "beta",
                "denoise": 1.0
            }
        },
        # 9. Decode latent to image
        "9": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["8", 0],
                "vae": ["3", 0]
            }
        },
        # 10. Encode image to latent (for img2img conditioning)
        "10": {
            "class_type": "VAEEncode",
            "inputs": {
                "pixels": ["5", 0],
                "vae": ["3", 0]
            }
        },
        # 11. Save output image
        "11": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["9", 0],
                "filename_prefix": "output"
            }
        }
    }


def build_headswap_workflow() -> dict:
    """
    Build a ComfyUI API-format workflow for head/face swap (2 images).
    Uses Qwen Image Edit Plus with Lightning LoRA.
    Picture 1 = body reference (target), Picture 2 = face reference (source).
    """
    return {
        # 1. Load diffusion model
        "1": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": DIFFUSION_MODEL,
                "weight_dtype": "default"
            }
        },
        # 2. Load text encoder
        "2": {
            "class_type": "CLIPLoader",
            "inputs": {
                "clip_name": TEXT_ENCODER,
                "type": "qwen_image",
                "device": "default"
            }
        },
        # 3. Load VAE
        "3": {
            "class_type": "VAELoader",
            "inputs": {
                "vae_name": VAE_MODEL
            }
        },
        # 4. Load Lightning LoRA
        "4": {
            "class_type": "LoraLoaderModelOnly",
            "inputs": {
                "model": ["1", 0],
                "lora_name": LIGHTNING_LORA,
                "strength_model": 1.0
            }
        },
        # 5. Load body reference image (target)
        "5": {
            "class_type": "LoadImage",
            "inputs": {
                "image": "input_image.png"
            }
        },
        # 6. Load face reference image (source)
        "6": {
            "class_type": "LoadImage",
            "inputs": {
                "image": "face_image.png"
            }
        },
        # 7. Encode prompt with both images
        "7": {
            "class_type": "TextEncodeQwenImageEditPlus",
            "inputs": {
                "clip": ["2", 0],
                "vae": ["3", 0],
                "image1": ["5", 0],
                "image2": ["6", 0],
                "text": HEAD_SWAP_PROMPT
            }
        },
        # 8. Zero-out negative conditioning
        "8": {
            "class_type": "ConditioningZeroOut",
            "inputs": {
                "conditioning": ["7", 0]
            }
        },
        # 9. Empty latent (same size as body image)
        "9": {
            "class_type": "EmptySD3LatentImage",
            "inputs": {
                "width": 1024,
                "height": 1024,
                "batch_size": 1
            }
        },
        # 10. KSampler
        "10": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["4", 0],
                "positive": ["7", 0],
                "negative": ["8", 0],
                "latent_image": ["9", 0],
                "seed": 42,
                "control_after_generate": "randomize",
                "steps": 4,
                "cfg": 1.0,
                "sampler_name": "euler",
                "scheduler": "beta",
                "denoise": 1.0
            }
        },
        # 11. Decode latent to image
        "11": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["10", 0],
                "vae": ["3", 0]
            }
        },
        # 12. Save output
        "12": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["11", 0],
                "filename_prefix": "output"
            }
        }
    }


def main():
    # Generate style effect workflows
    for effect_name, config in STYLE_EFFECTS.items():
        workflow = build_style_workflow(config["prompt"])
        filepath = os.path.join(WORKFLOW_DIR, f"{effect_name}.json")
        with open(filepath, 'w') as f:
            json.dump(workflow, f, indent=2)
        print(f"✅ {effect_name}.json — {config['description']}")

    # Generate head swap workflow
    workflow = build_headswap_workflow()
    filepath = os.path.join(WORKFLOW_DIR, "face_swap.json")
    with open(filepath, 'w') as f:
        json.dump(workflow, f, indent=2)
    print(f"✅ face_swap.json — Head/Face Swap (2 images)")

    print(f"\n📁 All workflows saved to: {WORKFLOW_DIR}")
    print(f"📊 Total: {len(STYLE_EFFECTS) + 1} workflows")
    print(f"\n🔧 Required models (ALL FREE from HuggingFace):")
    print(f"   diffusion_models/{DIFFUSION_MODEL}")
    print(f"   text_encoders/{TEXT_ENCODER}")
    print(f"   vae/{VAE_MODEL}")
    print(f"   loras/{LIGHTNING_LORA}")
    total_size = 8 + 8 + 0.1 + 2  # approximate GB
    print(f"   Total: ~{total_size:.1f} GB")


if __name__ == "__main__":
    main()
