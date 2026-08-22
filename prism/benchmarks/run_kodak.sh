#!/usr/bin/env bash
set -euo pipefail
EFFORT=0
KODAK=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --effort) EFFORT="$2"; shift 2;;
    --kodak) KODAK="$2"; shift 2;;
    *) echo "unknown arg $1"; exit 2;;
  esac
done
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="${ROOT}/../build"
PRISM_BIN="${BUILD}/prism"
if [[ ! -x "$PRISM_BIN" ]]; then
  echo "build prism first: cmake -S prism -B build && cmake --build build -j"
  exit 1
fi
if [[ -z "$KODAK" || ! -d "$KODAK" ]]; then
  echo "kodak dir not found: $KODAK (pass --kodak DIR with 24 PPMs)"
  echo "Creating synthetic probe instead..."
  mkdir -p /tmp/prism_kodak_probe
  python3 - "$EFFORT" << 'PY'
import os, struct, sys
effort=int(sys.argv[1])
# create 2 synthetic images 64x64 RGB gradient + noise
import random
random.seed(0)
for idx in range(2):
    w,h=64,64
    path=f"/tmp/prism_kodak_probe/img{idx}.ppm"
    with open(path,'wb') as f:
        f.write(f"P6\n{w} {h}\n255\n".encode())
        for y in range(h):
            for x in range(w):
                r=(x*4+y*2+random.randint(0,10))%256
                g=(y*4+random.randint(0,10))%256
                b=((x+y)*2+random.randint(0,10))%256
                f.write(bytes([r,g,b]))
print("probe ready")
PY
  KODAK="/tmp/prism_kodak_probe"
fi
OUTDIR="${ROOT}/benchmarks/results"
mkdir -p "$OUTDIR"
STAMP=$(date +%Y-%m-%d)
CSV="${OUTDIR}/${STAMP}-prism-e${EFFORT}.csv"
echo "image,bytes,w,h,bpp_per_sample,bpp_summed" > "$CSV"
total_bytes=0
count=0
total_pixels=0
for img in "$KODAK"/*.ppm "$KODAK"/*.png; do
  [[ -f "$img" ]] || continue
  out="/tmp/prism_bench_$(basename "$img").prism"
  "$PRISM_BIN" enc "$img" "$out" --effort "$EFFORT" > /dev/null
  bytes=$(wc -c < "$out")
  # Parse dimensions via python (handles binary PPM + PNG)
  read w h <<< $(python3 - "$img" << 'PYDIMS'
import sys
path=sys.argv[1]
try:
    with open(path,'rb') as f:
        magic=f.read(2)
        if magic==b'P6':
            # parse PPM header: magic, dimensions, maxval
            f.seek(0)
            # use simple token parsing skipping comments
            tokens=[]
            buf=b''
            # read enough for header
            data=f.read(1024)
            # split by whitespace after handling comments
            # Remove comment lines
            lines=data.split(b'\n')
            header_tokens=[]
            for line in lines:
                if line.startswith(b'#'):
                    continue
                header_tokens.extend(line.split())
                if len(header_tokens)>=3:
                    break
            # header_tokens[0]=P6, [1]=w, [2]=h, [3]=maxval maybe
            if len(header_tokens)>=3:
                print(header_tokens[1].decode(), header_tokens[2].decode())
            else:
                print("768 512")
        else:
            # PNG: use PIL/imghdr or fallback
            print("768 512")
except Exception:
    print("768 512")
PYDIMS
)
  if [[ -z "$w" || -z "$h" ]]; then w=768; h=512; fi
  # fidelity gate: decode and cmp byte-exact via prism's own decode path
  dec="/tmp/prism_bench_dec.ppm"
  dec_raw="/tmp/prism_bench_dec_raw.ppm"
  "$PRISM_BIN" dec "$out" "$dec" > /dev/null
  # also verify via internal raster cmp: compare decoded raster to canonical PPM raster
  # Use python to compare raw pixel bytes (skip ppm headers which may differ in maxval formatting)
  python3 - "$img" "$dec" << 'PYCMP'
import sys
a=open(sys.argv[1],'rb').read()
b=open(sys.argv[2],'rb').read()
def strip_hdr(d):
    # find third newline after P6 header
    parts=d.split(b'\n',3)
    if len(parts)>=4:
        return parts[3]
    return d
da=strip_hdr(a); db=strip_hdr(b)
if da!=db:
    print(f"fidelity FAIL: pixel bytes differ for {sys.argv[1]}", file=sys.stderr)
    sys.exit(1)
PYCMP
  if [[ $? -ne 0 ]]; then echo "Fidelity gate failed for $img"; exit 1; fi
  # bpp: summed = 8*bytes/(w*h), per_sample = summed/3 for RGB
  bpp_summed=$(python3 -c "print(8*$bytes/($w*$h))")
  bpp_per_sample=$(python3 -c "print(8*$bytes/($w*$h*3))")
  echo "$(basename "$img"),$bytes,$w,$h,$bpp_per_sample,$bpp_summed" >> "$CSV"
  total_bytes=$((total_bytes + bytes))
  total_pixels=$((total_pixels + w*h))
  count=$((count+1))
done
# mean bpp summed = 8*total_bytes/total_pixels
mean_summed=$(python3 -c "print(8*$total_bytes/$total_pixels if $total_pixels else 0)")
mean_per_sample=$(python3 -c "print($mean_summed/3)")
echo "mean_bpp_summed=$mean_summed mean_bpp_per_sample=$mean_per_sample over $count images -> $CSV"
echo "PNG gate 13.05 summed: $(python3 -c "print('PASS' if $mean_summed < 13.05 else 'FAIL')")"
echo "WebP gate 9.61 summed: $(python3 -c "print('PASS' if $mean_summed < 9.61 else 'FAIL')")"
echo "JXL gate 8.71 summed: $(python3 -c "print('PASS' if $mean_summed < 8.71 else 'FAIL')")"
cat "$CSV"
echo ""
echo "total_bytes=$total_bytes total_pixels=$total_pixels mean_summed=$mean_summed mean_per_sample=$mean_per_sample" >> "$CSV"
# Also write summary line
echo "# summary: count=$count total_bytes=$total_bytes mean_summed=$mean_summed mean_per_sample=$mean_per_sample" >> "$CSV"
