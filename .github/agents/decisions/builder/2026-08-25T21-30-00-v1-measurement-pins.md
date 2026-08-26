# V1 measurement slice: structural pins before any measurement

- **Role:** the Builder
- **Date:** 2026-08-25 (Builder slice 2 of the V-series, PR #145, issue #130)
- **Authority:** spec addendum 17 (algorithmic-spec.md section 18) and the
  V-series blueprint are binding; every gate constant there (V1a >= 2.0
  percent median NET, V1b >= half the V1a margin, control = fresh B-ADAPT
  replay) is implemented verbatim. This record fixes only the STRUCTURAL
  readings the texts leave open, BEFORE any `bench-sandbox --v1` row exists
  (same discipline as addendum 18 and record 2026-08-25T16-20-00). No
  constant here may be retuned after a measurement has been seen.

## V-P1 KGRID-128 geometry

Tile = 128 x 128 pixels (addendum 18.2 "grid tile default"). tiles_x =
ceil(w / 128), tiles_y = ceil(h / 128); raw cluster id = ty * tiles_x + tx in
raster tile order; raw cluster count before budget enforcement =
tiles_x * tiles_y (24 on every quad image). The map is deterministic from
the image dimensions alone: zero transmitted map bytes for an unmerged grid.

## V-P2 KTREE at V1: a context tree, not an extended-property tree

Blueprint V3 owns "extended-property" trees ("Before V3: frozen extended-
property list + tree feature set", addendum 18.6). At V1 the tree therefore
conditions on EXACTLY the information KFLAT343 already uses - the three
residual-DIFF components qL, qU, qUL of residual_diff_context (cx =
(qL*7 + qU)*7 + qUL), each in 0..6 - so the V1 sweep compares clustering
STRUCTURES over identical information. Pinned builder:

- Induction data: one pass-1 count under KFLAT343 accumulated over ALL
  planes of the image (per-context n0/n1/tok histograms + per-context sample
  counts). No strided subsample is needed at this scale (343 contexts, not
  per-sample features), so matree's MATREE_INDUCTION_CAP does not bind.
- A node is a set of context ids; a split is (property p, threshold t) with
  left = {contexts: component_p(cx) <= t}, right = the rest.
- Candidate thresholds per property: the deduplicated ascending set of
  WEIGHTED OCTILES of that property's distribution over the node's contexts,
  each context weighted by its sample count (octile k = smallest value v
  with cumulative weight >= k * total_weight / 8, k = 1..7) - the direct
  context-level analogue of matree_builder's octile-quantile rule.
- Feasibility: both children must hold >= MIN_SAMPLES_PER_CLUSTER (4096)
  aggregated samples; depth <= 10; leaves <= 256 (matree caps inherited per
  addendum 18.2).
- Gain criterion: bits(S) for a context set S = sum over its aggregated
  counts priced under the SAME smoothing/normalization arithmetic as
  build_tables (norm_bin_p0 per binary bin with its pinned pseudo counts;
  normalize_counts_4096 over the TOKEN alphabet), evaluated with a pinned
  fixed-point log LUT: lut12[f] = llround(-4096 * log2(f / 4096)) scaled to
  12 fractional bits, i.e. cost in 8192ths of a bit per count unit. Split
  gain = bits(parent) - bits(left) - bits(right).
- Selection: scan properties in the fixed order (qL, qU, qUL) and thresholds
  ascending within each; take the candidate with STRICT maximum gain, first
  among equals in scan order; recurse DFS preorder until no feasible
  improving split exists. Leaf ids are assigned in DFS preorder.
- The tree is PER IMAGE (planes pooled), matching table granularity pin D5.

## V-P3 Tree blob ('SBT1') and merge-map blob ('SBP1') serialization

- Tree blob: magic 'SBT1', u32 leaf count, u16 internal-node count, then the
  internal nodes in preorder as one byte each (property index << 5 | threshold),
  then CRC32 over magic ++ counts ++ node bytes. The decoder replays the
  partition over the fixed 343-context space to rebuild ctx_leaf; it never
  needs induction data. Counted in the `trees` column of REAL rows.
- Budget merge-map: cluster floors/caps (pin D4/D9) can merge raw clusters,
  and a decoder cannot re-derive count-based merges. Every REAL row therefore
  transmits 'SBP1': u16 raw-cluster count, one byte per raw cluster holding
  its FINAL cluster id after enforcement, CRC32. Counted in the `maps`
  column (this is exactly what that column exists for under I12). When
  enforcement merges nothing the blob still ships (uniform decoding path,
  honest byte accounting). ORACLE rows transmit no maps (pin V-P5).

## V-P4 Oracle-map pass (V1a) definition

For a configuration whose keyed model (counted, budget-enforced) has K >= 2
active clusters with tables T1:

- Pool = those K active clusters only.
- Cost model (pinned, self-contained): cost(cl, event) sums lut12 over the
  event's coded bins, where binary kinds read lut12[t.at(cl, kind, key)] on
  their observed bit's complement probability exactly as plan_bins prices
  them (p12_to_p16 clamp applied first), TOKEN events walk the TokenTree
  decision path summing lut12 on each visited node mass, RAWBITS contribute
  key << 12 (identical across clusters, so argmin-neutral).
- Assignment: every sample goes to the LOWEST-COST cluster (ties: lowest
  cluster id), decided ONCE from T1 - no iteration. Memoized by exact
  event-vector signature (deterministic hash-free map over packed events).
- Recount into a fresh model with NO floor/cap enforcement (pure upper
  bound; empty clusters absent); tables T2 built and FULLY transmitted
  (table bytes included per the blueprint).
- The oracle map itself is FREE in gate arithmetic but REPORTED in the
  map_rep column as its honest packed size: ceil(log2(K)) bits per sample,
  MSB-first, over all planes' samples.

## V-P5 What each row NETTs

- REAL rows (V1b arithmetic): net = payload + tables('SBM1') +
  maps('SBP1') + trees('SBT1', KTREE only). Grid/flat rows have zero
  deterministic map bytes beyond SBP1.
- ORACLE rows (V1a arithmetic): net = payload + tables only; the free map
  and any keyed artifact appear ONLY in the reporting columns map_rep /
  tree_art so the freebie stays visible without polluting NET identity.

## V-P6 Sweep scope

Profiles {ZFFCTRL, HYB-A, HYB-B, HYB-C} x keyings {KGRID128, KTREE,
KFLAT16} x backends {B-IDEAL, B-RANS, B-BAC} per the blueprint V1 listing,
each with its ORACLE twin. KSHARED/KFLAT343 stay OUT of the V1 sweep (the
blueprint names three keyings; both remain reachable through the default V0
mode). --v1 additionally emits CONTROL + BRACKET rows and the three flat
B-IDEAL anchor configs (KSHARED/KFLAT16/KFLAT343, enforcement-exempt per
D4) so VB-anchor rails evaluate unchanged inside the v1 CSV.

## V-P7 Gate reading (restating addendum 18.1 verbatim for the evaluator)

Per image: relpct = 100 * (net_ctrl - net_cand) / net_ctrl with net_ctrl =
the fresh B-ADAPT ZFFCTRL replay payload on the same image. V1a margin of a
configuration = median over the quad of its ORACLE relpct values; V1b
margin likewise from REAL rows. M_a = max V1a median over configurations,
M_b = max V1b median; ties break by (profile, backend, keying) name order.
V1a PASS iff M_a >= 2.0; V1b PASS iff M_b >= M_a / 2; V1 PASS iff both.
Gate verdicts NEVER flip the exit code (rail-integrity checks do); on any
FAIL the STOP clause fires: bucket B1 declared unreachable with the dated
CSV as evidence, owner informed before any pivot blueprint.

## V-P8 Wall-clock accounting

The blueprint's V1 guard (<= 3.0x bench-ideal quad time) inherits amendment
A3's recorded structural deviation: the sandbox instrument really codes
every row with rANS/BAC engines while bench-ideal walks brackets, so the
ratio is structurally larger and O(N) per config as blueprinted. The
measured ratio is logged in the run output and tracker; no measurement
depends on it.

- the Builder
