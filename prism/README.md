# Prism

A lossless image codec written from scratch in C++17, targeting JPEG XL on the Kodak dataset.

Prism is the successor to Obsidian (issue #68) which plateaued at 9.5208 bpp. The gap to JPEG XL (8.71 harness / ~2.9 per sample) is a redundancy-class gap requiring coupling multi-resolution Squeeze (JPEG XL CDC) with a meta-adaptive MA-tree context model. Prism implements that coupling, with a correct entropy backend and a hard bit-exact round-trip invariant from M0.

## Format

- **Input:** PNG/JPEG/BMP/TGA/HDR via stb_image, PPM (P5/P6/PPM16), raw (with --w/--h/--bd/--ch), WebP/TIFF behind CMake options.
- **Container `PRSM`:** 4-byte magic, LE header, bit-packed model blob with `crc32_model`, post-order payload per band, `crc32_all` footer. Corruption is hard-rejected.
- **Stages:** reversible color decorrelation (YCoCg-R etc.), optional Squeeze, MED/GAP predictor bank, MA-tree context (single-leaf at M0, capped depth/leaf count), context-modeled entropy (binary adaptation with Rice quotient/remainder), container.
- **Effort 0..7:** encoder-side search only; bitstream version is 1 for all efforts.

## Building

```bash
cmake -S prism -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
./build/prism enc in.png out.prism --effort 4
./build/prism dec out.prism out.ppm
./build/prism fuzz --iters 1000
ctest --test-dir build --output-on-failure
```

Options: `-DPRISM_WITH_WEBP=ON -DPRISM_WITH_TIFF=ON`.

## CLI

```
prism enc <in> <out.prism> [--effort N] [--w W --h H --bd B --ch C]
prism dec <in.prism> <out.ppm>
prism fuzz [--iters N]
prism info <file.prism>
prism probe-backend <image.ppm> [--variants v0,v1,v1shared,v2,v2shared]
prism probe-xband <image.ppm>
prism bench-ideal <image.ppm>... [--predictor LIST] [--blend LIST] [--mixer LIST]
prism bench-ideal <image.ppm>... --orinit | --orinit-corrupt | --props i[,ii][,iii]
prism bench-ideal <image.ppm>... --bias biasoff[,bias[,biasgain]]
prism bench-sandbox <image.ppm>... [--profile LIST] [--backend LIST]
                              [--keying LIST] [--inject table,trunc,content]
```

`probe-backend` is the entropy-backend A-B rail for issue #130: it measures
the shipped coder (v0), the zero-flag-first rebinarization (v1), and backend
v2 (dual-rate hierarchical models) on pipeline-exact residual streams,
payload-only. Feed it through `benchmarks/probe_backend.sh`, which verifies
SHA256 pins first, writes a durable CSV, and enforces the A1/A2 acceptance
gates with a self-check.

Since C4, squeezed planes use true CDC lifting (integer H-then-V passes
recursed on averages) behind container flag bit5; legacy decimation streams
remain decodable. Per-plane squeeze levels are chosen by real coded bytes of
the exact band payloads production would emit, and `EncodeOpts::force_squeeze_levels`
provides a deterministic probe override (size must equal the channel count).

Since C5, squeezing planes also carry cross-band prediction weights: HF bands
are predicted by pure linear extrapolation along the co-located LL gradient
(`prism probe-xband <image>` prints the per-plane decisions), behind container
flag bit6 with `EncodeOpts::force_xband_weights` as the deterministic override.
On the photo corpus the trials reject adoption everywhere, keeping streams
byte-identical to pre-C5; the capability stays available for inputs where
LL-gradient correlation is real.

`bench-ideal` is the D-series instrumentation harness (invariant I7): it
dumps the production residual streams and reports static-entropy brackets
under the v2 binarization at two bin granularities plus the value-alphabet
floor, each pooled shared / class16 / ctx343. Feed it through
`benchmarks/probe_ideal.sh`, which verifies SHA256 pins, writes a durable
CSV, enforces the ML-ordering gate (shared >= class16 >= ctx343 per
granularity), checks the committed reference row, and self-checks that its
ranking works in both directions. Every offline go/no-go for the remaining
D-phases must cite numbers this command reproduces.

The `--color LIST` extension (spec addendum 13) scores the D4c reversible
color-rotation family - six YCoCg-butterfly role assignments plus the
JPEG-LS/CALIC `loco` mode - as `med@<mode>` rows against the shipped
baseline, with `med@ycocgr` anchor rows proving id 0 byte-equivalence and
CR-fmt verdicts gating format eligibility. Five candidates PASSED and were
ADOPTED as container ids 7..11 behind a two-stage never-expand trial: the
legacy color winner is re-trialed at the end of analyze() under its own
decided predictor, and a rotation displaces it only on a strict production-
flat win (22 wins / 2 ties / 0 regressions corpus-wide; e1 = 10.1210 summed
/ 3.3737 per-sample bpp, -1.65 percent bytes vs pre-D4c).

The E0 measurement modes (spec addendum 14) decompose the remaining gap on
the production stream. `--orinit` replays the exact v2 bin sequence through
the production adaptation loop with every model state warm-started at its
class16-pooled empirical optimum - the measured A share is precisely what a
transmitted class-level table could recover. `--orinit-corrupt` injects an
all-kind anti-optimum frozen init to prove the OA-order gate can fail.
`--props i[,ii][,iii]` scores static conditionals over decoder-computable
property cells (previously-coded residual quotients qW/qN/qNW/qNE clamped to
+-7, CALIC-style gradient bucket pair from decoded pixels, plane id) under
three pre-registered poolings with a 64-count floor falling back to the
class16 marginal; the MC-viability verdict against the ctx343 static row
decides whether MANIAC-style conditioning ever opens on this binarization
(measured 2026-08-25: pooled margin 1.33 points of v0 < the 1.5 bar -> FAIL,
with all four per-image margins clearing - evidence in
`benchmarks/results/2026-08-25-ideal-props-e0.csv`).

The `--mixer LIST` extension (spec addendum 12) replays the exact
production bin sequence and scores K=4 adaptive dual-rate estimators -
production hierarchical, class-pooled, activity-keyed, qg-sum-keyed - mixed
by bounded integer logistic weights with optional SSE stages. Every MIXER
row carries an anchor: its baseline bits must reproduce the measured v2
payload bytes within +-0.5 percent or no mixer number is trustworthy. The
rail gates that anchor on every row. D2's measured verdict: best candidate
-0.90 percent aggregate against a >= 3 percent gate; rejected offline with
zero format work (see `benchmarks/results/2026-08-24-ideal-mixer-d2.csv`).

The `--bias biasoff,bias,biasgain` extension (spec addenda 14.3 + 16) scores
CALIC-class per-context bias cancellation: a 64-cell gradient-pair additive
table (`pred' = med + b[ctx]`, floor-div updates clamped at 2^(BD-3)) with an
optional multiplicative gain stage on top. `med@biasoff` is the rail's live
anchor (byte-equal to the shipped MED stream); BIAS-fmt requires a
>= 1.5-point ctx343-fine bracket drop with no image above its own baseline.
Measured 2026-08-25 on the pinned quad: both candidates FAIL catastrophically
(brackets WORSE by 16-20 points of v0; payload +22 to +70 percent) - under
the zero-flag-first binarization, moving predictions off MED's conditional
mode destroys the cheap exact-zero residuals that dominate the bit budget
(`benchmarks/results/2026-08-25-ideal-bias-e1.csv`). This closed the last
open E-series lever and moved #130 to honest closure at the achieved level.

`bench-sandbox` is the V0 spine of the Prism v2 clean-slate program (V-series
blueprint + spec addendum 17 = `docs/algorithmic-spec.md` section 18): a NEW
offline instrument, deliberately separate from the frozen bench-ideal, that
scores clustered-static coding of the production residual streams under
tokenization profiles (ZFFCTRL control plus HYB escape ladders T_ESC =
4/8/16 with zigzag fold and first-class ZERO token), keyings (KSHARED /
KFLAT16 / KFLAT343; V1 adds KGRID128 position tiles and KTREE, a learned
context partition over qL/qU/qUL inheriting matree caps), and backends
(B-IDEAL exact static ideal, B-RANS interleaved-static rANS, B-BAC binary
arithmetic; B-ADAPT production control). Everything here is FORMAT-UNWIRED:
zero container bytes until a V4 PASS. Per-image smoothed tables (pseudo-count
32, r = 15/16, normalized to 2^12, cluster caps K <= 256 with 4096-sample
floors) serialize hierarchically with CRC32 protection, and every row carries
joint NET accounting (payload + tables + maps + trees, invariant I12).
`--v1` runs the slice-2 measurement sweep: every configuration is scored as
a REAL row (deterministic keying with the 'SBP1' budget merge-map and any
'SBT1' tree blob fully NETTED) plus an ORACLE twin (per-sample best-cluster
assignment under pin V-P4; map free but reported in dedicated columns), and
the evaluator prints the pre-registered V1a/V1b gate verdicts (addendum 18.1,
per-image medians primary per I10). Feed it through
`benchmarks/probe_sandbox.sh --v1`, which verifies SHA256 pins, writes the
dated phase CSV (`...sandbox-v1.csv`), re-enforces all six VB rails on the
new row families, and proves its own failability via `--self-check-v1`.
Reference CSVs: `benchmarks/results/2026-08-25-sandbox-v0.csv` (V0 spine)
and `benchmarks/results/2026-08-25-sandbox-v1.csv` (V1 measurement).

After the V1 STOP and the owner-authorized source-side-only pivot, the same
instrument runs the S-series (spec addendum 19 = section 19; blueprint
`docs/architecture-jxl-parity-sourcepivot.md`). `--s1` scored predictor
families {MED, GAP, W} in dual frames (FRAME-A adaptive replay / FRAME-S
static spine) under amendments A4/A4b: FAIL, MED ships, B3 closed.
`--s3` scores the frozen P_ext extended causal property list - quotient
buckets with causal per-image octile edges (prefix-invariant), bucketed A4
CALIC gradients of the residual stream, plane id, e_max_prev per 18.4 -
through a pinned FNV-1a flat hash into k_raw {64, 256} clusters with the
caps/floors inherited and every side-info byte NETTED; NO spatial maps or
trees anywhere. The incremental PropHasher is decoder-mirrored by
construction (a fresh hasher over decoded history reproduces the encoder's
cluster sequence; pinned round-trip test). Measured on the pinned quad:
S3 FAIL - best variant median -8.09 pct vs the +1.50 bar (all variants
regress on all images; table bytes dominate), so flat-16 keying ships and
bucket B2 closes with numbers (`benchmarks/results/2026-08-25-sandbox-
s3.csv`). Feed it through `benchmarks/probe_sandbox.sh --s3`
(failability: `--self-check-s3`).

`--s4` is the composition + projection readout that closes the S-program:
per image it crosses {ADAPT production control, SPINE static spine} with
the full D4c color-rotation trial family (colorrot kCount=7), decides the
winner strictly by real NET bytes (ties to ADAPT, so composed NET is
non-regressing vs e1 by construction), and projects the corpus via the
verbatim 18.5 formula against the committed e1 CSV - landscape/portrait
class medians per I10, with the all-landscape quad's portrait gap handled
by a pre-pinned INHERITED marker. Measured verdict: S4 FAIL -
stop-and-report. SPINE won all four quad images (+5.45/+5.56/+5.93/+2.98
pct vs trial-freed controls) but the projection lands summed 9.5638 /
per-sample 3.1879, above both bars (<9.35/<3.117); M2/M3 contexts stay
projected FAIL and untouched. Buckets B1/B2/B3 are closed with numbers,
B4 measured inside composition (~+1.5 pct to both sides), zero container
bytes spent across the entire V+S program
(`benchmarks/results/2026-08-25-sandbox-s4.csv`; failability:
`--self-check-s4`).

`--t0` opens the T-series (joint locality-context program, addendum 20):
a BLOCKING instrument-extension smoke on kodim01 only, explicitly
NON-GATING. It re-emits the anchors, re-runs the S4 composition fresh as
the T-BASE control, then exercises the new group machinery end to end:
GS64/GS128 per-group exact stacks under CEILING mode, integer Lloyd
clustering at the pinned K set with 'SBC1' codebooks + single-state
assignment words NETTED via a mechanical words-tail split, pseudo-random
assignment twins for rank direction, 'SBD1' shrinkage surfaces, and a
ZZ-HU identity echo. New rails: VB-proto-roundtrip / VB-zzhu-identity /
VB-assign-mirror / VB-net-audit-t / fidelity-t; `--self-check-t0` proves
every FAIL path plus both live directions (a constant image collapses to
transmitted K=1 at 12 assignment bytes; a half-constant/half-noise image
beats its random twin). Bring-up repairs landed BEFORE any measurement as
amendment A5 - most notably `crc32_combine` now truly chains (multi-part
blob CRCs previously covered only their final section) and Lloyd seeds
initialize their centroids before the first assignment. Honest smoke
reading: under the pinned symmetric chi-square metric kodim01's groups
collapse to K=1 at every K (CB1 payload == SPINE exactly - the instruments
agree), and CEILING payload-gain is negative vs fresh T-BASE with tables
248/62 KB NETTED (`benchmarks/results/2026-08-26-sandbox-t0.csv`;
failability: `--self-check-t0`). Quad verdict numbers start at T1a.

Since C2 the MA-tree is always-on at effort >= 3: `analyze()` builds it on
spatial residual features with raised caps (depth 10, up to 256 leaves,
min-samples 512, quantile split candidates) and accepts it ONLY if trial
encodes - payloads plus serialized model bytes - beat flat v2 coding
(container flags bit4 marks tree-coded level-0 planes; decode mirrors with
uniform leaf-prior init). On photo corpora the trial currently rejects and
streams stay flat: measured honestly, never assumed.

## Stages and milestones

- **M0 (blocker):** bit-exact round-trip at efforts 0/4/7, corruption rejection (current).
- **M1:** beat PNG (13.05) + WebP (9.61)
- **M2:** beat JPEG-LS (9.71)
- **M3 (owner goal):** beat JPEG XL (8.71 harness / 2.9 per sample) - requires Squeeze + MA-tree
- **M4 (stretch):** CM mode + LZP toward < 8.0

See `prism/docs/research.md`, `prism/docs/algorithmic-spec.md`, `prism/docs/architecture.md`, `prism/docs/benchmark-methodology.md`. Issue #130 (true JXL parity) adds `research-gap-analysis.md` (where the ~21 percent gap lives, findings F1-F4) and `architecture-jxl-parity.md` (the C-series build plan).

## Module layout

```
prism/include/prism/*.h
prism/src/common  (crc32, bitstream)
prism/src/codec   (color, predict, rans, matree, squeeze, container, analyze)
prism/src/frontend (ppm, stb_image, frontend)
prism/src/cli
prism/tests/unit
prism/benchmarks
```

Prism is a CLI tool: there is no web entrypoint; project documentation lives in
`prism/docs/`.

## Decision engine (C3)

Analyzer choices (color transform, CFL scales, global predictor) are made by
`trial_flat_bits`: real coded bytes of the exact v2 stream the encoder emits.
Candidates are pruned on a decimated grid, then finalists plus the identity
plan (None / zero CFL / MED) are fully encoded; ties keep the identity, so an
analysis decision can never lose to doing nothing. See
`docs/architecture-jxl-parity.md` section 5.

## Benchmarks

```
prism/benchmarks/run_kodak.sh --effort 4 --kodak data/kodak
prism/benchmarks/fuzz_gate.sh
prism/benchmarks/probe_backend.sh --build-dir <dir> --image <kodim01.ppm> --image <kodim13.ppm>
prism/benchmarks/probe_sandbox.sh --build-dir <dir> --image <kodim01.ppm> [--image ...]
prism/benchmarks/probe_sandbox.sh --s1 --build-dir <dir> --image ...   (S-series dual-frame predictors)
prism/benchmarks/probe_sandbox.sh --s4 --build-dir <dir> --image ...   (S-series composition + projection)
prism/benchmarks/probe_sandbox.sh --t0 --build-dir <dir> --image <kodim01.ppm>   (T0 instrument smoke, non-gating)
prism/benchmarks/probe_sandbox.sh --self-check [--self-check-v1] [--self-check-s1] [--self-check-s3] [--self-check-s4] [--self-check-t0]
python3 prism/benchmarks/aggregate.py
```

Results are committed under `prism/benchmarks/results/`.

## S-series sandbox (v2 source-side pivot, issue #130)

After the V-series STOP (transmitted side-info does not scale), the
authorized pivot attacks the SOURCE side with the same offline-first gated
method. `bench-sandbox --s1` scores causal predictor families {MED control,
GAP, W ensemble} per spec addendum 18.4 (amendments A4/A4b) in TWO frames:
the production adaptive replay (FRAME-A) and the static spine
ZFFCTRL x KFLAT16 x rANS with every side-info byte NETTED (FRAME-S,
primary/gating). Measured verdict on the pinned quad: S1 FAIL - MED's
exact-zero peak beats directional prediction in both framings; bucket B3 is
closed-with-numbers and the spine carries MED forward into S3/S4.

- the Builder
