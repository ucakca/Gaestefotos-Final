#!/bin/bash
pkill -f "websockify.*6080" 2>/dev/null || true
pkill -f "x11vnc.*:99" 2>/dev/null || true
pkill -f chromium 2>/dev/null || true
pkill -f "Xvfb :99" 2>/dev/null || true
rm -f /tmp/xvfb.pid /tmp/chrome.pid /tmp/x11vnc.pid 2>/dev/null || true
