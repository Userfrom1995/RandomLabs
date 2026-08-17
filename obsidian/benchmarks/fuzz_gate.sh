#!/usr/bin/env bash
# fuzz_gate.sh - randomized small-image round-trip fidelity gate.
#
# Generates a deterministic batch of small images (solid, gradient, noise,
# single pixel, extreme aspect ratios, palette-heavy) and requires Obsidian
# to round-trip each one bit-exact at a spread of efforts. Used by the CI /
# pre-benchmark gate; a single mismatch fails the run.
#
# Usage:
#   bash benchmarks/fuzz_gate.sh [N] [--seed S]
#   N defaults to 40 images x 4 efforts. No interactive input.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$HERE/tmp/fuzz"
N="${1:-40}"
SEED="42"

if [ "${2:-}" = "--seed" ]; then
  SEED="${3:-42}"
fi

if [ -n "${OBSIDIAN_BIN:-}" ] && [ -x "$OBSIDIAN_BIN" ]; then
  OBSIDIAN="$OBSIDIAN_BIN"
elif [ -x "$HERE/../target/release/obsidian_cli" ]; then
  OBSIDIAN="$HERE/../target/release/obsidian_cli"
else
  OBSIDIAN="obsidian_cli"
fi

rm -rf "$TMP"
mkdir -p "$TMP"

python3 - "$TMP" "$N" "$SEED" <<'PY'
import os, random, sys
out, n, seed = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
rng = random.Random(seed)

def write_ppm(path, w, h, pix):
    with open(path, "wb") as f:
        f.write(b"P6\n%d %d\n255\n" % (w, h))
        for p in pix:
            f.write(bytes(p))

sizes = [(8,8),(1,1),(1,64),(64,1),(2,3),(16,16),(31,7),(5,40),(12,9),(9,12),(7,23),(23,7)]
for i in range(n):
    w, h = sizes[i % len(sizes)]
    kind = rng.randrange(6)
    if kind == 0:      # solid
        c = (rng.randrange(256), rng.randrange(256), rng.randrange(256))
        pix = [c] * (w*h)
    elif kind == 1:    # vertical gradient
        pix = [(int(255*j/w), int(255*j/w), 128) for j in range(w) for _ in range(h)]
    elif kind == 2:    # noise
        pix = [(rng.randrange(256), rng.randrange(256), rng.randrange(256)) for _ in range(w*h)]
    elif kind == 3:    # checker
        pix = [((255,255,255) if (x+y) % 2 else (0,0,0)) for y in range(h) for x in range(w)]
    elif kind == 4:    # palette-heavy
        pix = [((i*37)%256, (i*91)%256, (i*13)%256) for i in range(w*h)]
    else:              # stripe
        pix = [((255,0,0) if x < w//3 else ((0,255,0) if x < 2*w//3 else (0,0,255)))
               for y in range(h) for x in range(w)]
    write_ppm(os.path.join(out, "fuzz%03d.ppm" % i), w, h, pix)
print("generated %d images" % n)
PY

fail=0
total=0
for f in "$TMP"/fuzz*.ppm; do
  for e in 0 4 7; do
    total=$((total+1))
    out="$("$OBSIDIAN" roundtrip --effort "$e" "$f" 2>&1)" || {
      echo "FAIL roundtrip exit on $(basename "$f") effort $e"; fail=$((fail+1)); continue; }
    case "$out" in
      *"bit-exact"*) ;;
      *) echo "FAIL fidelity on $(basename "$f") effort $e"; fail=$((fail+1)) ;;
    esac
  done
done

echo "fuzz_gate: $total round-trips, $fail failures"
if [ "$fail" -gt 0 ]; then exit 1; fi
exit 0