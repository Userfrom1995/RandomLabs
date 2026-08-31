# Progress: Prism #130 - JXL-Modular Wire Coding (issue #130)

- **Branch:** `opencode/issue130-jxl-modular-wire`
- **Status:** in-progress
- **Precedent:** JXL-Modular theoretical estimate 3.1606 per-sample / 9.4819 summed
  (Kodak-24, `2026-08-31-jxl-modular-kodak24.csv`, kAnsAlphabet=512)
- **Gates:** M2 < 3.166 per-sample / < 9.498 summed; M3 < 2.885 / < 8.655

## What this build does

Wires the ACTUAL ANS byte stream, container format, and byte-exact decode path
for the JXL-Modular multi-pass encoder. The current implementation on main only
produces a theoretical ANS entropy estimate (no actual bytes emitted, decode is
a stub). This build makes it a real codec.

## Architecture

1. **Pass 1 (analysis):** YCoCg-R color -> LeGall 5/3 wavelet -> CoefficientPredictor
   residuals -> build MA-tree (8 features, greedy entropy split) -> partition into
   K clusters -> count residuals per cluster (512-symbol alphabet via res_to_sym
   bijection)
2. **Pass 2 (coding):** Re-apply transforms, re-compute MA-tree assignments,
   code with rANS using per-cluster static probabilities -> emit: header + MA-tree +
   per-cluster histograms (delta-coded from global) + ANS payload
3. **Decode:** Parse header/MA-tree/histograms -> resolve cluster per coefficient ->
   decode with rANS -> inverse predictor -> inverse wavelet -> inverse color

## Milestone Checklist

### M0: Scaffold
- [ ] Branch + progress file
- [ ] JXLModularANS header (512-symbol, 12-bit precision, per-cluster tables)
- [ ] Push

### M1: ANS Coder
- [ ] JXLModularANS::build_tables(cluster_hists, cluster_totals)
- [ ] JXLModularANS::encode(symbols, cluster_ids) -> bytes (LIFO rANS)
- [ ] JXLModularANS::decode(bytes, cluster_ids) -> symbols (FIFO rANS)
- [ ] Unit test: round-trip random symbols

### M2: Container Format
- [ ] JXL-Modular container: magic + header + MA-tree + histograms + ANS payload
- [ ] Wire jxl_modular_encode to produce actual bytes (byte_exact = true)
- [ ] Unit test: encode -> container parse -> verify structure

### M3: Decoder
- [ ] jxl_modular_decode: parse container, reconstruct MA-tree, decode ANS
- [ ] Inverse predictor, inverse wavelet, inverse color
- [ ] Byte-exact round-trip test on synthetic images

### M4: CLI + Benchmark
- [ ] prism enc/dec support for JXL-Modular format
- [ ] bench-jxl-modular on real Kodak-24
- [ ] bench_gate.sh dual-unit check
- [ ] Fuzz test

### M5: Gate Verification
- [ ] M2 both units PASS? Update comparison table.
- [ ] M3 both units? Document honest state.
- [ ] Push, open PR with Refs #130

## Binding gates (units mandatory)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9)
- `bench_gate.sh` dual-unit check is the only acceptance authority.
- `Refs #130` (never `Closes #130` while gates remain open).

## Builder log

- 2026-08-31 the Builder: created branch, oriented, read all infrastructure
  (ans_static, bitplane_rans, matree_builder, container, R6-B/R6-C encode/decode).
  Theoretical estimate 3.1606/9.482 is within M2 but actual ANS stream not yet wired.
  Building the wire coding now.

- the Builder
