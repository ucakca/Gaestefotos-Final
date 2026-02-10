#!/bin/bash
# Interactive Browser with noVNC

# Kill existing processes
pkill -f "Xvfb :99" 2>/dev/null
pkill -f "x11vnc.*:99" 2>/dev/null
pkill -f "websockify.*6080" 2>/dev/null
sleep 1

# Start Xvfb (virtual framebuffer)
Xvfb :99 -screen 0 1280x800x24 &
sleep 1

# Start Chromium in the virtual display
export DISPLAY=:99
chromium-browser --no-sandbox --disable-gpu --start-maximized --no-first-run --disable-translate "https://app.gaestefotos.com" &
sleep 2

# Start x11vnc (VNC server)
x11vnc -display :99 -forever -shared -nopw -rfbport 5900 &
sleep 1

# Start noVNC (web-based VNC client)
websockify --web=/usr/share/novnc 6080 localhost:5900 &

echo "Interactive Browser ready!"
echo "Open: http://localhost:6080/vnc.html"
