# ─── RunPod ComfyUI Worker — gästefotos.com A6000 (48GB VRAM) ────────────────
#
# Official worker-comfyui v5.7.1 base image (clean ComfyUI, no models)
# Uses comfy-node-install + comfy model download (official tooling)
#
# Primary Model: Qwen Image Edit (instruction-based editing for ALL effects)
#   • Style Transfer  → Qwen Image Edit + Lightning LoRA (4 steps, ~3-5s)
#   • Face/Head Swap  → Qwen Image Edit Plus (2-image head swap)
#   • Face Swap       → ReActor (legacy fallback)
#   • Video Gen       → WAN 2.1 i2v (on Network Volume)
#   • InstantID       → Identity-preserving style (legacy fallback)
#
# Qwen Image Edit models (~18 GB total, baked into image):
#   • qwen_image_edit_fp8_e4m3fn.safetensors  (~8 GB)
#   • qwen_2.5_vl_7b_fp8_scaled.safetensors   (~8 GB)
#   • qwen_image_vae.safetensors              (~100 MB)
#   • Lightning-4steps LoRA                    (~2 GB)
#
# Network Volume (/runpod-volume/models/) provides:
#   • wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors  (~15 GB)
#   • umt5_xxl_fp8_e4m3fn_scaled.safetensors       (~10 GB)
#   • wan_2.1_vae.safetensors                       (~300 MB)
#
# Deploy via RunPod GitHub Integration → automatic build + deploy
# ────────────────────────────────────────────────────────────────────────────

FROM runpod/worker-comfyui:5.7.1-base

# ─── 1. Custom Nodes (via Comfy Registry) ──────────────────────────────────
RUN comfy-node-install \
      comfyui-reactor \
      comfyui_ipadapter_plus

# InstantID is not in the Comfy Registry — install from GitHub
RUN cd /comfyui/custom_nodes && \
    git clone --depth 1 https://github.com/cubiq/ComfyUI_InstantID.git && \
    cd ComfyUI_InstantID && \
    pip install --no-cache-dir -r requirements.txt 2>/dev/null || true

# ─── 2. Qwen Image Edit (ALL Style Effects + Face Swap) ──────────────
# Diffusion model (~8 GB)
RUN comfy model download \
      --url https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_edit_fp8_e4m3fn.safetensors \
      --relative-path models/diffusion_models \
      --filename qwen_image_edit_fp8_e4m3fn.safetensors

# Text encoder (~8 GB)
RUN comfy model download \
      --url https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors \
      --relative-path models/text_encoders \
      --filename qwen_2.5_vl_7b_fp8_scaled.safetensors

# VAE (~100 MB)
RUN comfy model download \
      --url https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors \
      --relative-path models/vae \
      --filename qwen_image_vae.safetensors

# Lightning 4-step LoRA (~2 GB) — speeds up inference to 4 steps
RUN comfy model download \
      --url https://huggingface.co/lightx2v/Qwen-Image-Lightning/resolve/main/Qwen-Image-Edit-Lightning-4steps-V1.0-bf16.safetensors \
      --relative-path models/loras \
      --filename Qwen-Image-Edit-Lightning-4steps-V1.0-bf16.safetensors

# Flux.1 Dev (legacy fallback for style transfer)
RUN comfy model download \
      --url https://huggingface.co/Comfy-Org/flux1-dev/resolve/main/flux1-dev-fp8.safetensors \
      --relative-path models/checkpoints \
      --filename flux1-dev-fp8.safetensors

# ─── 3. ReActor / InsightFace Models ──────────────────────────────────────
# inswapper_128.onnx — the face swap model
RUN comfy model download \
      --url https://github.com/facefusion/facefusion-assets/releases/download/models-3.0.0/inswapper_128.onnx \
      --relative-path models/insightface \
      --filename inswapper_128.onnx

# buffalo_l — face analysis (ReActor dependency)
RUN apt-get update -qq && apt-get install -y -qq unzip > /dev/null 2>&1 || true
RUN mkdir -p /root/.insightface/models/buffalo_l && \
    cd /root/.insightface/models/buffalo_l && \
    wget -q "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip" \
         -O buffalo_l.zip && \
    unzip -o buffalo_l.zip && rm buffalo_l.zip

# ─── 4. Face Restoration (ReActor post-processing) ────────────────────────
RUN comfy model download \
      --url https://github.com/sczhou/CodeFormer/releases/download/v0.1.0/codeformer.pth \
      --relative-path models/facerestore_models \
      --filename codeformer-v0.1.0.pth

RUN comfy model download \
      --url https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth \
      --relative-path models/facerestore_models \
      --filename GFPGANv1.4.pth

# ─── 5. InstantID Models ──────────────────────────────────────────────────
RUN comfy model download \
      --url https://huggingface.co/InstantX/InstantID/resolve/main/ip-adapter.bin \
      --relative-path models/instantid \
      --filename ip-adapter.bin

RUN comfy model download \
      --url https://huggingface.co/InstantX/InstantID/resolve/main/ControlNetModel/diffusion_pytorch_model.safetensors \
      --relative-path models/controlnet \
      --filename instantid-controlnet.safetensors

# antelopev2 — face analysis for InstantID
RUN mkdir -p /root/.insightface/models/antelopev2 && \
    cd /root/.insightface/models/antelopev2 && \
    wget -q "https://huggingface.co/MonsterMMORPG/tools/resolve/main/antelopev2.zip" \
         -O antelopev2.zip && \
    unzip -o antelopev2.zip && rm antelopev2.zip

# ─── 6. YOLOv8 Face Detection ─────────────────────────────────────────────
RUN comfy model download \
      --url https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov8m.pt \
      --relative-path models/ultralytics/bbox \
      --filename face_yolov8m.pt

# ─── 7. WAN 2.1 → Network Volume ──────────────────────────────────────────
# Too large for Docker image (~25 GB total). Stored on /runpod-volume/models/
# See setup_network_volume.sh for initial download.
# worker-comfyui automatically merges /runpod-volume/models/ at startup.

# ─── Metadata ──────────────────────────────────────────────────────────────
LABEL maintainer="gaestefotos.com"
LABEL description="ComfyUI Worker: Qwen Image Edit, Flux, ReActor, InstantID, WAN 2.1 — gaestefotos.com"
LABEL eu.gdpr.processing="EU-only (RunPod EU)"
