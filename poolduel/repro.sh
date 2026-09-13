#!/bin/sh
# Poolduel one-command repro (M1+M2+M9). Replays the matrix with identical
# procedure code. Default is the M1 pilot subset; M2 rides --m2-* flags;
# M9 (powered resweep) rides --m9-* flags.
# No interactive prompts; everything via flags. Refs #302.
set -eu

THREADS="${THREADS:-$(nproc 2>/dev/null || echo 4)}"
OUT="${OUT:-poolduel/results/m1}"
M2OUT="${M2OUT:-poolduel/results/m2}"
M9OUT="${M9OUT:-poolduel/results/m9}"
MODE="${1:-}"
M2CHUNK="${2:-}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "poolduel repro: python3 is required" >&2
  exit 2
fi
case "$MODE" in
  --report|--charts|--pagemeta|--dry-run|--m2-dry-run|--m9-dry-run) ;;
  *)
    if ! command -v pgbench >/dev/null 2>&1; then
      echo "poolduel repro: pgbench is required (install PostgreSQL 17)" >&2
      exit 2
    fi
    PYTHONPATH=. python3 poolduel/harness/check.py
    ;;
esac

case "$MODE" in
  --full)
    for chunk in a1 a2 b1 b2 c d e f g; do
      echo "poolduel repro: chunk $chunk"
      python3 -m poolduel.harness.cli --chunk "$chunk" \
        --threads "$THREADS" --out "$OUT"
    done
    ;;
  --pilot | "")
    echo "poolduel repro: pilot (M1-1 + M1-2, one repeat per arm)"
    python3 -m poolduel.harness.cli --pilot \
      --threads "$THREADS" --out "$OUT-pilot"
    ;;
  --dry-run)
    python3 -m poolduel.harness.cli --pilot --dry-run
    ;;
  --m2-dry-run)
    python3 -m poolduel.harness.cli --matrix m2 --dry-run
    ;;
  --m2-smoke)
    echo "poolduel repro: M2 smoke (m2a1 session rows, one repeat per arm)"
    python3 -m poolduel.harness.cli --matrix m2 --pilot \
      --threads "$THREADS" --out "$M2OUT-smoke"
    ;;
  --m2-chunk)
    if [ -z "$M2CHUNK" ]; then
      echo "usage: repro.sh --m2-chunk <m2a1..m2i2>" >&2
      exit 2
    fi
    echo "poolduel repro: M2 chunk $M2CHUNK"
    python3 -m poolduel.harness.cli --matrix m2 --chunk "$M2CHUNK" \
      --threads "$THREADS" --out "$M2OUT-$M2CHUNK"
    ;;
  --m2-na)
    echo "poolduel repro: M2 N/A records (unsupported rows, nulls)"
    python3 -m poolduel.harness.cli --matrix m2 --write-na \
      --threads "$THREADS" --out "$M2OUT"
    ;;
  --m2-full)
    for chunk in m2a1 m2a2 m2b1 m2b2 m2c m2d1 m2d2 m2e m2f1 m2f2 \
                 m2g1 m2g2 m2h1 m2h2 m2i1 m2i2; do
      echo "poolduel repro: M2 chunk $chunk"
      python3 -m poolduel.harness.cli --matrix m2 --chunk "$chunk" \
        --threads "$THREADS" --out "$M2OUT-$chunk"
    done
    python3 -m poolduel.harness.cli --matrix m2 --write-na \
      --threads "$THREADS" --out "$M2OUT"
    ;;
  --m9-dry-run)
    python3 -m poolduel.harness.cli --matrix m9 --dry-run | tail -3
    python3 -m poolduel.harness.cli --list-m9 | head -12
    ;;
  --m9-smoke)
    echo "poolduel repro: M9 smoke (m9k01 warmup curve, one repeat)"
    python3 -m poolduel.harness.cli --matrix m9 --pilot \
      --threads "$THREADS" --out "$M9OUT-smoke"
    ;;
  --m9-chunk)
    if [ -z "$M2CHUNK" ]; then
      echo "usage: repro.sh --m9-chunk <m9r01..m9e03>" >&2
      exit 2
    fi
    echo "poolduel repro: M9 chunk $M2CHUNK"
    python3 -m poolduel.harness.cli --matrix m9 --chunk "$M2CHUNK" \
      --threads "$THREADS" --out "$M9OUT-$M2CHUNK"
    ;;
  --m9-na)
    echo "poolduel repro: M9 N/A records (supavisor statement twins)"
    python3 -m poolduel.harness.cli --matrix m9 --write-na \
      --threads "$THREADS" --out "$M9OUT"
    ;;
  --m9-full)
    # shellcheck disable=SC2046
    for chunk in $(PYTHONPATH=. python3 -c \
      "from poolduel.harness.m9 import M9_CHUNKS; print(' '.join(sorted(M9_CHUNKS)))"); do
      echo "poolduel repro: M9 chunk $chunk"
      python3 -m poolduel.harness.cli --matrix m9 --chunk "$chunk" \
        --threads "$THREADS" --out "$M9OUT-$chunk"
    done
    python3 -m poolduel.harness.cli --matrix m9 --write-na \
      --threads "$THREADS" --out "$M9OUT"
    ;;
  --report)
    echo "poolduel repro: build medians, matrix CSVs, report.json"
    M1ARGS=""
    for d in "$OUT" poolduel/results/m1-*; do
      if [ -d "$d/raw" ] && ls "$d"/raw/*.json >/dev/null 2>&1; then
        M1ARGS="$M1ARGS --m1-dir $d"
      fi
    done
    M2ARGS=""
    for d in "$M2OUT" poolduel/results/m2-*; do
      if [ -d "$d/raw" ] && ls "$d"/raw/*.json >/dev/null 2>&1; then
        M2ARGS="$M2ARGS --m2-dir $d"
      fi
    done
    if [ -z "$M1ARGS$M2ARGS" ]; then
      echo "poolduel repro: no sweep data (no raw/*.json under" >&2
      echo "  $OUT, $M2OUT, poolduel/results/m1-*, poolduel/results/m2*)" >&2
      echo "  run --pilot/--full/--m2-full first; not inventing numbers" >&2
      exit 1
    fi
    # shellcheck disable=SC2086
    python3 -m poolduel.harness.report $M1ARGS $M2ARGS \
      --out poolduel/results
    ;;
  --pagemeta)
    echo "poolduel repro: build page facts from committed medians"
    python3 -m poolduel.harness.pagemeta \
      --m1 poolduel/results/m1/medians.json \
      --m2 poolduel/results/m2/medians.json \
      --out poolduel/results/pagemeta.json
    ;;
  --charts)
    echo "poolduel repro: build report then chart options"
    "$0" --report
    python3 -m poolduel.harness.charts \
      --m1 poolduel/results/m1/medians.json \
      --m2 poolduel/results/m2/medians.json \
      --report poolduel/results/report.json \
      --out poolduel/results/charts
    ;;
  *)
    echo "usage: repro.sh [--pilot|--full|--dry-run|--report|--charts|--pagemeta]" >&2
    echo "       repro.sh [--m2-smoke|--m2-chunk <name>|--m2-na|" >&2
    echo "                --m2-dry-run|--m2-full]" >&2
    echo "       repro.sh [--m9-smoke|--m9-chunk <name>|--m9-na|" >&2
    echo "                --m9-dry-run|--m9-full]" >&2
    exit 2
    ;;
esac

echo "poolduel repro: done"
