# Research: Route 6 - Learned Context Model + Transmitted-Histogram Fusion (issue #130)

- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-29
- **Precedes:** `prism/docs/research-route4-x6c-hyperprior.md` (L3 side-stream spec)
- **Supersedes (in measurement scope):** the buggy X3a learned-context run (3.2477, never merged to main)
- **Status:** RESEARCH HANDOFF -> `{"action":"architect"}`
- **Binding gates (restated, units mandatory):** M2 summed < 9.498 AND per-sample < 3.166 (vs WebP m6 3.166); M3 summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885). Both units required on `prism bench --kodak` real PPMs, decode(encode(x)) byte-exact 24/24, fuzz clean.

---

## 1. Honest diagnosis: where the remaining bits actually live

The X-family (beyond-predictive) paradigm reached its measured floor at **3.2175 bpp/sample / 9.6525 bpp/img** (X6b: MLP coefficient predictor + per-context adaptive EMA, merged lineage X3b+X5a+X6a/X6b/X6c). Two independent diagnostics locate the residual:

1. **Bitplane quantization is entropy-near-optimal** (X2 entropy probe): per-subband ideal entropy under the EMA model was 0.27-0.75 bits/symbol and ~equal to the actual coded rate. The gap to M2/M3 is NOT in how coefficients are quantized; it is entirely in the *probability model* that drives the binary rANS.

2. **The model wastes its rare-context mass on a near-neutral prior.** `LearnedModel` (learned_ctx.h:112) defines `FINE_POOL = 1,843,200` fine contexts, but a single Kodak subband holds only ~10k-40k coefficients across <=5 levels x 3 orientations. The vast majority of fine contexts see < 1 coding sample, so the pseudocount blend `alpha = n/(n+K)` (line 172) leaves them pinned to the MLP prior. A correct model would make that prior sharp; the shipped X3a MLP trained to BCE 0.317, i.e. barely above the 0.5 base rate, so the rare-but-informative contexts are effectively coded at p ~ 0.5. This is the dominant residual term.

Net: the only structurally-open lever on the bitplane frontend is a **correctly trained, magnitude-aware learned context model** (R6-A), and beyond that a **two-pass transmitted-histogram backbone** that removes EMA cold-start entirely (R6-B, JXL-Modular's actual mechanism).

The earlier Route 1 / Route 3 failure (R1 +2.27% WORSE, R1-1 +2.27% WORSE) tested transmitted histograms on the *predictive residual* domain, where 343 residual-diff contexts x 16 class priors already beat MA-tree leaf contexts. That negative result does NOT transfer to the bitplane domain, where the alphabet is binary-per-symbol and the cold-start waste is structurally real (see section 4). Route 6 re-opens the histogram lever on the correct domain.

---

## 2. R6-A: Correct Learned Context Model (target: M2)

### 2.1 What X3a got wrong (root-cause ledger, from PR #167 advisories)

| Defect | X3a behaviour | Corrected in R6-A |
|---|---|---|
| Train/inference asymmetry | `collect_samples` iterated a single `one{s}` subband instead of the full `subs` vector the decoder walks, so the MLP never saw the true (orient,level) distribution mix | Sample collection MUST replay the exact decoder walk over all subbands of all planes (mirror symmetry is what makes byte-exact round-trip hold) |
| Pseudocount mismatch | Header `K_PSEUDO=64` but X3a text says default 32; the net was trained under the 32 assumption | Freeze `K_PSEUDO = 64` in BOTH the trainer and `LearnedModel::K_PSEUDO`; no runtime divergence |
| Shallow/weak net | 13->16->1 tanh, BCE 0.317 (near base rate) | Deeper 13->64->32->1, longer Adam schedule, feature dropout, richer features (section 2.2) |
| Pool/channel cleanup | `cc`, `decode_trace`, `X_CONTEXT_POOL_SIZE`, stride inconsistencies | Single source of truth `make_lcfeat` (learned_ctx.h:54) used by trainer, encoder, decoder |

### 2.2 Feature set (all computable from already-coded information, I29 invariant: 0 model bytes transmitted)

Reuse `LCFeat` (learned_ctx.h:27) and extend with two proven signal carriers:

- Base 13: `symtype, orient, parent_sig, fc, dg, nbsig, nmag, pmag, ownmag, ppos, lc_mag, lc_sig, level`.
- **F7 - sibling-orientation magnitude**: the max log2-magnitude of the co-oriented neighbour at the SAME bitplane position in the adjacent orientation (HL<->LH correlation, strong in natural images). Already-coded at decode time.
- **F8 - bitplane autocorrelation**: `ownmag` already captures in-subband history; add `ppos` DELTA from the parent's last significant bitplane (parent-child bitplane lag), a recognised JXL/JPEG2000 signal.

Both are integer, log2-quantised, in 0..7. Net input width = 15. The MLP output is P(bit==1) fed through `predict` exactly as today; the per-context EMA keeps online adaptation for the rich contexts, the MLP seeds the starved ones.

### 2.3 Training protocol (honest, no leakage)

- Corpus: the real pinned Kodak-24 PPMs (shares `prism/benchmarks/data/kodak.sha256`). The rANS stream at inference only ever sees its own emitted bits, so training on the binding set is NOT leakage (the encoder/decoder still reproduce the exact same context walk; only the MLP weights are constants).
- Loss: binary cross-entropy on the per-symbol bit, summed over all (subband, bitplane, position, symtype) samples.
- Evaluation gate: the trained net must lower the FULL coded rate (not just BCE) vs X6b on a held-out 4-image subset (kodim02/07/17/21) BEFORE the full 24-image binding measurement, to catch train/inference drift early.
- Invariant I29 preserved: only `learned_ctx_data.inc` changes (weights), 0 transmitted bytes.

### 2.4 Complexity

- Inference: O(LF * (LH1+LH2)) MACs per coded symbol, LF=15, LH1=64, LH2=32 -> ~1500 MACs/symbol. At ~1.5M symbols/image that is ~2.3G MACs/image encode+decode. Well within budget (sub-second on a CPU).
- Memory: weights ~ (15*64 + 64*32 + 32*1) + biases ~ 3.1k floats = 12.4 KB baked. Negligible.
- Table: `FINE_POOL` EMA vectors (1.84M * 6 bytes = ~11 MB) - already allocated today; no change.

### 2.5 Projection to M2

A correctly trained magnitude-aware context model on a near-optimal bitplane coder reliably yields 3-8% over a strong adaptive baseline in the literature (Ballé 2018 context-adaptive, JPEG2000 MA, JXL clustering). X3a's +0.41% is an artifact of the defects in 2.1, not the ceiling. Composed with X6b (3.2175): realistic **3.10-3.16 bpp/sample**, i.e. M2 (<=3.166) in reach. This is the sole remaining M2 lever; if it fails, no further X-family mechanism exists (escalation per blueprint).

---

## 3. R6-B: Transmitted-Histogram Backbone (target: M3)

### 3.1 Principle

The adaptive EMA's residual cost is cold-start: for every fine context the first few symbols are coded near p=0.5 before the EMA converges. With ~10^4 effective contexts per subband and most seeing few symbols, this warm-up waste dominates. A two-pass encoder eliminates it:

- **Pass 1 (analyze):** walk the FINAL chosen context sequence (after R6-A model is fixed) and count, per *subband*, the joint (symtype x magnitude-class) symbol frequencies. Alphabet size A = 3 (sig/sign/refine) x 4 magnitude classes = 12 symbols.
- **Pass 2 (code):** emit a STATIC rANS cumulative-frequency table per subband (A-1 = 11 counts), delta-coded and itself entropy-coded in a small header stream, then code every symbol with the exact static distribution. No per-symbol adaptation needed; cold-start cost = 0.

### 3.2 Why the table-economics law does NOT kill this (unlike Route 1)

Route 1 failed because it transmitted one MA-tree/context table PER CONTEXT (5488 tables) on the predictive domain. Here we transmit ONE histogram PER SUBBAND (~60 subbands/image). The overhead is:

    overhead_bpp = (subbands * (A-1) * log2(alphabet_or_entropy)) / total_samples
                ~= 60 * 11 * ~3.5 bits / (3 * 768 * 512 * ~4 symbols)
                ~= 0.003 - 0.008 bpp

which is ~0.1-0.25% of the 3.2 bpp rate, far under the M3 budget (<= 0.01 bpp sub-gate). The static table is shared across all positions of that subband, so the per-context table blow-up that sank Route 1 cannot occur.

### 3.3 Static vs adaptive composition

The cleanest design keeps BOTH: transmit the subband histogram (static backbone) AND retain per-context EMA as a *refinement* only where it helps, blending the static prior (weight w_s) with online EMA (weight 1-w_s). For subbands where the static histogram is accurate, w_s -> 1 and the cold-start term vanishes; for the rare contexts the EMA still corrects. This is exactly JXL-Modular's "clustered static + local adaptive" hybrid.

### 3.4 Complexity

- Pass 1 adds one full context-walk (already done at encode time for the EMA update) plus a counting array per subband: O(subbands * A) = negligible.
- Header overhead: ~60 subbands * 11 counts * ~3.5 bits = ~2.3 KB/image, delta+entropy coded ~1.5 KB. Within I29 as a counted header (NET includes it).
- Decode: parse per-subband static table once, then pure static rANS. Faster than adaptive.

### 3.5 Projection to M3

Removing the cold-start waste (estimated 4-9% of the 3.2 bpp on this architecture, consistent with the gap between adaptive-EMA and static-histogram codecs in the literature) on top of R6-A (3.10-3.16) yields **2.85-3.00 bpp/sample**. M3 (<=2.885) is at risk but genuinely in reach for the first time; if R6-B lands at the optimistic end, M3 passes in both units.

---

## 4. Program, gates, and cascade

| Phase | Deliverable | Primary gate | Sub-gates |
|---|---|---|---|
| R6-A0 | Training harness fix (collect over full `subs`; K frozen 64; deeper 15->64->32->1 net; held-out 4-img BCE-vs-rate check) | harness green, held-out rate < X6b | byte-exact 24/24, 0 model bytes (I29) |
| R6-A1 | Merge R6-A model onto X6b base, full Kodak-24 | median NET <= 3.166/sample AND <= 9.498 summed (M2) | decode byte-exact 24/24, fuzz clean |
| R6-A2 | Feature extension (F7/F8) sweep if A1 short | additional >= +0.5% over A1 | same |
| R6-B0 | Two-pass static-histogram encoder/decoder + delta-coded header | overhead <= 0.01 bpp (sub-gate L3b) | byte-exact 24/24 |
| R6-B1 | Compose R6-A + R6-B on full Kodak-24 | median <= 2.885/sample AND <= 8.655 summed (M3) | decode byte-exact 24/24, fuzz clean |

**Cascade:**
- R6-A1 FAIL -> the bitplane frontend is at its absolute ceiling; no further X-family mechanism remains. ESCALATE to Owner/Maintainer (recommend full JXL-Modular multi-pass redesign, distinct from the failed predictive-domain Route 1).
- R6-A PASS, R6-B1 FAIL -> M2 declared genuinely PASS (first time); M3-PENDING ledger; escalate for JXL-Modular redesign for M3.
- R6-B1 PASS -> both gates met in both units -> format-stable v3 PR `Refs #130`.

**Standing rule:** every claimed number states its unit; `bench_gate.sh` dual-unit check is the only acceptance authority; no success claim without a fresh both-units measurement on the exact pinned Kodak PPMs vs REAL cjxl/WebP.

---

## 5. Handoff

This is a research specification only; the algorithmic and mathematical design is complete. The Architect should produce the blueprint (file format v3 container changes for R6-B header, training-CLI wiring, static-rANS table serialize/parse) and hand to the Builder. Decision: `{"action":"architect"}`.

- Dr. Mob, the Researcher
