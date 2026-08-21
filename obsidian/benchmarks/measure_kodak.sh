#!/usr/bin/env bash
# Measure Obsidian real-Kodak bpp across entropy backends, emitting a
# run_kodak.sh-compatible CSV (image,codec,bytes,bpp,enc_ms,dec_ms).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
BIN="$HERE/../target/release/obsidian_cli"
DATA="$HERE/data/kodak"
EFFORT="${EFFORT:-4}"
OUT="${1:-$HERE/results/2026-08-19-real-kodak-r4-cmarc.csv}"
IMGS=("$DATA"/*.ppm)

echo "image,codec,bytes,bpp,enc_ms,dec_ms" > "$OUT"

measure() {
  local label="$1"; shift
  for img in "${IMGS[@]}"; do
    local name bytes bpp enc_ms dec_ms json
    json="$("$@" "$BIN" roundtrip --effort "$EFFORT" --json "$img" 2>/dev/null)" || { echo "$label: FAIL on $name" >&2; return 1; }
    bytes="$(echo "$json" | sed -n 's/.*"bytes":\([0-9]*\).*/\1/p')"
    bpp="$(echo "$json" | sed -n 's/.*"bpp":\([0-9.]*\).*/\1/p')"
    enc_ms="$(echo "$json" | sed -n 's/.*"encode_ms":\([0-9.]*\).*/\1/p')"
    dec_ms="$(echo "$json" | sed -n 's/.*"decode_ms":\([0-9.]*\).*/\1/p')"
    name="$(basename "$img" .ppm)"
    [ -n "$bytes" ] || { echo "$label: parse FAIL on $name" >&2; return 1; }
    printf "%s,%s,%s,%.4f,%s,%s\n" "$name" "$label" "$bytes" "$bpp" "$enc_ms" "$dec_ms" >> "$OUT"
  done
}

measure "obsidian-gr"            /usr/bin/env
measure "obsidian-cmarc-safnet"  /usr/bin/env OBSIDIAN_CARC=1
measure "obsidian-cmarc-safnet+xchan" /usr/bin/env OBSIDIAN_CARC=1 OBSIDIAN_XCHAN=1
measure "obsidian-cmarc-force"   /usr/bin/env OBSIDIAN_CARC=1 OBSIDIAN_CARC_FORCE=1
measure "obsidian-cmarc-force+resctx" /usr/bin/env OBSIDIAN_CARC=1 OBSIDIAN_CARC_FORCE=1 OBSIDIAN_CARC_RESIDUAL_CTX=1
measure "obsidian-r3c-run-force" /usr/bin/env OBSIDIAN_CARC=1 OBSIDIAN_CARC_RUN=1 OBSIDIAN_CARC_RUN_FORCE=1
measure "obsidian-r3c-run-safnet" /usr/bin/env OBSIDIAN_CARC=1 OBSIDIAN_CARC_RUN=1
measure "obsidian-r3c-run-safnet+xchan" /usr/bin/env OBSIDIAN_CARC=1 OBSIDIAN_CARC_RUN=1 OBSIDIAN_XCHAN=1

echo "==> wrote $OUT"
echo "==> means (bpp):"
awk -F, 'NR>1 {s[$2]+=$4; n[$2]++} END {for (k in s) printf "  %s: %.4f\n", k, s[k]/n[k]}' "$OUT"
echo "==> reference gates: PNG-optipng 13.05 | WebP 9.61 | JPEG-XL 8.71 (unmet unless beaten)"
