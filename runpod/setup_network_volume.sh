#!/bin/bash
# ─── RunPod Network Volume Setup ───────────────────────────────────────────
# Run this script ONCE on a RunPod pod with the network volume mounted.
# It installs all custom nodes and models needed for gästefotos.com.
#
# Prerequisites:
#   1. Create a Network Volume in RunPod (EU region, 50GB)
#   2. Create a GPU Pod with this volume attached
#   3. SSH into the pod and run this script
#
# The base ComfyUI image already includes ComfyUI + Flux1-dev-fp8.
# This script adds: ReActor, InstantID, WAN models, face restoration models.
# ────────────────────────────────────────────────────────────────────────────

set -e

COMFY="/comfyui"
VOLUME="/runpod-volume"
CUSTOM_NODES="$COMFY/custom_nodes"

echo "═══════════════════════════════════════════════════════════════"
echo " gästefotos.com — RunPod ComfyUI Full Setup"
echo " ComfyUI: $COMFY"
echo " Volume:  $VOLUME"
echo "═══════════════════════════════════════════════════════════════"

# ─── 1. Install ReActor Face Swap Node ──────────────────────────────────────
echo ""
echo "▶ [1/8] Installing ReActor Face Swap node..."
if [ ! -d "$CUSTOM_NODES/comfyui-reactor-node" ]; then
  cd "$CUSTOM_NODES"
  git clone --depth 1 https://github.com/Gourieff/comfyui-reactor-node.git
  cd comfyui-reactor-node
  pip install -r requirements.txt
  pip install onnxruntime-gpu insightface
  echo "  ✓ ReActor installed"
else
  echo "  ✓ ReActor already installed"
fi

# ─── 2. Install ComfyUI InstantID Node ─────────────────────────────────────
echo ""
echo "▶ [2/8] Installing InstantID node..."
if [ ! -d "$CUSTOM_NODES/ComfyUI_InstantID" ]; then
  cd "$CUSTOM_NODES"
  git clone --depth 1 https://github.com/cubiq/ComfyUI_InstantID.git
  cd ComfyUI_InstantID
  pip install -r requirements.txt 2>/dev/null || true
  echo "  ✓ InstantID installed"
else
  echo "  ✓ InstantID already installed"
fi

# ─── 3. Install IPAdapter Plus (InstantID dependency) ──────────────────────
echo ""
echo "▶ [3/8] Installing IPAdapter Plus..."
if [ ! -d "$CUSTOM_NODES/ComfyUI_IPAdapter_plus" ]; then
  cd "$CUSTOM_NODES"
  git clone --depth 1 https://github.com/cubiq/ComfyUI_IPAdapter_plus.git
  echo "  ✓ IPAdapter Plus installed"
else
  echo "  ✓ IPAdapter Plus already installed"
fi

# ─── 4. Download ReActor / InsightFace models ──────────────────────────────
echo ""
echo "▶ [4/8] Downloading ReActor models..."

# inswapper_128.onnx
INSWAPPER="$COMFY/models/insightface/inswapper_128.onnx"
mkdir -p "$(dirname $INSWAPPER)"
if [ ! -f "$INSWAPPER" ]; then
  wget -q --show-progress \
    "https://github.com/facefusion/facefusion-assets/releases/download/models-3.0.0/inswapper_128.onnx" \
    -O "$INSWAPPER"
  echo "  ✓ inswapper_128.onnx downloaded"
else
  echo "  ✓ inswapper_128.onnx exists"
fi

# buffalo_l face analysis
BUFFALO_DIR="/root/.insightface/models/buffalo_l"
if [ ! -d "$BUFFALO_DIR" ] || [ -z "$(ls -A $BUFFALO_DIR 2>/dev/null)" ]; then
  mkdir -p "$BUFFALO_DIR"
  cd "$BUFFALO_DIR"
  wget -q --show-progress \
    "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip" \
    -O buffalo_l.zip
  unzip -o buffalo_l.zip && rm buffalo_l.zip
  echo "  ✓ buffalo_l models downloaded"
else
  echo "  ✓ buffalo_l models exist"
fi

# ─── 5. Download Face Restoration models ───────────────────────────────────
echo ""
echo "▶ [5/8] Downloading face restoration models..."

FACERESTORE="$COMFY/models/facerestore_models"
mkdir -p "$FACERESTORE"

if [ ! -f "$FACERESTORE/codeformer-v0.1.0.pth" ]; then
  wget -q --show-progress \
    "https://github.com/sczhou/CodeFormer/releases/download/v0.1.0/codeformer.pth" \
    -O "$FACERESTORE/codeformer-v0.1.0.pth"
  echo "  ✓ CodeFormer downloaded"
else
  echo "  ✓ CodeFormer exists"
fi

if [ ! -f "$FACERESTORE/GFPGANv1.4.pth" ]; then
  wget -q --show-progress \
    "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth" \
    -O "$FACERESTORE/GFPGANv1.4.pth"
  echo "  ✓ GFPGANv1.4 downloaded"
else
  echo "  ✓ GFPGANv1.4 exists"
fi

# ─── 6. Download InstantID models ──────────────────────────────────────────
echo ""
echo "▶ [6/8] Downloading InstantID models..."

INSTANTID="$COMFY/models/instantid"
mkdir -p "$INSTANTID"

if [ ! -f "$INSTANTID/ip-adapter.bin" ]; then
  wget -q --show-progress \
    "https://huggingface.co/InstantX/InstantID/resolve/main/ip-adapter.bin" \
    -O "$INSTANTID/ip-adapter.bin"
  echo "  ✓ InstantID ip-adapter downloaded"
else
  echo "  ✓ InstantID ip-adapter exists"
fi

CONTROLNET="$COMFY/models/controlnet"
mkdir -p "$CONTROLNET"

if [ ! -f "$CONTROLNET/instantid-controlnet.safetensors" ]; then
  wget -q --show-progress \
    "https://huggingface.co/InstantX/InstantID/resolve/main/ControlNetModel/diffusion_pytorch_model.safetensors" \
    -O "$CONTROLNET/instantid-controlnet.safetensors"
  echo "  ✓ InstantID ControlNet downloaded"
else
  echo "  ✓ InstantID ControlNet exists"
fi

# antelopev2 for InstantID face analysis
ANTELOPEV2="/root/.insightface/models/antelopev2"
if [ ! -d "$ANTELOPEV2" ] || [ -z "$(ls -A $ANTELOPEV2 2>/dev/null)" ]; then
  mkdir -p "$ANTELOPEV2"
  cd "$ANTELOPEV2"
  wget -q --show-progress \
    "https://huggingface.co/MonsterMMORPG/tools/resolve/main/antelopev2.zip" \
    -O antelopev2.zip
  unzip -o antelopev2.zip && rm antelopev2.zip
  echo "  ✓ antelopev2 downloaded"
else
  echo "  ✓ antelopev2 exists"
fi

# ─── 7. Download WAN 2.1 models (largest) ─────────────────────────────────
echo ""
echo "▶ [7/8] Downloading WAN 2.1 models (this takes a while)..."

DIFFUSION="$COMFY/models/diffusion_models"
mkdir -p "$DIFFUSION"

WAN_MODEL="$DIFFUSION/wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors"
if [ ! -f "$WAN_MODEL" ]; then
  echo "  Downloading WAN 2.1 I2V 14B fp8 (~15GB)..."
  wget -q --show-progress \
    "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors" \
    -O "$WAN_MODEL"
  echo "  ✓ WAN 2.1 I2V model downloaded"
else
  echo "  ✓ WAN 2.1 I2V model exists"
fi

CLIP="$COMFY/models/clip"
mkdir -p "$CLIP"

WAN_CLIP="$CLIP/umt5_xxl_fp8_e4m3fn_scaled.safetensors"
if [ ! -f "$WAN_CLIP" ]; then
  echo "  Downloading WAN CLIP (UMT5-XXL fp8, ~10GB)..."
  wget -q --show-progress \
    "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors" \
    -O "$WAN_CLIP"
  echo "  ✓ WAN CLIP downloaded"
else
  echo "  ✓ WAN CLIP exists"
fi

VAE="$COMFY/models/vae"
mkdir -p "$VAE"

WAN_VAE="$VAE/wan_2.1_vae.safetensors"
if [ ! -f "$WAN_VAE" ]; then
  echo "  Downloading WAN VAE (~300MB)..."
  wget -q --show-progress \
    "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors" \
    -O "$WAN_VAE"
  echo "  ✓ WAN VAE downloaded"
else
  echo "  ✓ WAN VAE exists"
fi

# ─── 8. YOLOv8 Face Detection ─────────────────────────────────────────────
echo ""
echo "▶ [8/8] Downloading YOLOv8 face detection model..."

YOLO="$COMFY/models/ultralytics/bbox"
mkdir -p "$YOLO"

if [ ! -f "$YOLO/face_yolov8m.pt" ]; then
  wget -q --show-progress \
    "https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov8m.pt" \
    -O "$YOLO/face_yolov8m.pt"
  echo "  ✓ YOLOv8 face detection downloaded"
else
  echo "  ✓ YOLOv8 face detection exists"
fi

# ─── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " ✓ Setup complete!"
echo ""
echo " Custom Nodes installed:"
ls -1 "$CUSTOM_NODES/" | grep -E 'reactor|InstantID|IPAdapter'
echo ""
echo " Model disk usage:"
du -sh "$COMFY/models/"*/ 2>/dev/null | sort -rh
echo ""
echo " Total ComfyUI models:"
du -sh "$COMFY/models/"
echo ""
echo " Next steps:"
echo "   1. Stop this pod"
echo "   2. Create a Serverless Endpoint with:"
echo "      - Template: Use existing ComfyUI template"
echo "      - GPU: A6000 (48GB)"
echo "      - Region: EU"
echo "      - Network Volume: this volume"
echo "      - Workers: 0-3, Idle timeout 5s"
echo "═══════════════════════════════════════════════════════════════"
