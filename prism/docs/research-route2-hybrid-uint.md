# Research: Route 2 - Hybrid-Uint Binarization (ZFF Pathology Removal)

- **Issue:** #130 (Owner directive 2026-08-27T08:19:10Z: continue without
  pause, Route 3 first, cascade to Route 1 then Route 2)
- **Role:** Dr. Mob, the Researcher
- **Trigger:** `/oc research` dispatch on #130, 2026-08-27T20:30Z (Maintainer
  cascade after Route 1 R1-1 FAIL)
- **Inputs:** all prior research specs, Route 3 R1 FAIL (PR #157, 2.6x
  overhead from static ANS bypass), Route 1 R1-1 FAIL (PR #160, +2.27%
  median from MA-tree context reduction), T3 factorial results (PR #147,
  B3/B5 closed under ZFF), E1 bias cancellation rejection (+19.85 pts worse),
  negative ledger (7 programs, 30 phases).
- **Scope of THIS doc:** the research specification for Route 2: replacing
  zero-flag-first binarization with hybrid-uint tokenization under v1's
  adaptive coding backend, reopening the predictor headroom (B3) that ZFF
  structurally closed. Handoff: `{"action":"architect"}`.

Units discipline unchanged: every number states its unit; on Kodak-24
(C=3) summed = 3 x per-sample exactly; gates compare BOTH units via
`benchmarks/bench_gate.sh`; no success claim without a fresh measurement.
No em dashes anywhere in this document or its descendants.

---

## 0. Why Route 2 is the correct final fallback

### 0.1 Cascade status after Route 3 and Route 1

| Route | Mechanism | Gate | Result | Root cause |
|---|---|---|---|---|
| Route 3 (JXL-style Modular) | Static ANS + MA-tree + transmitted histograms | R1: >= +5.0% NET | FAIL (+194.22%) | Sign bypass 1 byte/sample (76x worse than adaptive); escape bypass; weak 9-symbol ANS |
| Route 1 (Adaptive multi-pass) | v1 ACoderV2 + MA-tree K=16-128 | R1-1: <= -0.5% median | FAIL (+2.27%) | K=16-128 leaf contexts less discriminative than v1's 343 residual-diff contexts + 16 class priors |

Both routes failed for architectural reasons, not tuning misses:
- Route 3's static ANS cannot compete with adaptive coding for small images
  (the bypass data for signs and escapes overwhelms any entropy gain)
- Route 1's reduced context set (K <= 128) cannot match v1's 343-context
  granularity (the per-leaf models are too coarse)

### 0.2 What Route 2 targets: the ZFF pathology

The zero-flag-first binarization (ZFF) is the production tokenization in
encode_residual_v2 (acoder.cpp:363-379). Under ZFF:

```
zero residual:  cost = 1 bin (zero flag = 0)
nonzero residual: cost = 1 (flag) + 1 (sign) + L+1 (unary) + L (remainder) bins
```

For a residual of magnitude 1: cost = 1 + 1 + 1 + 1 = 4 bins.
For a residual of magnitude 0: cost = 1 bin.

**The pathology:** a predictor that shifts mass from magnitude-1 to zero
reduces cost from 4 bins to 1 bin (75% savings). But a predictor that
shifts mass from magnitude-2 to magnitude-1 reduces cost from 6 bins to
4 bins (33% savings). The zero-mode is disproportionately cheap, creating
a structural bias:

- Predictors that increase zero probability are rewarded (correctly)
- Predictors that decrease large-magnitude probability but increase
  small-magnitude probability are UNDERREWARDED (the zero-mode price
  floor prevents them from expressing their improvement)

This is why:
- E1 bias cancellation backfired by +19.85 pts (the bias correction
  shifted mass away from zero, paying the ZFF penalty)
- S1 GAP/W families regressed -1.45%/-2.61% (the predictor improvements
  shifted mass to small non-zero values, which ZFF prices expensively)
- T3 factorial closed B3/B5 permanently (GAP/W third strike under ZFF)

### 0.3 Why T3 does NOT close Route 2

T3 measured hybrid-uint tokenization (HYB_A/B/C) under the SANDBOX path
with static ANS coding (rans_encode_events). The T3 verdict: HYB profiles
are ~26% worse than ZFFCTRL everywhere.

**But Route 2 uses a different coding backend.** The T3 measurement tested
hybrid-uint under static ANS, which has the same bypass overhead problem
that killed Route 3. Route 2 tests hybrid-uint under v1's adaptive binary
range coder (ACoderV2), which has proven efficient (A-share 0.073).

The key question is: **does hybrid-uint with adaptive coding recover the
predictor headroom that ZFF structurally closed?** T3 does not answer this
question because it used a different coder.

### 0.4 The mechanism: how hybrid-uint removes the pathology

Under hybrid-uint tokenization:
- Zero residual: token = 0 (one symbol among T_ESC+1)
- Small nonzero: token = u (direct, 1 <= u < T_ESC)
- Large nonzero: token = T_ESC + escape structure

Under adaptive binary range coding with per-context probability models:
- Each context maintains probability distributions over the T_ESC+1 tokens
- Zero is priced by its actual probability (not by a binary decomposition)
- A predictor that makes zero more common reduces its cost proportionally
- A predictor that makes small magnitudes more common also reduces cost
  (the tokens are cheaper than large magnitudes)

**The pathology disappears** because the pricing is proportional to
probability, not to binary decomposition depth.

### 0.5 Honest arithmetic

Starting from e1 = 10.1210 summed / 3.3737 per-sample:

| bucket | v1 ceiling | Route 2 estimate | confidence |
|---|---|---|---|
| B3 (predictor headroom) | -1.45% (S1 W, CLOSED under ZFF) | 0-3% (REOPENED under hybrid-uint) | LOW (measured in R2-1) |
| B5 (tokenization) | -2.11% (T3, CLOSED under ZFF) | 0-1% (new alphabet may help) | LOW (measured in R2-1) |
| B1 (collection layer) | +5.81% (V1b) | unchanged (adaptive coder same) | N/A |
| B2 (per-image conditioning) | +1.86..+2.95 pts | unchanged (343 contexts same) | N/A |
| **Total estimated** | | **~0-4% recovery** | |

Projected from e1:
- Conservative (B3 = 0%, B5 = 0%): 10.1210 summed (no change)
- Optimistic (B3 = 3%, B5 = 1%): 10.1210 x (1 - 0.04) = 9.72 summed

M2 gate: < 9.498 summed. **Route 2 alone CANNOT reach M2.** The gain
from predictor headroom is real but bounded by the ZFF pathology removal.

**Route 2 is NOT the path to M3.** Its value is:
1. Measuring whether the ZFF pathology is real and quantifiable
2. Reopening B3 for future composition with other routes
3. Establishing the hybrid-uint tokenization as an alternative to ZFF
4. Completing the measurement of every mechanism class in the design space

The path to M2/M3 requires combining Route 2's tokenization with
Route 1's MA-tree infrastructure and/or Route 3's static ANS for a
hybrid architecture. But that composition is a future measurement;
Route 2 is the prerequisite.

---

## 1. The Route 2 architecture

### 1.1 Design principle: replace ZFF, keep everything else

Route 2 changes exactly one thing: the binarization in encode_residual_v2.
Everything else stays identical to v1:

| aspect | v1 (ZFF) | Route 2 (hybrid-uint) |
|---|---|---|
| color transform | YCoCg-R + D4c trials | unchanged |
| prediction | MED (4-neighbor) | unchanged (but MAY improve in R2-2) |
| residual coding | ZFF binarization + adaptive binary range | hybrid-uint tokenization + adaptive binary range |
| context model | 343 residual-diff contexts + 16 class priors | unchanged |
| adaptive coder | ACoderV2 (binary range, per-context EMA) | ACoderV2 (extended for wider alphabet) |
| MA-tree | v1 production MATree | unchanged |

### 1.2 The new encode/decode functions

Replace encode_residual_v2 / decode_residual_v2 with hybrid-uint versions:

```
encode_residual_hybrid(enc, models, cx, r):
  u = |r|                          // absolute value (pin D13)
  if u == 0:
    v2_put(enc, models.token, cx, 0)   // ZERO token
    return
  // Nonzero: token + sign + escape
  if u < T_ESC:
    v2_put(enc, models.token, cx, u)   // direct token
  else:
    v2_put(enc, models.token, cx, T_ESC)  // escape token
    m = u - T_ESC + 1                  // m >= 1 (pin D1)
    q = bit_length(m) - 1             // unary quotient
    for k = 0 to q-1:
      v2_put(enc, models.escq, cx, 0)  // continuation
    v2_put(enc, models.escq, cx, 1)    // terminator
    // Low q bits: raw bypass (pin D3)
    raw = low q bits of m
    enc.write_raw_bits(raw, q)
  v2_put(enc, models.sign, cx, r < 0)  // sign (L-C5)
```

The decode function mirrors this exactly (I2 invariant).

### 1.3 Why this works with the existing adaptive coder

The ACoderV2 (acoder.cpp) uses binary range coding with per-context
probability adaptation. Each `v2_put` call:
1. Reads the current probability for the context from `models.*.ctx.p_fast`
2. Codes the binary decision using range coding
3. Adapts the probability using EMA (shift-5 decay)

For hybrid-uint, we need three model sets instead of three:
- `models.token`: binary decisions over T_ESC+1 tokens (coded as a
  sequence of binary comparisons, similar to a unary prefix code)
- `models.sign`: binary (positive/negative), same as v1
- `models.escq`: binary (continuation/terminator), same structure as v1's
  unary quotient coding

The token coding uses a binary decomposition of the token alphabet:
- Bit 0: is token == 0? (ZERO vs nonzero)
- If nonzero: bit 1: is token < T_ESC/2? (lower half vs upper half)
- Continue halving until leaf token is identified

This is a standard binary tree prefix code over the token alphabet, coded
with adaptive per-bit probabilities. The overhead vs optimal ANS coding
is small (the adaptive coder tracks the actual distribution; the binary
tree adds ~1 bit per symbol of redundancy for a T_ESC+1 alphabet, which
is negligible for T_ESC <= 16).

### 1.4 T_ESC selection

The escape threshold T_ESC controls the alphabet size:
- T_ESC = 4: alphabet = 5 tokens (0, 1, 2, 3, ESC)
- T_ESC = 8: alphabet = 9 tokens (0..7, ESC)
- T_ESC = 16: alphabet = 17 tokens (0..15, ESC)

Smaller T_ESC = fewer tokens = faster adaptation = less overhead
Larger T_ESC = more direct tokens = better coding of common magnitudes

The T_ESC value is measured in R2-1 (factorial sweep).

### 1.5 Why the adaptive coder can handle wider alphabets

The ACoderV2 already handles per-context probability adaptation for binary
decisions. For a T_ESC+1 alphabet, the token coding uses a binary tree
of T_ESC+1 - 1 = T_ESC binary decisions. Each decision has its own
adapted probability in the context.

For T_ESC = 8 (9 tokens), the binary tree has 8 internal nodes. Each
context tracks 8 adapted probabilities (one per tree node). This is
8x the model memory of ZFF (which tracks 3: zero, sign, quotient/remainder),
but still negligible (~2.7 KB for 343 contexts x 8 nodes x 2 bytes).

The adaptation speed per tree node is the same as ZFF's per-bin adaptation
(same EMA shift-5 decay). The effective learning rate per token is slightly
slower because the probability mass is distributed across more bins, but
this is offset by the wider alphabet capturing more of the residual
distribution directly.

---

## 2. The Route 2 measurement program (R2-series)

### 2.1 Principles

Same discipline as V/S/T/U and R1-series:
- Offline first, zero container bytes until a gate passes
- Per-image primary scoring (I10)
- NET accounting (I12): payload + model overhead jointly
- Pins committed before measurement
- Dated CSVs named `2026-MM-DD-sandbox-r2-<phase>.csv`
- Failable self-checks
- Determinism byte-for-byte
- Fuzz + byte-exact round-trip always
- Final PR judged ONLY by `bench_gate.sh` in both units on fresh corpus

### 2.2 Phases

**R2-0: Harness extension (BLOCKING)**

Extend the existing production encoder (prism.cpp / acoder.cpp) with:
1. New `encode_residual_hybrid` / `decode_residual_hybrid` functions
   (acoder.cpp) using hybrid-uint tokenization with adaptive binary range
   coding
2. New `ACoderHybrid` model set: token, sign, escq contexts (separate
   from v1's zero/sign/q/rem model sets)
3. T_ESC parameterization (compile-time or runtime switch)
4. Container flag for hybrid-uint mode (bit6 of flags byte, reserved in
   v1; hybrid streams flagged for decoder selection)
5. New VB rails:
   - VB-R2-HYBRID-ROUNDTRIP: encode -> decode reproduces source byte-exact
   - VB-R2-TOKEN-FIDELITY: token distributions match expectations
     (zero frequency > sign frequency for photographic content)
   - VB-R2-NET-AUDIT: NET = payload + model overhead on every row
   - VB-R2-MODEL-OVERHEAD: per-context model memory audit
6. Self-check: proves both verdict directions on pinned quad
7. Spec addendum 24 committed BEFORE any measurement: all constants pinned
   (T_ESC candidates, binary tree structure, raw bits handling, context
   set definition)

Exit condition: all VB rails green + dated reference CSV committed.
No R2-phase verdict is valid without a green R2-0.

**R2-1: Hybrid-uint vs ZFF baseline (measures B3/B5 reopening)**

Measure Route 2 (hybrid-uint + adaptive) vs v1 (ZFF + adaptive) on the
pinned quad (kodim01/13/05/20):
- FRAME-ZFF: Prism v1 production path (encode_residual_v2, ZFF)
- FRAME-HYB: Route 2 hybrid-uint (encode_residual_hybrid, T_ESC sweep)

Parameters: T_ESC in {4, 8, 16}, effort levels 3/5/7.

**Gate**: FRAME-HYB median NET beats FRAME-ZFF median NET by >= +0.5%
on the quad (per I10). This is a TIGHT gate because both use the same
adaptive coder; the gain comes purely from the tokenization change.

**Sub-gates**:
- R2-1a: model overhead <= 0.01 bpp per sample (token + sign + escq
  contexts, wider alphabet cost)
- R2-1b: no image regresses by more than -1.0% (the tokenization must
  not hurt any image)
- R2-1c: decode time <= 1.5x v1 decode time (wider alphabet binary
  tree must not be too slow)

**Failable self-check**: proves both gate directions on pinned quad.

**R2-2: Predictor factorial under hybrid-uint (measures B3 reopening)**

If R2-1 passes (hybrid-uint beats ZFF): measure predictor families
under hybrid-uint tokenization on the pinned quad:
- FRAME-MED-HYB: MED + hybrid-uint (R2-1 winner)
- FRAME-GAP-HYB: GAP + hybrid-uint
- FRAME-W-HYB: W ensemble + hybrid-uint

Gate (same as T3 bar(i)):
- (i) Best non-MED family >= +1.50% median NET over MED under
  hybrid-uint, else GAP and W take fourth strike
- (ii) Tokenization main effect recorded

This is the CRITICAL measurement: if GAP/W beat MED under hybrid-uint
but NOT under ZFF, it proves the ZFF pathology was real and Route 2
has reopened B3.

**R2-3: Composition + projection + gate check**

Compose all R2-series winners per image by real NET bytes (L-C1). Project
corpus via formula 18.5 VERBATIM against the committed e1 CSV.

Proceed-to-format threshold: projected < 9.35 summed AND < 3.117
per-sample (2% margin under M2).

If threshold met: Architect blueprints the format program behind version
bump. Fresh dual-unit `bench_gate.sh` against REAL cjxl and WebP on full
Kodak-24. Byte-exact 24/24. Fuzz clean.

If threshold NOT met: Route 2 has measured B3/B5 reopening. Report with
full ledger. The remaining paths to M2/M3 are:
- Combine Route 2 (hybrid-uint) with Route 1 (MA-tree) or Route 3
  (static ANS) in a future composition measurement
- Accept honest closure at achieved level

### 2.3 Honest arithmetic

v1 e1 = 10.1210 summed / 3.3737 per-sample. Route 2 uses the same
adaptive coder as v1, so the coding efficiency baseline is identical.
The gain from Route 2 comes from:

| mechanism | expected gain | confidence |
|---|---|---|
| ZFF pathology removal (B3 reopening) | +0-3% | LOW (depends on predictor response) |
| Token distribution improvement (B5) | +0-1% | LOW (depends on T_ESC fit) |
| **Total expected** | **+0-4%** | |

Projected from e1:
- Conservative (no predictor response): 10.1210 summed (no change)
- Optimistic (full B3 + B5): 10.1210 x (1 - 0.04) = 9.72 summed

M2 gate: < 9.498 summed. **Route 2 alone CANNOT reach M2** at the
conservative estimate. At the optimistic estimate, 9.72 is still 2.3%
above M2.

**Route 2 is NOT the path to M3.** Its value is:
1. Quantifying the ZFF pathology (is it real? how big?)
2. Reopening B3 for future composition
3. Establishing hybrid-uint as an alternative tokenization
4. Completing the measurement of every mechanism class

### 2.4 Cascade triggers

| Phase | Failure | Consequence |
|---|---|---|
| R2-0 | Harness broken | Fix and re-run; no verdict until green |
| R2-1 | < +0.5% NET | Hybrid-uint offers no gain over ZFF under adaptive coding; report ledger |
| R2-1 passes, R2-2 bar(i) met | B3 reopened; proceed to R2-3 |
| R2-2 bar(i) not met | B3 stays closed under adaptive coding; R2-3 with MED only |
| R2-3 | Misses M2 | Report full ledger; owner decides composition or closure |

---

## 3. What Route 2 is NOT

Route 2 is NOT:
- A path to M3 (the gain is ~0-4% at best, 14.48% needed)
- A replacement for Route 3's static ANS (different mechanism)
- A new entropy coding backend (it uses v1's existing ACoderV2)
- A guarantee that B3 is reopenable (the T3 negative result may repeat)

Route 2 IS:
- A measurement of whether the ZFF pathology is real and quantifiable
- An infrastructure investment (hybrid-uint tokenization for future use)
- A prerequisite for composition with Routes 1/3 (hybrid-uint +
  MA-tree or hybrid-uint + static ANS)
- A low-risk, high-confidence measurement (same coder as v1, just
  different tokenization)

---

## 4. Invariants carried forward

I1-I20 from research-v2/v3/v4/route3/route1 carry verbatim. Added:

- **I21 (hybrid-uint primacy):** Route 2 uses hybrid-uint tokenization
  (T_ESC + 1 tokens, zigzag-folded residuals) under v1's ACoderV2 adaptive
  binary range coder. No static ANS, no bypass data, no transmitted
  histograms. The coding efficiency must match or exceed v1 on every image.

- **I22 (T_ESC affordability):** Total model overhead (token + sign + escq
  contexts) must not exceed 0.01 bpp per sample on the pinned quad. If
  overhead exceeds this bar, T_ESC is too large and must be reduced.

- **I23 (predictor headroom measurement):** R2-2 is the definitive test
  of whether the ZFF pathology is real. If GAP/W beat MED under
  hybrid-uint but not under ZFF, the pathology is confirmed and B3 is
  reopened. If GAP/W still lose under hybrid-uint, B3 is closed for
  good (fourth strike).

- **I24 (ZFF regression guard):** The R2-1 gate includes R2-1b (no image
  regresses by more than -1.0%). If any image regresses, the hybrid-uint
  tokenization is worse than ZFF for that image and must be investigated
  before proceeding.

---

## 5. Decision tree

| outcome | consequence |
|---|---|
| R2-0 fails (harness broken) | Fix and re-run; no verdict until green |
| R2-1 fails (< +0.5% NET) | Hybrid-uint offers no gain; report ledger, owner decides |
| R2-1 passes, R2-2 bar(i) met | B3 reopened; proceed to R2-3 composition |
| R2-1 passes, R2-2 bar(i) not met | B3 stays closed; R2-3 with MED only |
| R2-3 passes M2 but not M3 | Report ledger; owner decides composition with Routes 1/3 |
| R2-3 misses M2 | Report full ledger; owner decides next route |
| everything fails | Full negative ledger; honest closure at achieved level |

---

## 6. Relationship to prior measurements

### 6.1 T3 factorial (B3/B5 closed under ZFF)

T3 measured {MED, GAP, W} x {ZFFCTRL, HYB_A, HYB_B, HYB_C} under the
SANDBOX path with static ANS coding. Verdict: HYB profiles are ~26% worse
than ZFFCTRL; GAP/W never beat MED under any tokenization; B3/B5 closed.

**Route 2 does NOT contradict T3.** T3 used static ANS coding, which has
the bypass overhead problem (Route 3 R1 FAIL). Route 2 uses adaptive
coding, which has proven efficient (A-share 0.073). The coding backend
is different; the measurement is different; the verdict may differ.

### 6.1.1 Why the coding backend matters for tokenization comparison

Under static ANS:
- Token probabilities are transmitted as histograms
- The histogram transmission cost is ~0.005 bpp per sample
- For small images (Kodak: 768x512 = 393,216 samples), the histogram
  cost is significant relative to the coding gain
- The wider hybrid-uint alphabet (T_ESC+1 tokens) costs more to transmit
  than the narrower ZFF binary decomposition

Under adaptive binary range coding:
- No histogram transmission (probabilities learned online)
- The adaptive coder tracks per-context distributions via EMA
- The wider hybrid-uint alphabet costs more model memory but no
  transmission bytes
- The coding efficiency depends on adaptation speed, not transmission

This is why T3's verdict (HYB worse than ZFF) does not predict Route 2's
verdict (hybrid-uint under adaptive coding may beat ZFF under adaptive
coding).

### 6.2 E1 bias cancellation (+19.85 pts worse)

E1 measured CALIC-class bias cancellation under ZFF. The bias correction
shifted mass away from zero, paying the ZFF penalty. Route 2 removes this
penalty by construction (hybrid-uint prices zero by probability, not by
binary decomposition depth).

If Route 2 confirms B3 reopening, E1's mechanism could be re-measured
under hybrid-uint in a future phase.

### 6.3 S1 predictor families (-1.45%/-2.61% median)

S1 measured GAP/W families under ZFF. The predictor improvements shifted
mass to small non-zero values, which ZFF prices expensively. Route 2
removes this pricing bias.

If Route 2 confirms B3 reopening, S1's predictor families could be
re-measured under hybrid-uint in R2-2.

---

## 7. Risk factors

1. **Adaptation speed**: the wider hybrid-uint alphabet may slow the
   adaptive coder's learning, offsetting the pathology removal. Measured
   in R2-1.

2. **Binary tree overhead**: coding T_ESC+1 tokens via binary tree adds
   ~log2(T_ESC+1) bits per symbol of structural redundancy vs optimal
   ANS. For T_ESC=8 (9 tokens), this is ~3.17 bits vs ~2.85 bits optimal
   (~11% overhead). The adaptive coder partially compensates by tracking
   actual probabilities.

3. **Raw bits handling**: the escape path's raw bits (pin D3) must be
   handled consistently between encode and decode. The raw bits are written
   as literal bits (not adaptive), same as ZFF's remainder bits.

4. **Context set compatibility**: Route 2 uses v1's 343 residual-diff
   contexts + 16 class priors. The wider alphabet means each context
   tracks more probability states, but the context count is unchanged.

5. **T3 precedent**: T3 closed B3/B5 under a different coding backend.
   If B3 is truly closed (the ZFF pathology is not the cause of predictor
   regression), Route 2 will confirm this with a clean negative result.

---

## 8. Handoff

Next pipeline step: **Architect** (`{"action":"architect"`). Blueprint
inputs: this document (Route 2 architecture; R2-series gates; I21-I24
invariants; addendum 24 skeleton; wire format v2 addendum for hybrid-uint
flag). The Architect's first deliverables:
1. Spec addendum 24 with ALL pinned constants (T_ESC candidates, binary
   tree structure, raw bits handling, context set definition, container
   flag)
2. R2-0 harness blueprint with failable self-check list
3. Wire format v2 addendum (container flag bit6 for hybrid-uint mode)

NO measurement slice may precede addendum 24. The binding end gates
remain M2 AND M3 in both units on a fresh corpus measurement against real
cjxl output; nothing in this document relaxes the freeze or the standing
rule that no success claim leaves the lab without a reproducible
measurement stated in both units.

Handoff decision: `{"action":"architect"}`.

- Dr. Mob, the Researcher
