# Obsidian benchmark toolchain (pinned)

The Kodak benchmark is reproducible only when every codec and its invocation
are pinned. This file records the exact toolchain for the **reference
baseline** and every Obsidian row. A tool upgrade is a separate documented
event (see `README.md` trend notes) and never silently changes a row.

## Reference baseline (committed 2026-08-17)

Machine: GitHub Actions `ubuntu-latest` runner, x86_64, single-threaded
codec execution where the tool allows (thread counts fixed at 1 where the
flag exists; see per-codec notes).

| Codec | Version | Lossless command |
|---|---|---|
| Obsidian | v1 (core) | `obsidian_cli roundtrip --effort N` (fidelity gate inside) |
| JPEG XL | libjxl 0.7.0 | `cjxl -d 0 -e 7 --lossless_jpeg=0 in.ppm out.jxl` |
| WebP | libwebp 1.3.2 | `cwebp -lossless -z 9 -m 6 in.ppm -o out.webp` |
| PNG | optipng 0.7.8 | `convert in.ppm -strip -depth 8 in.png` then `optipng -o7 -strip all in.png` |
| JPEG-LS | CharLS 2.4.2 | `cjls encode in.ppm out.jls` (CharLS CLI, see `tools/`) |
| JPEG 2000 | ImageMagick 6.9.12 (OpenJPEG 2.5.0) | `convert in.ppm -compress Lossless out.jp2` |

`cjxl`/`cwebp`/`optipng`/`pngcrush`/`convert` come from Ubuntu 24.04 apt.
The JPEG-LS reference uses the **CharLS 2.4.2** upstream release built from
source (pinned SHA-256 in `build_toolchain.sh`); `cjls.cpp` in `tools/`
wraps it with an encode/decode CLI for PPM. CharLS applies the HP1 color
transform for RGB, the standard lossless-RGB mode.

## Install

```bash
bash benchmarks/build_toolchain.sh   # apt installs + builds tools/cjls
```

## Verify

```bash
bash benchmarks/run_kodak.sh --effort 4   # fidelity gates + encode/decode
```

## Ground truth

The Kodak PCD0992 suite (24 images, 768x512, 24-bit RGB) is normalized to
binary P6 PPM. The PPM bytes are the ground truth for every codec. The
`data/kodak.sha256` manifest pins the exact normalized bytes; the PPMs
themselves are git-ignored and re-derivable from the sources in the issue.

## Notes on published comparisons

Independent aggregate benchmarks (WangXuan95 2024, lossless-benchmarks) run
the **same** PCD0992 PNGs and report JPEG XL ~8.7 bpp mean, WebP ~9.6 bpp,
JPEG-LS ~13.1 bpp, PNG ~13.2 bpp on this exact corpus. Lower figures seen in
some papers (e.g. ~3-4 bpp) correspond to a downsampled 24-image RGB subset
of different origin; the Obsidian baseline is measured against the canonical
PCD0992 set and compared to the reference rows we measure ourselves, never to
literature numbers.

## Version pins

| Tool | Pin |
|---|---|
| charls source | `d1c2c35664976f1e43fec7764d72755e6a50a80f38eca70fcc7553cad4fe19d9` |
| apt libjxl-tools | 0.7.0 |
| apt webp | 1.3.2 |
| apt optipng | 0.7.8 |
| apt pngcrush | 1.8.13 |
| apt imagemagick | 6.9.12 |