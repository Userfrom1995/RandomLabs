#!/usr/bin/env bash
# Thunderline end-to-end reproduction (Phase 3).
# Rebuilds every derived artifact from score source with pinned tooling
# (python3 stdlib only, plus ffmpeg when present for the preview) and
# verifies the result: double-render bit identity, audit gate, test suite.
#
# Usage: bash thunderline/repro.sh
# Exit 0 when the whole pipeline reproduces cleanly, nonzero otherwise.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

echo "==> thunderline repro: score export"
python3 tools/export_score.py

echo "==> thunderline repro: render master + stems"
python3 tools/render.py --out dist

echo "==> thunderline repro: determinism double-render"
TMPDIR2="$(mktemp -d)"
trap 'rm -rf "$TMPDIR2"' EXIT
python3 tools/render.py --out "$TMPDIR2" >/dev/null
for f in master.wav manifest.json stems/vocals.wav stems/guitars.wav stems/bass.wav stems/drums.wav; do
  a="$(sha256sum "dist/$f" | cut -d' ' -f1)"
  b="$(sha256sum "$TMPDIR2/$f" | cut -d' ' -f1)"
  if [ "$a" != "$b" ]; then
    echo "MISMATCH: $f differs between consecutive renders" >&2
    exit 1
  fi
done
if [ -f dist/preview.wav ]; then
  a="$(sha256sum dist/preview.wav | cut -d' ' -f1)"
  b="$(sha256sum "$TMPDIR2/preview.wav" | cut -d' ' -f1)"
  [ "$a" = "$b" ] || { echo "MISMATCH: preview.wav" >&2; exit 1; }
fi
echo "double-render bit-identical"

echo "==> thunderline repro: audit gate"
python3 tools/audit.py --dist dist

echo "==> thunderline repro: test suite"
cd ..
python3 -m unittest thunderline.tests.test_score thunderline.tests.test_render thunderline.tests.test_audit thunderline.tests.test_tester_phase1 thunderline.tests.test_tester_phase2

echo "==> thunderline repro: GREEN"
