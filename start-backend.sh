#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR" || exit 1

export NODE_ENV=production

pnpm --filter @gaestefotos/shared build >/var/log/gaestefotos-backend.log 2>&1 || exit 1
pnpm --filter @gaestefotos/backend build >>/var/log/gaestefotos-backend.log 2>&1 || exit 1
pnpm --filter @gaestefotos/backend start >>/var/log/gaestefotos-backend.log 2>&1 &

