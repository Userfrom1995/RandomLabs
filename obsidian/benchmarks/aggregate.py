#!/usr/bin/env python3
"""aggregate.py - aggregate an Obsidian Kodak benchmark CSV into headline stats.

Reads a CSV with columns: image,codec,bytes,bpp,enc_ms,dec_ms
(optionally followed by extra columns, ignored). Computes, per codec:
  - arithmetic mean bpp (the headline number)
  - total compressed bytes
  - mean encode ms, mean decode ms
  - geometric mean of per-image size ratios vs every other codec

Usage:
  python3 benchmarks/aggregate.py results/<date>-<version>.csv [--compare jxl]
  (--compare restricts the ratio table to a single reference codec)

No interactive input. Writes nothing; prints a markdown-ready table.
"""

import csv
import math
import sys


def parse_args(argv):
    compare = None
    path = None
    i = 0
    while i < len(argv):
        if argv[i] == "--compare":
            i += 1
            if i >= len(argv):
                print("usage: aggregate.py <results.csv> [--compare CODEC]", file=sys.stderr)
                sys.exit(2)
            compare = argv[i]
        else:
            path = argv[i]
        i += 1
    if not path:
        print("usage: aggregate.py <results.csv> [--compare CODEC]", file=sys.stderr)
        sys.exit(2)
    return path, compare


def main():
    path, compare = parse_args(sys.argv[1:])

    rows = []
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(
                {
                    "image": r["image"].strip(),
                    "codec": r["codec"].strip(),
                    "bytes": int(r["bytes"]),
                    "bpp": float(r["bpp"]),
                    "enc_ms": float(r["enc_ms"]),
                    "dec_ms": float(r["dec_ms"]),
                }
            )

    codecs = sorted({r["codec"] for r in rows})
    images = sorted({r["image"] for r in rows})

    # Per-codec aggregates
    stats = {}
    for c in codecs:
        cr = [r for r in rows if r["codec"] == c]
        if not cr:
            continue
        mean_bpp = sum(r["bpp"] for r in cr) / len(cr)
        total = sum(r["bytes"] for r in cr)
        mean_enc = sum(r["enc_ms"] for r in cr) / len(cr)
        mean_dec = sum(r["dec_ms"] for r in cr) / len(cr)
        stats[c] = {
            "mean_bpp": mean_bpp,
            "total_bytes": total,
            "mean_enc_ms": mean_enc,
            "mean_dec_ms": mean_dec,
            "n": len(cr),
        }

    print("| codec | mean bpp | total bytes | mean enc ms | mean dec ms |")
    print("|---|---|---|---|---|")
    for c in codecs:
        s = stats.get(c)
        if not s:
            continue
        print(
            f"| {c} | {s['mean_bpp']:.4f} | {s['total_bytes']} | "
            f"{s['mean_enc_ms']:.1f} | {s['mean_dec_ms']:.1f} |"
        )

    # Ratio table: geometric mean of per-image size ratio vs each reference.
    # base by image so missing rows (a codec skipped an image) are dropped.
    by_image_codec = {(r["image"], r["codec"]): r["bytes"] for r in rows}

    def geomean(values):
        if not values:
            return float("nan")
        return math.exp(sum(math.log(v) for v in values) / len(values))

    refs = [compare] if compare else codecs
    refs = [c for c in refs if c in stats]

    print("\n**Geometric mean of per-image size ratio** (row codec vs column codec):")
    header = "| codec | " + " | ".join(refs) + " |"
    print(header)
    print("|" + "---|" * (len(refs) + 1))
    for c in codecs:
        if c not in stats:
            continue
        cells = []
        for ref in refs:
            ratios = []
            for img in images:
                a = by_image_codec.get((img, c))
                b = by_image_codec.get((img, ref))
                if a is not None and b is not None and b > 0:
                    ratios.append(a / b)
            cells.append(f"{geomean(ratios):.3f}")
        print(f"| {c} | " + " | ".join(cells) + " |")


if __name__ == "__main__":
    main()