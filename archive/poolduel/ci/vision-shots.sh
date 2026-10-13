#!/bin/sh
# Poolduel Tier-2 vision loop wiring (M4, Refs #302).
#
# Serves the repo root over HTTP (so the pages' fetch() hooks resolve),
# screenshots all six poolduel pages headless with Chromium, and stores
# the PNGs under /tmp (never committed). Prints the per-chart file list
# for the verification run, which reads every value per cell/arm from
# the PNGs and compares against the bundle medians.
#
# No interactive prompts; everything via flags/env.
set -eu

PORT="${PORT:-8123}"
OUT="${OUT:-/tmp/poolduel-vision}"
CHROME="${CHROME:-chromium}"

mkdir -p "$OUT"

# Serve the repo root so /poolduel/ URLs resolve with relative fetches.
python3 -m http.server "$PORT" >/tmp/poolduel-vision-server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT INT TERM
sleep 1

shot() {
  page="$1"
  dest="$OUT/$2"
  echo "poolduel vision: shot $page -> $dest"
  "$CHROME" --headless=new --no-sandbox --disable-gpu \
    --hide-scrollbars --window-size=1280,4000 \
    --virtual-time-budget=8000 \
    --screenshot="$dest" \
    "http://127.0.0.1:$PORT/poolduel/$page" >/dev/null 2>&1
}

shot "" "comparison.png"
for pooler in pgagroal pgbouncer pgpool odyssey pgcat; do
  shot "$pooler/" "$pooler.png"
done

echo "poolduel vision: files under $OUT"
ls -la "$OUT"
echo "poolduel vision: done (PNGs under /tmp are never committed)"
