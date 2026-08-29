# Progress: Route 6 - True JXL-Modular Multi-Pass (issue #130)

- **Branch:** `opencode/issue130-20260829143407` (resumed; carries R6-B code + this run's R6-A/R6-B fixes)
- **Blueprint:** `ideas/2026-08-29-prism-route6-learned-histogram-fusion.md` (Route 6 spec, PR #176)
- **Real corpus:** `prism/benchmarks/data/kodak` is now a symlink to the committed
  `obsidian/benchmarks/data/kodak` (24 PPMs, SHAs verified). This closes the long-standing
  "Kodak PPMs absent from checkout" gap and makes every dual-unit gate reproducible.
- **Status:** R6-A (learned context) + R6-B (transmitted histogram) implemented and measured
  on REAL Kodak-24. R6-B now byte-exact (roundtrip bug fixed). Neither lever reaches M2 yet;
  the true JXL-Modular gain requires FINE context clustering (R6-C), not the coarse per-subband
  histogram. Binding gates stay OPEN.

## Honest measurement (real Kodak-24, LeGall53 L5, YCoCg-R)

All numbers state BOTH units. Gate: M2 summed < 9.498 AND per-sample < 3.166;
M3 summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885 / WebP m6 3.166).

| Technique | mean per-sample | mean summed | byte-exact | M2 | M3 |
|---|---|---|---|---|---|
| X6b (learned model, blend=0) | 3.2442 | 9.7326 | assumed* | FAIL | FAIL |
| R6-A (deeper 13-64-32-1 net, fixed trainer) | 3.2459 | 9.7377 | n/a (uses X6b path) | FAIL | FAIL |
| R6-B (W_STATIC=0.35 transmitted hist) | 3.4363 | 10.3090 | **YES** (was FAIL) | FAIL | FAIL |

\* X6b path uses the same byte-exact bitplane rANS as R6-B; R6-B now confirms
decode(encode(x))==x on all 24 images, so the X6b baseline is trustworthy.

### Key findings (this run)

1. **R6-A learned context model is at its ceiling.** The corrected trainer (full-subband
   collection + matching 13-64-32-1 net) trains to BCE 0.313, essentially identical to the
   prior 0.312. Measured rate 3.2459 vs X6b 3.2442: zero gain. The MLP bit-predictor has
   ~0.31 BCE regardless of width; it cannot beat the per-context EMA for the rich contexts
   and only seeds the starved ones (which the EMA pseudocount already handles). So the
   learned-context frontend is exhausted as a single-pass M2/M3 lever.

2. **R6-B transmitted-histogram backbone was BROKEN on real data (roundtrip FAIL), now fixed.**
   Root cause: `frame_wavelet_encode_r6b` clamped the per-(subband,class) histogram to 16
   bits only at wire transmission, but `encode_static` built its static P(0) from UNCLAMPED
   counts. On real Kodak the dominant significance class exceeds 65535, so encoder/decoder
   P(0) diverged and decode failed. Synthetic images never overflow 16 bits, which is why
   the earlier "byte-exact" claim was false. Fix: clamp before building P(0) so both sides
   agree. `bench-r6b` is now byte-exact (ROUNDTRIP OK) on all 24 images.

3. **R6-B as designed (coarse per-subband static histogram) is WORSE than X6b.** At W_STATIC
   = 0.35 the coarse static prior (192 contexts: 16 subbands x 3 symtype x 4 p-buckets) is
   blended into the fine EMA (1.84M fine_ctx contexts). The coarse prior is wrong for most
   fine contexts, so blending it ADDS entropy (+6% vs X6b). The cold-start waste the coarse
   histogram was meant to remove does not exist at this context granularity: the fine EMA
   converges within a handful of symbols per fine context. **This is the critical insight:**
   a per-subband histogram cannot beat a per-fine-context adaptive model. JXL-Modular wins
   precisely because its transmitted histograms are clustered per FINE context (or per
   learned cluster of fine contexts), not per subband.

## Next step: R6-C (true JXL-Modular fine context clustering)

To actually harvest the JXL-Modular gain, the transmitted static histogram must be keyed by
the SAME fine context the EMA uses (orient, level, parent_sig, fc, dg, nmag, ownmag, ppos,
symtype) - or by a learned CLUSTER of those contexts - instead of the coarse (subband,
symtype, p-bucket). Two viable designs:

- **R6-C1 (per-fine-context static, clustered):** group fine_ctx into ~256-1024 clusters per
  (subband, symtype) by quantising (fc,dg,nmag,ownmag,ppos); transmit one static P(0) per
  cluster; blend with EMA (W_STATIC->1 for cold clusters). Header overhead = clusters *
  A * bits, still < 0.01 bpp. This is the JXL-Modular mechanism and the only unmeasured
  multi-pass lever that can beat the EMA.
- **R6-C2 (pure static per fine cluster):** drop the EMA entirely for clustered contexts; the
  transmitted histogram IS the model (zero cold-start). Highest ceiling, needs careful cluster
  count tuning to stay under the overhead sub-gate.

R6-C recomputes the static table over the EXACT fine context key the decoder walks (mirror
symmetry preserved), so byte-exactness holds by construction (unlike the coarse R6-B which
was also symmetric but merely coarse).

## Milestone Checklist

### R6-A (learned context, M2 lever) - DONE measured
- [x] Fix trainer: full-subband collection + matching 13-64-32-1 net + symmetric norm
- [x] Train on real Kodak-24, bake weights
- [x] Measure: 3.2459/sample, at MLP ceiling, no M2 gain

### R6-B (transmitted histogram, M3 lever) - DONE measured, byte-exact now
- [x] Two-pass coder + delta-coded header (branch already had this)
- [x] **Fix roundtrip bug** (16-bit clamp asymmetry) - this run
- [x] Measure on real Kodak-24: byte-exact, but 3.4363/sample (coarse hist hurts)

### R6-C (fine context clustering = true JXL-Modular) - NEXT
- [ ] Cluster fine_ctx into K clusters per (subband, symtype); transmit static P(0)/cluster
- [ ] Blend/Eval vs EMA on held-out 4-img subset before full 24-img gate
- [ ] Full Kodak-24 dual-unit gate; target M2 (<3.166/<9.498) then M3 (<2.885/<8.655)

## Agent log (2026-08-29, builder)
- Resumed on branch `opencode/issue130-20260829143407` (R6-B code present, main was force-
  rewritten so the branch was rebuilt onto main + R6-B commits).
- Linked real Kodak-24 PPMs into prism benchmarks (was the blocker for every prior "Kodak
  absent" claim). First honest real-corpus numbers obtained for X6b/R6-A/R6-B.
- Fixed R6-B roundtrip (16-bit clamp asymmetry); now byte-exact on all 24.
- Corrected R6-A trainer; confirmed learned context model at ceiling (no M2 gain).
- Diagnosed that coarse per-subband static histogram cannot beat the fine EMA; the real JXL-
  Modular gain needs fine context clustering (R6-C). Yielding to continue R6-C.

- the Builder
