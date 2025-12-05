#!/bin/bash
cd /root/gaestefotos-app-v2/packages/backend
export NODE_ENV=production
pnpm dev > /var/log/gaestefotos-backend.log 2>&1 &

