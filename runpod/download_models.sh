#!/bin/bash
# ─── Download large models to RunPod Network Volume ────────────────────────
# Run this script ONCE on a RunPod pod with the network volume mounted.
# Network Volume is mounted at /runpod-volume
#
# Usage:
#   1. Create a RunPod pod with the network volume attached
#   2. SSH into the pod
#   3. Run: bash download_models.sh
# ────────────────────────────────────────────────────────────────────────────

set -e

VOLUME="/runpod-volume/models"

echo "═══════════════════════════════════════════════════════════════"
echo " gästefotos.com — RunPod Network Volume Model Setup"
echo " Target: $VOLUME"
echo "═══════════════════════════════════════════════════════════════"

# Create directory structure
mkdir -p "$VOLUME/checkpoints"
mkdir -p "$VOLUME/diffusion_models"
mkdir -p "$VOLUME/clip"
mkdir -p "$VOLUME/vae"
mkdir -p "$VOLUME/loras"
mkdir -p "$VOLUME/controlnet"

# ─── WAN 2.1 Image-to-Video (14B fp8) ──────────────────────────────────────
# ~15GB — the main video generation model
WAN_MODEL="$VOLUME/diffusion_models/wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors"
if [ ! -f "$WAN_MODEL" ]; then
  echo ""
  echo "▶ Downloading WAN 2.1 I2V 14B fp8 (~15GB)..."
  wget -q --show-progress \
    "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors" \
    -O "$WAN_MODEL"
  echo "  ✓ WAN 2.1 I2V model downloaded"
else
  echo "✓ WAN 2.1 I2V model already exists"
fi

# ─── WAN 2.1 CLIP (UMT5-XXL) ──────────────────────────────────────────────
# ~10GB — text encoder for WAN
WAN_CLIP="$VOLUME/clip/umt5_xxl_fp8_e4m3fn_scaled.safetensors"
if [ ! -f "$WAN_CLIP" ]; then
  echo ""
  echo "▶ Downloading WAN 2.1 CLIP (UMT5-XXL fp8) (~10GB)..."
  wget -q --show-progress \
    "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors" \
    -O "$WAN_CLIP"
  echo "  ✓ WAN CLIP model downloaded"
else
  echo "✓ WAN CLIP model already exists"
fi

# ─── WAN 2.1 VAE ──────────────────────────────────────────────────────────
WAN_VAE="$VOLUME/vae/wan_2.1_vae.safetensors"
if [ ! -f "$WAN_VAE" ]; then
  echo ""
  echo "▶ Downloading WAN 2.1 VAE (~300MB)..."
  wget -q --show-progress \
    "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors" \
    -O "$WAN_VAE"
  echo "  ✓ WAN VAE downloaded"
else
  echo "✓ WAN VAE already exists"
fi

# ─── Antelopev2 models (InsightFace for InstantID) ────────────────────────
ANTELOPEV2_DIR="$VOLUME/../insightface/models/antelopev2"
if [ ! -d "$ANTELOPEV2_DIR" ] || [ -z "$(ls -A $ANTELOPEV2_DIR 2>/dev/null)" ]; then
  echo ""
  echo "▶ Downloading antelopev2 InsightFace models..."
  mkdir -p "$ANTELOPEV2_DIR"
  cd "$ANTELOPEV2_DIR"
  wget -q "https://huggingface.co/MonsterMMORPG/tools/resolve/main/antelopev2.zip" -O antelopev2.zip
  unzip -o antelopev2.zip && rm antelopev2.zip
  echo "  ✓ antelopev2 models downloaded"
else
  echo "✓ antelopev2 models already exist"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " ✓ All models ready!"
echo ""
echo " Disk usage:"
du -sh "$VOLUME"/* 2>/dev/null || true
echo ""
echo " Total:"
du -sh "$VOLUME"
echo "═══════════════════════════════════════════════════════════════"
