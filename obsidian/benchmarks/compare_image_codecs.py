#!/usr/bin/env python3
"""Compare Obsidian against traditional lossless image codecs on one image.

Modelled on the baseline-codec registry pattern: each codec is a small
closure that turns a PIL `Image` into compressed `bytes` (and back), so the
harness can size, time, and pixel-verify every codec identically. Obsidian is
registered as just another codec (driven by its CLI binary).

Run:
  python3 benchmarks/compare_image_codecs.py IMAGE.png [--efforts 0,1,4]
  OBSIDIAN_BIN=/path/to/obsidian_cli python3 benchmarks/compare_image_codecs.py IMAGE.png

Output: a sorted compression table (bytes, KiB, bpp, ratio vs raw pixels) plus
an explicit lossless verification (decoded pixels hashed and compared to the
original). Results are also appended to a CSV as they arrive.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import os
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

from PIL import Image, features


# ---------------------------------------------------------------------------
# Codec registry: encode(image) -> bytes, decode(bytes) -> Image
# ---------------------------------------------------------------------------


def _buf_save(img: Image.Image, fmt: str, **kwargs) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format=fmt, **kwargs)
    return buf.getvalue()


def _buf_open(b: bytes) -> Image.Image:
    return Image.open(io.BytesIO(b))


def compress_png(image: Image.Image) -> bytes:
    return _buf_save(image, "PNG", optimize=True)


def compress_webp_lossless(image: Image.Image) -> bytes:
    return _buf_save(image, "WEBP", lossless=True, quality=100, method=6)


def compress_jpeg2000_lossless(image: Image.Image) -> bytes:
    return _buf_save(
        image, "JPEG2000", irreversible=False, quality_mode="lossless"
    )


def _ffmpeg_encode(image: Image.Image, codec: str, ext: str, extra: list) -> bytes:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise RuntimeError("ffmpeg not installed")
    with tempfile.TemporaryDirectory(prefix="obsbench_") as d:
        src = os.path.join(d, "in.png")
        dst = os.path.join(d, f"out.{ext}")
        image.save(src, format="PNG")
        cmd = [
            ffmpeg, "-y", "-loglevel", "error", "-i", src,
            "-frames:v", "1", "-c:v", codec, *extra, dst,
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError(r.stderr.strip() or f"ffmpeg {codec} failed")
        with open(dst, "rb") as f:
            return f.read()


def _ffmpeg_decode(b: bytes, ext: str) -> Image.Image:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise RuntimeError("ffmpeg not installed")
    with tempfile.TemporaryDirectory(prefix="obsbench_") as d:
        src = os.path.join(d, f"in.{ext}")
        dst = os.path.join(d, "out.png")
        with open(src, "wb") as f:
            f.write(b)
        cmd = [ffmpeg, "-y", "-loglevel", "error", "-i", src, dst]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError(r.stderr.strip() or "ffmpeg decode failed")
        return Image.open(dst)


def compress_jpegls(image: Image.Image) -> bytes:
    # JPEG-LS has no alpha channel; compare on RGB.
    return _ffmpeg_encode(image.convert("RGB"), "jpegls", "jls", [])


def decompress_jpegls(b: bytes) -> Image.Image:
    return _ffmpeg_decode(b, "jls")


def compress_jpegxl(image: Image.Image, effort: int = 7) -> bytes:
    cjxl = shutil.which("cjxl")
    if cjxl is None:
        raise RuntimeError("cjxl not installed")
    with tempfile.TemporaryDirectory(prefix="obsbench_") as d:
        src = os.path.join(d, "in.png")
        dst = os.path.join(d, "out.jxl")
        image.save(src, format="PNG")
        r = subprocess.run(
            [cjxl, src, dst, "-d", "0", "-e", str(effort), "--lossless_jpeg=0"],
            capture_output=True, text=True,
        )
        if r.returncode != 0:
            raise RuntimeError(r.stderr.strip() or "cjxl failed")
        with open(dst, "rb") as f:
            return f.read()


def decompress_jpegxl(b: bytes) -> Image.Image:
    djxl = shutil.which("djxl")
    if djxl is None:
        raise RuntimeError("djxl not installed")
    with tempfile.TemporaryDirectory(prefix="obsbench_") as d:
        src = os.path.join(d, "in.jxl")
        dst = os.path.join(d, "out.png")
        with open(src, "wb") as f:
            f.write(b)
        r = subprocess.run([djxl, src, dst], capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError(r.stderr.strip() or "djxl failed")
        return Image.open(dst)


def make_obsidian(bin_path: str, effort: int):
    def encode(image: Image.Image) -> bytes:
        with tempfile.TemporaryDirectory(prefix="obsbench_") as d:
            src = os.path.join(d, "in.png")
            dst = os.path.join(d, "out.obsd")
            image.save(src, format="PNG")
            r = subprocess.run(
                [bin_path, "encode", src, dst, "--effort", str(effort)],
                capture_output=True, text=True,
            )
            if r.returncode != 0:
                raise RuntimeError(r.stderr.strip() or "obsidian encode failed")
            with open(dst, "rb") as f:
                return f.read()

    def decode(b: bytes) -> Image.Image:
        with tempfile.TemporaryDirectory(prefix="obsbench_") as d:
            src = os.path.join(d, "in.obsd")
            dst = os.path.join(d, "out.png")
            with open(src, "wb") as f:
                f.write(b)
            r = subprocess.run(
                [bin_path, "decode", src, dst],
                capture_output=True, text=True,
            )
            if r.returncode != 0:
                raise RuntimeError(r.stderr.strip() or "obsidian decode failed")
            return Image.open(dst)

    return encode, decode


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------


def get_codecs(obsidian_bin: Optional[str], efforts) -> dict:
    codecs = {}

    codecs["PNG (PIL optimize)"] = (compress_png, _buf_open, True, "RGBA")
    if features.check("webp"):
        codecs["WebP lossless m6"] = (
            compress_webp_lossless, _buf_open, True, "RGBA")
    if features.check("jpg_2000"):
        codecs["JPEG2000 lossless"] = (
            compress_jpeg2000_lossless, _buf_open, True, "RGBA")

    if shutil.which("ffmpeg"):
        try:
            compress_jpegls(Image.new("RGB", (2, 2)))
            codecs["JPEG-LS (ffmpeg)"] = (
                compress_jpegls, decompress_jpegls, True, "RGB")
        except Exception as e:
            print(f"  [skip] JPEG-LS: {e}", file=sys.stderr)

    if shutil.which("cjxl") and shutil.which("djxl"):
        # Max effort for cjxl is 9 (mathematically lossless: -d 0).
        codecs["JPEG XL -d0 -e9 (max)"] = (
            (lambda img: compress_jpegxl(img, 9)),
            decompress_jpegxl, True, "RGBA")
    elif shutil.which("ffmpeg"):
        codecs["JPEG XL (ffmpeg libjxl)"] = (
            (lambda img: _ffmpeg_encode(img, "libjxl", "jxl",
                                        ["-distance", "0", "-effort", "7"])),
            (lambda b: _ffmpeg_decode(b, "jxl")), True, "RGBA")

    if obsidian_bin and Path(obsidian_bin).exists():
        for eff in efforts:
            enc, dec = make_obsidian(obsidian_bin, eff)
            codecs[f"Obsidian e{eff}"] = (enc, dec, True, "RGBA")

    return codecs


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


@dataclass
class Result:
    name: str
    comp_bytes: int
    bpp: float
    ratio: float
    enc_ms: float
    dec_ms: float
    lossless: bool
    note: str


def run_codec(name, enc, dec, expect_lossless, channels, image, raw_bytes):
    t0 = time.time()
    try:
        comp = enc(image if channels == "RGBA" else image.convert("RGB"))
    except Exception as e:
        return Result(name, 0, 0, 0, 0, 0, False, f"enc err: {e}")
    enc_ms = (time.time() - t0) * 1000

    t0 = time.time()
    try:
        dec_img = dec(comp)
    except Exception as e:
        return Result(name, len(comp), 0, 0, enc_ms, 0, False, f"dec err: {e}")
    dec_ms = (time.time() - t0) * 1000

    try:
        same_size = dec_img.size == image.size
        dec_rgba = dec_img.convert("RGBA")
        orig_rgba = image.convert("RGBA")
        lossless = same_size and (dec_rgba.tobytes() == orig_rgba.tobytes())
        note = "" if lossless else ("size mismatch" if not same_size
                                    else "pixel mismatch")
    except Exception as e:
        lossless = False
        note = f"verify err: {e}"

    bpp = len(comp) * 8.0 / (image.width * image.height)
    ratio = len(comp) / raw_bytes
    ok = "LOSSLESS" if (lossless and expect_lossless) else (
        "lossy" if not expect_lossless else "LOSSY-FAIL")
    return Result(name, len(comp), bpp, ratio, enc_ms, dec_ms,
                  bool(lossless), note or ok)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--efforts", default="7",
                    help="Obsidian effort levels to test (max is 7). "
                         "Other codecs always run at their own max setting.")
    ap.add_argument("--obsidian-bin",
                    default=os.environ.get("OBSIDIAN_BIN", "obsidian_cli"))
    ap.add_argument("--csv", default="")
    args = ap.parse_args()

    efforts = [int(x) for x in args.efforts.split(",") if x.strip() != ""]
    image = Image.open(args.image)
    raw_bytes = image.width * image.height * (4 if image.mode == "RGBA" else 3)
    print(f"Image: {args.image}  {image.width}x{image.height}  mode={image.mode}")
    print(f"Raw pixels: {raw_bytes:,} bytes "
          f"({raw_bytes/1024/1024:.2f} MiB), "
          f"original file: {Path(args.image).stat().st_size:,} bytes")
    print(f"Obsidian binary: {args.obsidian_bin}")

    codecs = get_codecs(args.obsidian_bin, efforts)
    if not codecs:
        print("No codecs available!", file=sys.stderr)
        return 1
    print(f"Codecs: {', '.join(codecs.keys())}\n")

    results = []
    csv_file = None
    if args.csv:
        csv_file = open(args.csv, "w", newline="")
        w = csv.writer(csv_file)
        w.writerow(["codec", "bytes", "kib", "bpp", "ratio", "enc_ms",
                    "dec_ms", "lossless", "note"])

    for name, (enc, dec, expect, ch) in codecs.items():
        print(f"[run] {name} ...", flush=True)
        r = run_codec(name, enc, dec, expect, ch, image, raw_bytes)
        results.append(r)
        line = (f"  {name:24s} {r.comp_bytes:10,d}B "
                f"{r.comp_bytes/1024:8.1f}KiB  bpp {r.bpp:6.3f}  "
                f"ratio {r.ratio:6.2%}  enc {r.enc_ms:7.0f}ms  "
                f"dec {r.dec_ms:7.0f}ms  {r.note}")
        print(line, flush=True)
        if csv_file:
            w = csv.writer(csv_file)
            w.writerow([name, r.comp_bytes, f"{r.comp_bytes/1024:.1f}",
                        f"{r.bpp:.3f}", f"{r.ratio:.4f}", f"{r.enc_ms:.0f}",
                        f"{r.dec_ms:.0f}", r.lossless, r.note])
            csv_file.flush()

    results.sort(key=lambda r: r.comp_bytes)
    print("\n=== Sorted by compressed size (smaller = better) ===")
    print(f"{'codec':24s} {'bytes':>12s} {'KiB':>9s} {'bpp':>7s} "
          f"{'ratio':>8s}  lossless")
    orig = Path(args.image).stat().st_size
    for r in results:
        print(f"{r.name:24s} {r.comp_bytes:12,d} "
              f"{r.comp_bytes/1024:9.1f} {r.bpp:7.3f} {r.ratio:8.2%}  "
              f"{'YES' if r.lossless else 'NO '}")
    print(f"\nOriginal uploaded PNG: {orig:,} bytes "
          f"({orig/raw_bytes:6.2%} of raw pixels)")
    if csv_file:
        csv_file.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
