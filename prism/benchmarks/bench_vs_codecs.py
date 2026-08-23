#!/usr/bin/env python3
"""Kodak-24 codec shootout: Prism vs Obsidian vs classic lossless codecs.

All codecs run at their maximum effort. Measures compressed size, ratio,
bpp, encode/decode wall time per image, and verifies pixel-exact lossless
round trips for every (codec, image) pair.

Usage:
  python3 benchmarks/bench_vs_codecs.py --kodak data/kodak
  PRISM_BIN=build/prism OBSIDIAN_BIN=/path/obsidian_cli python3 benchmarks/bench_vs_codecs.py

Kodak inputs: 24 images named kodim01..kodim24 (png or ppm).
Kodak-Lossless-True-Color-Image-Suite is a convenient source:
  https://github.com/MohamedBakrAli/Kodak-Lossless-True-Color-Image-Suite
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "obsidian" / "benchmarks"))

try:
    import compare_image_codecs as cc
except ImportError:
    cc = None

from PIL import Image, features  # noqa: E402

HERE = Path(__file__).resolve().parent


def find_images(kodak_dir: Path):
    imgs = sorted(p for p in kodak_dir.iterdir() if p.suffix.lower() in (".png", ".ppm") and p.stem.startswith("kodim"))
    if len(imgs) != 24:
        sys.exit(f"expected 24 kodim*.{png,ppm} in {kodak_dir}, found {len(imgs)}")
    return imgs


def run_lab_codec(name, binpath, sub_enc, sub_dec, ext, effort_args, images):
    totals = {"bytes": 0, "enc": 0.0, "dec": 0.0, "ok": 0}
    for img_path in images:
        im = Image.open(img_path).convert("RGB")
        with tempfile.TemporaryDirectory() as d:
            src, comp, dec = os.path.join(d, "in.png"), os.path.join(d, "out" + ext), os.path.join(d, "dec.png")
            im.save(src, format="PNG")
            t0 = time.perf_counter()
            r = subprocess.run([binpath, sub_enc, src, comp] + effort_args, capture_output=True)
            t1 = time.perf_counter()
            if r.returncode != 0:
                print(f"  {name} ENC FAIL {img_path.name}: {r.stderr[:120]}")
                continue
            r2 = subprocess.run([binpath, sub_dec, comp, dec], capture_output=True)
            t2 = time.perf_counter()
            if r2.returncode == 0:
                totals["ok"] += int(Image.open(dec).convert("RGB").tobytes() == im.tobytes())
            else:
                print(f"  {name} DEC FAIL {img_path.name}: {r2.stderr[:120]}")
            totals["bytes"] += os.path.getsize(comp)
            totals["enc"] += t1 - t0
            totals["dec"] += t2 - t1
    return totals


def run_pil_codec(name, enc, dec, images):
    totals = {"bytes": 0, "enc": 0.0, "dec": 0.0, "ok": 0}
    for img_path in images:
        im = Image.open(img_path).convert("RGB")
        try:
            t0 = time.perf_counter()
            blob = enc(im)
            t1 = time.perf_counter()
            back = dec(blob)
            t2 = time.perf_counter()
            totals["bytes"] += len(blob)
            totals["enc"] += t1 - t0
            totals["dec"] += t2 - t1
            totals["ok"] += int(back.convert("RGB").tobytes() == im.tobytes())
        except Exception as e:
            print(f"  {name} FAIL {img_path.name}: {str(e)[:100]}")
    return totals


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--kodak", default=str(HERE / "data" / "kodak"), help="dir with kodim01..kodim24")
    ap.add_argument("--prism-bin", default=os.environ.get("PRISM_BIN", str(HERE.parent.parent / "build" / "prism")))
    ap.add_argument("--obsidian-bin", default=os.environ.get("OBSIDIAN_BIN", ""))
    args = ap.parse_args()

    images = find_images(Path(args.kodak))
    results = {}

    print("[run] Prism e7 ...")
    results["Prism e7"] = run_lab_codec("prism", args.prism_bin, "enc", "dec", ".prism", ["--effort", "7"], images)

    if args.obsidian_bin and Path(args.obsidian_bin).exists():
        print("[run] Obsidian e7 ...")
        results["Obsidian e7"] = run_lab_codec("obsidian", args.obsidian_bin, "encode", "decode", ".obsd", ["--effort", "7"], images)

    if cc is not None:
        print("[run] PNG optimize ...")
        results["PNG optimize"] = run_pil_codec("png", cc.compress_png, cc._buf_open, images)
        if features.check("webp"):
            print("[run] WebP lossless m6 ...")
            results["WebP lossless m6"] = run_pil_codec("webp", cc.compress_webp_lossless, cc._buf_open, images)
        if features.check("jpg_2000"):
            print("[run] JPEG2000 lossless ...")
            results["JPEG2000 lossless"] = run_pil_codec("jp2", cc.compress_jpeg2000_lossless, cc._buf_open, images)
        if shutil.which("ffmpeg"):
            try:
                cc.compress_jpegls(Image.new("RGB", (4, 4)))
                print("[run] JPEG-LS ...")
                results["JPEG-LS (ffmpeg)"] = run_pil_codec("jls", cc.compress_jpegls, cc.decompress_jpegls, images)
            except Exception as e:
                print(f"  skip JPEG-LS: {e}")
        if shutil.which("cjxl") and shutil.which("djxl"):
            print("[run] JPEG XL d0 e9 ...")
            results["JPEG XL d0 e9"] = run_pil_codec("jxl", lambda im: cc.compress_jpegxl(im, 9), cc.decompress_jpegxl, images)

    total_raw = sum(Image.open(p).size[0] * Image.open(p).size[1] * 3 for p in images)
    n = len(images)

    rows = []
    for name, t in results.items():
        rows.append((
            name, t["bytes"], t["bytes"] / n,
            t["bytes"] * 8 / total_raw if t["bytes"] else 0,
            100.0 * t["bytes"] / total_raw if t["bytes"] else 0,
            t["enc"] / n * 1000, t["dec"] / n * 1000, t["ok"],
        ))
    rows.sort(key=lambda r: r[1])

    hdr = f"{'codec':<20}{'tot KB':>10}{'avg KB':>9}{'bpp':>8}{'ratio':>8}{'enc ms':>9}{'dec ms':>9}  lossless"
    print()
    print(hdr)
    print("-" * len(hdr))
    for name, tb, avg, bpp, ratio, ems, dms, ok in rows:
        print(f"{name:<20}{tb/1024:>10,.0f}{avg/1024:>9,.0f}{bpp:>8.3f}{ratio:>7.2f}%{ems:>9.0f}{dms:>9.0f}  {ok}/{n}")
    print(f"\nraw RGB total: {total_raw:,} bytes over {n} images")


if __name__ == "__main__":
    main()
