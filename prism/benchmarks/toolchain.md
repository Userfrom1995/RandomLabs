# Prism benchmark toolchain

Pinned reference codecs for Kodak measurement. Versions match Obsidian harness.

- cjxl 0.7.0 (JPEG XL e7)
- cwebp 1.3.2 (-z 9 -m 6)
- optipng 0.7.8 -o7
- pngcrush 1.8.13 -brute
- CharLS 2.4.2 (JPEG-LS)
- OpenJPEG 2.5.0 (JPEG 2000)

Install via apt or from source; `run_kodak.sh` checks for their presence and skips missing ones with a warning.

Dataset: Kodak PCD0992, 24 images, 768x512, 24-bit RGB, canonical PPM pinned by SHA256 in `data/kodak.sha256`.
