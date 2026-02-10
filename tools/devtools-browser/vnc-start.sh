#!/bin/bash
set -e

# Cleanup first
/root/gaestefotos-app-v2/tools/devtools-browser/vnc-stop.sh 2>/dev/null || true
sleep 1

# Start Xvfb
Xvfb :99 -screen 0 1280x800x24 &
XVFB_PID=$!
echo $XVFB_PID > /tmp/xvfb.pid
sleep 2

# Start Chromium
export DISPLAY=:99
chromium-browser --no-sandbox --disable-gpu --no-first-run --disable-translate --window-size=1280,800 "https://app.gaestefotos.com" &
CHROME_PID=$!
echo $CHROME_PID > /tmp/chrome.pid
sleep 3

# Start x11vnc with keyboard support
x11vnc -display :99 -forever -shared -nopw -rfbport 5900 -xkb -nomodtweak &
VNC_PID=$!
echo $VNC_PID > /tmp/x11vnc.pid
sleep 1

# Start websockify (noVNC)
exec websockify --web=/usr/share/novnc 6080 localhost:5900
