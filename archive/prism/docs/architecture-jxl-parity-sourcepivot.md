# Prism S-series blueprint: the source-side-only pivot (Architect handoff for #130)

- **Issue:** #130 (owner pivot authorization 2026-08-25T21:53:15Z on PR #145;
  M2/M3 dual-unit gates remain the ONLY invariant per the owner's standing
  order; brainstorm board frozen; lab freeze unchanged)
- **Role:** the Architect
- **Trigger:** `/oc architect` dispatch on PR #145, 2026-08-25, after the V1
  gate fired its STOP rule and the owner authorized the pivot: "design the
  'source-side-only pivot' you mentioned, or any other architecture they deem
  necessary", with the explicit restriction that the performance gates
  (M2/M3 vs JPEG XL, WebP, PNG) may never be lifted, bypassed, or altered,
  and a new standing order that future mathematical ceilings may be pivoted
  autonomously without pausing for owner permission.
- **Inputs:** `research-v2-clean-slate.md` (buckets, ledger L-C1..L-C9,
  reopenings R-1..R-4), `architecture-jxl-parity-vseries.md` (the V-series
  program whose V0/V1 phases ran to completion), `algorithmic-spec.md`
  addenda 17/18 (all constants pinned before measurement), the committed
  sandbox CSVs `2026-08-25-sandbox-v0.csv` and `2026-08-25-sandbox-v1.csv`,
  the builder decision records (V-P1..V-P8 pins, V1 verdict), and corpus
  truth e1 = 10.1210 summed / 3.3737 per-sample bpp.
- **Scope of THIS doc:** re-scope the v2 program around the V1 measurement
  instead of the V1 plan. The offline-first gated method is unchanged; what
  changes is WHERE gains are sought (source modeling, not transmitted side
  info) and which pre-registered controls the remaining buckets must beat.
  Spec addendum 19 (algorithmic-spec.md section 19) fills the reserved slots
  that 18.6 left open for exactly this contingency. NO S-phase measurement
  may precede addendum 19.

Units discipline unchanged: every number states its unit; RELPCT =
per-image-median relative NET percent per I10 with NET = payload + tables +
maps + trees per I12; final judgment stays bench_gate.sh in both units
against real cjxl output on a fresh corpus measure; no success claim without
a fresh measurement.

---

## 0. What V1 actually measured (evidence state as design constraints)

The V-series did not fail quietly; it produced three durable numbers:

1. **The static spine is real.** ZFFCTRL x KFLAT16 forward-adaptive static
   class16 tables over the whole image beat the production adaptive control
   by median **+5.81 pct RELPCT NET** on the quad (per-image +5.92 / +6.08 /
   +5.69 / +3.20 on kodim01/13/05/20), with every payable byte included:
   tables ~2.9 KB plus a 26 B merge map (`sandbox-v1.csv`, B-IDEAL REAL
   rows; B-RANS/B-BAC within fidelity bound). This EXCEEDS the research's
   own realistic B1 estimate band (2.5-4.5 pct). It failed only the
   pre-registered retention bar (+37.30), which was sized against an oracle
   margin inflated by fictional free map bytes. The verdict stands recorded
   as FAIL under I10's no-post-hoc-bar rule; the MECHANISM enters this
   program as a freshly-controlled component candidate, not as a V1 PASS.
2. **Transmitted spatial structure does not pay at these caps.** KTREE
   (86 real leaves on kodim01) netted 522250 B vs global flat tables'
   514496 B on kodim01 - the tree blob is tiny (~300 B) but per-leaf table
   bytes (~14.8 KB vs ~3 KB) eat the locality gain. KGRID128 lost outright
   (579280 B). The oracle rows show up to +74.60 pct exists behind maps that
   cost more than the gain they explain. Conclusion adopted here: richer
   CAUSAL properties stay open (E0 measured them); richer TRANSMITTED
   spatial partitions are closed by measurement in this program.
3. **Tokenization stays zero-flag-first.** Every HYB ladder lost to ZFFCTRL
   under every backend and keying (kodim01 KFLAT16 REAL: HYB-A 549802 vs
   ZFFCTRL 514496 net; HYB-B/C worse). B5 shrinks to micro-variants WITHIN
   the zero-flag framing and is demoted to lowest priority.

Consequences for bucket arithmetic (percent of current real bytes):

| bucket | research planning range | post-V1 status |
|---|---|---|
| B1 collection layer | 2.5-4.5 realistic | measured component: static spine +5.81 median quad (corpus projection unknown until S4; kodim20 warns +3.20) |
| B2 conditioning | 2.0-3.1 gross | OPEN as S3, causal properties only |
| B3 predictors | 2-5 conditional | OPEN as S1, dual-frame scoring resolves the zero-economics condition honestly |
| B4 trial selection | 0.5-1.5 | OPEN inside S4 composition |
| B5 tokenization | 0.5-1.0 | DEMOTED to ~0-0.5; ZFFCTRL fixed |

Honest sums: midpoint composition ~11-12 pct clears M2's required 6.15
comfortably and falls short of M3's 14.48; optimistic-edge sum ~15.8 clears
14.48 only if nearly everything lands near its edge simultaneously or the
S5 reserve pays out. Same honest shape the research recorded; M2 is the
expected landing, M3 unlikely. The owner has been told exactly this and
proceeded; the gates themselves are untouched.

Carried verbatim from the ledger: L-C1..L-C9 bind every phase below; R-2/R-3
reopenings keep their written confound arguments; R-4 rides on I10 primacy;
nothing reopens causal mixers, run modes, energy proxies, or parent-blind
transforms. The V1 STOP verdict is permanent history: this document does not
re-grade it, it builds the authorized next program around its numbers.

## 1. Program spine: same discipline, new targets

Everything already built and validated is REUSED, not rebuilt: the
bench-sandbox instrument, tokenize/staticmodel modules, ClusterMap/keying
providers, oracle pass, all six VB rails with fail-capable self-checks, the
pins-before-measurement order, dated one-file-per-phase CSVs, and the
zero-container-bytes-until-threshold-PASS boundary (now keyed to S4).

### Spec addendum 19 lands FIRST (algorithmic-spec.md section 19)

Fills the reserved slots 18.6 left open: the After-V1 slot (no winner
exists; wall-clock accounting per amendment A3 precedent), the Before-S3
slot (frozen extended-property list; tree feature set = NONE), and the
carried slots for S2/S5. Pins the S-controls, the dual-frame contract, and
every S-gate BEFORE any S-measurement. No constant may be tuned after a
measurement has been seen.

### The two controls (pinned in 19.2)

Every S-phase scores against BOTH frames, never across:

- **FRAME-A (adaptive):** production ACModelsV2 replay over the phase's
  residual stream under ZFFCTRL. This is the e1-equivalent instrument bound
  bit-for-bit by VB-anchor-adapt. It answers: does the change help the
  SHIPPED adaptive coder?
- **FRAME-S (static spine):** ZFFCTRL x B-RANS x KFLAT16-static-spine with
  ALL side-info NETTED (tables + merge map). This is the measured V1b best
  family re-instrumented as a control. It answers: does the change help the
  composition destination?

FRAME-S is PRIMARY/gating wherever the two frames disagree on a verdict;
FRAME-A deltas are always REPORTED beside every row so the shipped-coder
question is answered too, but never gating inside this program. Rationale:
composition candidates ship where they won; a mechanism that helps adaptive
coding but not the spine can be revisited after S4 by whoever holds the
format pen, on the recorded FRAME-A numbers.

### S1: predictor families (attacks B3; first measurement phase)

Residual-stream generation by offline causal prediction replay using the
addendum 18.4 mathematics VERBATIM (GAP reduced integer-exact; W ensemble
over {W,N,NW,TE} with normalized 16.16 weights, /512 gradient updates,
clamps [16384, 1048576]; max-error-feedback property available as a keying
coordinate). Families {MED control, GAP, W}. Each family's stream scored in
BOTH frames.

Gate (pinned 19.5): best non-MED family beats same-frame MED by >= 1.5 pct
RELPCT median quad in FRAME-S. FAIL => MED ships in both frames, B3 closed
with numbers. The dual-frame design is the honest resolution of the
zero-economics confound (R-2): if W/GAP help the static frame but hurt the
adaptive frame, both facts land in the ledger and neither is tuned away.

New code: `src/codec/predict.cpp` (format-unwired replay) + unit tests per
the test matrix below.

### S2: error-feedback canary (one shot; opens ONLY on an S1 PASS)

Addendum 14.3 mechanism-(a) shape transplanted onto the S1 winner, scored in
the frame(s) where the winner passed. Gate verbatim from the V-series:
>= 0.5 pct RELPCT median improvement AND no image regressing more than
0.25 pct. Second strike closes bias feedback FOREVER (R-3's own terms).

### S3: extended causal properties (attacks B2)

Flat hashed keying over the FROZEN property list pinned in 19.4: quotient
buckets qW/qN/qNW/qNE (octile edges per-image from the causal stream),
bucketed CALIC gradient magnitudes gbW/gbN, plane id, optional e_max_prev
bucket. Caps inherited: K <= 256 clusters, 4096-sample floors. NO spatial
maps, NO trees anywhere in S3 (exclusion justified by V1 evidence, section
0.2). Scored FRAME-S primary against the same-stack best-flat-16 baseline
(control includes the S1/S2 winners if adopted, so the gate reads the
property extension's own marginal value).

Gate: >= 1.5 pct RELPCT median quad vs that baseline. FAIL => flat-16
keying ships, B2 closed with numbers.

Honest scope note (pinned): FRAME-A scoring of extended properties would
require extending the production model's class key - outside sandbox scope;
reported only if trivially available, never gating. E0's margins were
measured as static ceilings anyway; the static frame is where this bucket's
evidence lives.

### S4: composition + projection (the proceed-to-format threshold)

Candidate set per image, decided strictly by real NET bytes (L-C1):
{adaptive production control (= e1-equivalent), static spine, spine + S1
winner, + S2 if passed, + S3 if passed}, each crossed with the D4c color
transform trial family (B4 expansion rides here). Per-image trial selection
includes the adaptive control in the candidate set, so composed NET is
non-regressing vs e1 BY CONSTRUCTION on the quad.

Projection formula VERBATIM from 18.5 against the committed e1 CSV
(landscape/portrait class medians reported separately). Threshold VERBATIM:
projected < 9.35 summed AND < 3.117 per-sample => proceed-to-format handoff
(a NEW Architect session blueprints the container program behind a version
bump). Below threshold: stop-and-report with the full ledger; zero format
bytes were spent, the standing rule honored by construction across the whole
program.

Registered stretch candidate (non-blocking, time-boxed): per-bin-type-class
static-vs-adaptive KIND flag decided by trial bits, targeting images like
kodim20 where the spine's margin thins to +3.20. If not implemented cleanly
inside the slice, it defers to the format program; it never delays S4's
readout.

### S5 RESERVE (opens ONLY if S4 projects inside M3 reach but short of it)

Verbatim carry of V5: one-shot squeeze-with-parent-properties test
(decoded-parent conditioning; Obsidian's bijection-tested lifting variant
shared), strict gate >= 2.0 pct RELPCT median NET or the lever dies with its
third strike. Never opened otherwise (L-C7).

## 2. Module map additions

```text
src/codec/predict.cpp                        [S1] GAP + W ensemble causal replay
                                             (integer-exact per 18.4; MED passthrough)
include/prism/codec/predict.h                [S1] family interface + stream dump API
tests/unit/test_predict.cpp                  [S1] pinned-arithmetic vectors, decoder-mirror
                                             step equality, clamp bounds, MED identity
src/cli/main.cpp                             [S1..S4] bench-sandbox --s1/--s2/--s3/--s4 modes
src/codec/staticmodel.cpp                    [S3] property-vector keying provider (flat hash)
                                             over the frozen P_ext list; caps/floors inherited
tests/unit/test_staticmodel.cpp              [S3] property keying determinism, floor merges
benchmarks/probe_sandbox.sh                  [S1..S4] rails re-run on every new row family +
                                             S-verdict lines (never flip exit codes except VB-*)
docs/algorithmic-spec.md                     [FIRST] section 19 = addendum 19 (this run)
```

No container/container-header/acoder-production changes exist anywhere in
this program until an S4 threshold PASS; that boundary IS the design, same
as the V-series. The frozen bench-ideal instrument and its committed CSVs
remain anchor-only.

## 3. Test matrix additions

| Layer | Gate |
|---|---|
| Predict unit (S1) | GAP/W replay weights equal decoder-side weights step-by-step on random planes incl. BD extremes; clamps hold; family=MED reproduces the MED stream byte-for-byte; border rule = replicated edge; state reset per plane |
| Property keying unit (S3) | P_ext hashing deterministic; octile edges computed causally (no future-sample leakage: verify by prefix-invariance test); floor merges legal; K cap enforced |
| Sandbox harness | probe_sandbox rails green on EVERY new row family before any verdict line prints; --self-check/--self-check-v1 still prove FAIL paths; new S-verdict lines reachable in both directions via mutated fixtures |
| Corpus | unchanged: sha-pinned Kodak-24 verified BEFORE any measurement; fuzz + byte-exact round-trip on the shipped codec untouched throughout; final S4 checkpoint re-runs bench_gate.sh honestly (expected FAIL until format work exists; recorded, never hidden) |

## 4. Risk register additions

- **Quad-to-corpus extrapolation:** the spine's +5.81 median hides kodim20's
  +3.20; corpus projection uses 18.5 per-image-class medians, never the quad
  median alone. S4's readout is the only corpus-honest number in the program.
- **Frame confusion:** every CSV row carries frame=A|S; every verdict names
  its frame; cross-frame comparisons are invalid and rejectable on sight.
- **Zero-economics recurrence in S1:** W shifts mass off exact zeros by
  design; if FRAME-A regresses while FRAME-S improves, that IS the measured
  answer (recorded, not tuned). Tokenization stays ZFFCTRL; no rescue edits.
- **Property overfitting in S3:** octile edges and hash orders are computed
  causally and pinned in 19.4 before measurement; per-image medians primary
  (I10); the 4096-floor keeps tables statistically sane; table bytes NETTED
  so richer keyings pay their own way (I12).
- **Silent drift toward "V1 was wrong":** forbidden. V1b's bar stands as
  fired; the spine earns its place through S4 composition arithmetic on
  fresh rows, and the ledger keeps both readings visible forever.
- **Scope creep toward format work:** module map contains no container edits
  by construction; a PR touching container files before an S4 PASS is
  rejectable on sight by the Reviewer.

## 5. State and complexity budgets

Encode-side sandbox passes remain O(N) per configuration; predictor replay
adds one O(N) causal pass per family; composition multiplies by the bounded
candidate count. Wall-clock: A3 precedent stands (structural instrument
multipliers recorded beside every phase; NO gate depends on wall-clock).
Peak RSS logged per I6; state <= 256 clusters x ~34 tokens x 4 B streamed
per plane plus predictor weight state (4 x int64 per sample position,
streamed); no second frame buffer beyond the image.

## 6. Builder slicing (continuation granularity)

- Slice P1 (S1): predict.cpp + tests; --s1 dual-frame sweep on the pinned
  quad (pins verified pre-run; rails green first); s1 dated CSV; verdicts in
  tracker + agent log the same day. Handoff continue.
- Slice P2 (S2 if opened, else skip; then S3): property keying provider +
  tests; sweeps + dated CSVs + verdicts.
- Slice P3 (S4): composition driver + trial crossings + projection readout;
  stop-or-proceed recorded; S5 reserve only per its trigger clause.
- Every slice: dated CSV, tracker checklist update, agent log entry, honest
  verdict wording, all six VB rails green, zero container bytes until S4
  passes.

## 7. Decision tree (binding)

| measurement outcome | consequence |
|---|---|
| everything fails except the spine (S1/S2/S3 all FAIL) | compose {adaptive, spine} per image; projection ~9.5-9.6 summed > 9.35 threshold => stop-and-report with the full ledger; the measured spine improvement is recorded as available-but-insufficient |
| S1 passes, S2 or S3 fails partially | compose survivors; target M2; M3 stretch documented honestly in the S4 report |
| S4 threshold met (< 9.35 / < 3.117 projected) | Architect blueprints the format program behind a version bump; Builder implements |
| S4 projects into M3 reach but short | S5 reserve opens ONCE; compose again; then format program or stop-and-report |
| everything fails | stop-and-report with the full ledger; recommend honest close or owner-directed exotic program (standing order makes the retry autonomous next time) |

Every row keeps the owner freeze intact: nothing merges without M2 AND M3
passing in BOTH units on a fresh reproducible dual-unit measurement against
real cjxl output; no partial result is ever worded as parity. The gates are
invariant by standing order; only the architecture serves them.

## 8. Honest projections (restated so no continuation rediscovers optimism)

Spine +5.81 (measured, quad median) + S1 midpoints 0-5 + S2 0-0.5 + S3
1.5-3 + trials 0.5-1.5: midpoint composition lands summed ~9.5-9.8 =>
M2 PASS expected (needs < 9.498), M3 (< 8.655) requires near-edge outcomes
across most components simultaneously or an S5 payout. The program is
ordered so discovering failure costs one slice per bucket and ZERO format
bytes total unless S4 passes. That is the same honesty the research and the
V-series blueprint recorded; the pivot changed where we dig, not how we
count.

---

Merge gate unchanged (owner freeze + standing order): M2 AND M3 genuinely
pass dual-unit on a fresh reproducible measurement, decode byte-exact 24/24,
fuzz clean, CSV + comparison-table row updated. Invariants I1-I12 apply;
I10/I11/I12 bind from S1 on exactly as they bound V0/V1.

- the Architect
