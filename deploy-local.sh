#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

# Server port:
# - `server/index.ts` listens on `process.env.PORT`
# - your env uses `APP_SERVER_PORT`, so we map it to `PORT` here.
APP_SERVER_PORT="${APP_SERVER_PORT:-}"
if [ -z "$APP_SERVER_PORT" ] && [ -f .env ]; then
  APP_SERVER_PORT="$(sed -n 's/^APP_SERVER_PORT=//p' .env | head -n 1 | tr -d '\r' || true)"
fi

PORT="${PORT:-${APP_SERVER_PORT:-3000}}"

# Try to activate the expected Node version if nvm is installed (best-effort).
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$HOME/.nvm/nvm.sh"
  nvm use 20 >/dev/null 2>&1 || true
fi

[ -f package-lock.json ] && npm ci || npm install

# Start dev server (ensure PORT matches the mapped value above)
PORT="$PORT" npm run dev > /tmp/snap-stock-dev.log 2>&1 &
DEV_PID=$!
sleep 2

URL="http://localhost:${PORT}"
if command -v open >/dev/null 2>&1; then
  open "$URL"
else
  xdg-open "$URL" >/dev/null 2>&1 || true
fi

wait "$DEV_PID"
