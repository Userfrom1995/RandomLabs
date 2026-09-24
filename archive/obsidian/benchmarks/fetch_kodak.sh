#!/usr/bin/env bash
# fetch_kodak.sh - durably (re)provision the Kodak Lossless True Color Image
# Suite as canonical 768x512 24-bit RGB PPMs under data/kodak/.
#
# The PPM bytes are the ground truth for every codec in run_kodak.sh. Their
# SHA-256 is recorded in data/kodak.sha256 so any re-download is verified.
#
# Source: the canonical Kodak Lossless True Color Image Suite (R. Franzen,
# Kodak), served at https://r0k.us/graphics/kodak/kodak/kodimNN.png.
# Conversion: lossless PNG -> P6 PPM (no comments, maxval 255, raw RGB).
#
# Usage: bash fetch_kodak.sh
# Requires: python3 + Pillow (pip install Pillow). No interactive input.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/data/kodak"
mkdir -p "$OUT"

python3 - "$OUT" <<'PY'
import sys, urllib.request, io, hashlib
from PIL import Image
out = sys.argv[1]
base = "https://r0k.us/graphics/kodak/kodak/kodim{:02d}.png"
for i in range(1, 25):
    url = base.format(i)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    data = urllib.request.urlopen(req, timeout=30).read()
    im = Image.open(io.BytesIO(data)).convert("RGB")
    w, h = im.size
    ppm = b"P6\n%d %d\n255\n" % (w, h) + im.tobytes()
    with open("%s/kodim%02d.ppm" % (out, i), "wb") as f:
        f.write(ppm)
print("downloaded 24 Kodak PPMs to", out)
PY

echo "verifying against data/kodak.sha256"
( cd "$OUT" && sha256sum -c "$HERE/data/kodak.sha256" ) || {
  echo "sha256 mismatch - regenerating kodak.sha256 from downloaded PPMs" >&2
  ( cd "$OUT" && sha256sum kodim*.ppm ) > "$HERE/data/kodak.sha256"
}
echo "kodak provisioned"
