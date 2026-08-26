# T0 instrument extension: structural pins before any measurement

- **Role:** the Builder
- **Date:** 2026-08-26 (Builder slice Q0 of the T-series program, PR #146,
  issue #130)
- **Authority:** spec addendum 20 (algorithmic-spec.md section 20) and the
  T-series blueprint (`architecture-jxl-parity-tseries.md` section 1) are
  binding. This record fixes ONLY the structural readings those texts leave
  open - all BEFORE any `bench-sandbox --t0` row exists (same discipline as
  records 2026-08-25T16-20-00 / 2026-08-25T21-30-00 / 2026-08-25T22-30-00 /
  2026-08-25T23-00-00 / 2026-08-25T23-45-00). No constant here may be retuned
  after a measurement has been seen.

## P-T0-1 Lloyd metric bin flattening

The symmetric chi-square distance operates on BIN VECTORS realized as the
interleaved outcome counts (n0, n1) of every (class16 class, kind offset +
key) cell of the ZFFCTRL counting layout, flattened in ascending (class,
kind, key) order - n0 before n1 within a cell. RAWBITS carries no table
entries and is excluded; TOKEN has zero span under ZFFCTRL. Distances are
accumulated in unsigned 128-bit and saturating-clamped to INT64_MAX for the
int64 argmin comparison; they are never serialized and never reported as
data (addendum 20.2 verbatim).

## P-T0-2 'SBC1' exact byte layout

Little-endian throughout: magic 'SBC1'; u32 K; u32 stride = the PER-
PROTOTYPE span, defined as 16 * SandboxModel::init_stride(ZFFCTRL) (the
class16 axis folds into the prototype's table block, matching the counting
layout "cluster := group" reading); u32 profile id; the image-global prior
tables as raw u16 pairs (stride entries, UNCOMPRESSED); u32 coded_len;
then ONE plane-rANS application (pin D6 scheme) over the concatenation
delta_raw ++ assignctx_raw, where delta_raw is K * stride s16 pairs
(proto_u12 - prior_u12) and assignctx_raw is K u12 pairs (the 4096-
normalized assignment-word histogram over alphabet K); trailing u32 =
CRC32 over prior_bytes ++ delta_raw ++ assignctx_raw. Decoder mirror exact;
truncation/CRC/trailing-byte hard-detect; expect-match tamper surface
identical to deserialize_tables.

## P-T0-3 Ceiling mode budget policy

T1a ceiling stacks are measured with NO cluster-budget enforcement (no
4096-sample floor, no K_MAX cap): "per-group EXACT static stacks" is read
as exactness by construction, and the mandatory decomposition columns exist
precisely to expose the true serialized-table cost. The joint (group tile,
class16) cluster id is g * 16 + c delivered by new keyings KGROUP64 /
KGROUP128 (position tile from the pinned GS64/GS128 geometry crossed with
the shipped ac_v2_prior_class reduction); tables serialize through the
EXISTING 'SBM1' hierarchical serializer with clusters = G * 16 - it already
IS the global-prior + s16-delta rANS-compressed CRC32 shape addendum 20.2
names. Zero assignment bits by construction (assign column pinned 0).

## P-T0-4 Assignment-word container 'SBA1'

Magic 'SBA1'; u32 word count; RANS_NS = 4 interleaved states using the SAME
local-port constants (RB_L = 2^23, RB_M = 2^16) and the SAME reverse-order
interleaving discipline as B-RANS (global symbol index g handled by state
g % NS, encoded in descending g so forward pops decode ascending); multi-
symbol rANS coding each word against the blob-carried single 4096-
normalized context (cumulative frequencies computed once, ascending symbol
order). Word order: raster group order within a plane, planes in plane
order (plane-major, pin P-T0-5). Encoder emits proto_of_group[g];
decoder reconstruction must equal the encoder sequence exactly (VB-assign-
mirror rail + unit tests on random AND skewed fixtures).

## P-T0-5 Group identity and geometry

gid = plane_group_base + ty * tiles_x + tx with tiles_x/tiles_y from the
pinned GS64/GS128 geometry (ceil division; partial right/bottom edge groups
counted in full); plane_group_base accumulates in plane order (plane-major).
Group identity is per-plane (no cross-plane grouping, addendum 20.2).

## P-T0-6 Seeding and drop determinism

Farthest-point seeding excludes ALREADY-CHOSEN groups from the candidate
pool; ties resolve to the LOWEST group id among remaining candidates, so a
fully degenerate (all-identical-stacks) corpus seeds centers in ascending
id order. Assignment ties go to the lowest prototype id. After convergence
(or the 16-iteration cap) empty prototypes drop ONCE with ascending
renumbering and ONLY the dropped prototypes' member groups reassign to
their nearest surviving prototype under the same metric; transmitted K
adjusts downward accordingly. A constant image therefore collapses to
transmitted K = 1 with every word tied to prototype 0 (the --self-check-t0
direction fixture).

## P-T0-7 Prototype estimation output shape

Member groups' stacks pool into a SandboxModel whose cluster axis indexes
(k, c) joint cells (clusters = K * 16, row id k * 16 + c); build_tables_
enforced runs VERBATIM on that model, so the image-global prior pools
across prototypes (whole image) and every smoothing/normalization constant
is the shipped 18.2 arithmetic (pseudo-count 32 geometric/uniform per kind,
normalize to exactly 4096, support floor 1, ascending-id largest-
remainder). The codebook's smoothed content is thus byte-comparable with
the ceiling machinery's tables.

## P-T0-8 'SBP2' wide merge map

The joint (g, c) raw ids exceed 'SBP1's u8 entry width, so the T-series
carries its own map format: magic 'SBP2'; u16 raw-cluster count; u16 entry
per raw cluster (final id, range-checked); trailing u32 CRC32 over
everything before it. Same audit-counter contract as 'SBP1' (serializer
audit == blob length). Decode-side ClusterMap consumes it transparently
(the merge vector stays u32 internally).

## P-T0-9 Shrinkage integer realization

Child shrinkage reuses the PINNED normalize_counts_4096 arithmetic
verbatim: per alphabet cell, weighted counts w_i = n_i * 4096 +
a_c * p_parent_u12(i) and total W = N_child * 4096 + a_c * 4096, then out_i
= 1 + floor(w_i * (4096 - n_entries) / W) with the leftover distributed by
largest fractional remainder, ascending-index ties (support floor 1).
Consequences tested, not assumed: a_c -> 0 reproduces the unshrunk child ML
proportions; N_child = 0 reproduces the parent entry EXACTLY (parent u12
sums to 4096, so the floors leave zero leftover); every child table sums to
exactly 4096; the 'SBD1' decoder mirror is step-equal. Binary cells are the
two-entry case of the same function (no separate rounding path).

## P-T0-10 'SBD1' exact byte layout

Magic 'SBD1'; u32 nchildren = 343; the parent map as u16 entries [343]
(parent of residual-DIFF context cq = ac_v2_prior_class(cq), the SHIPPED
class16 reduction - encoder and decoder compute nothing; the map rides the
blob); the global class16-pooled prior tables as raw u16 pairs (16 *
stride entries, UNCOMPRESSED); u32 coded_len; ONE plane-rANS application
over child_delta_raw = 343 * 16 * stride s16 pairs (child_u12 -
parent_u12); trailing u32 CRC32 over parentmap_bytes ++ prior_bytes ++
child_delta_raw. Decoder mirror exact; truncation/CRC hard-detect;
expect-match tamper surface as P-T0-2.

## P-T0-11 ZZ-HU identity

ZZ-HU is a ROW-SCHEMA LABEL ONLY: TokProfile::HYB_C reused verbatim
(addendum 18.3 ladder ESC-C). No tokenization code exists behind the name.
The --t0 smoke emits one ZZHU identity row echoing profile id 3 so the
schema wiring is provably present before T3 ever reads it.

## P-T0-12 T0 CSV grammar and gating discipline

All T0 rows are prefixed `T0` in field 1 with kinds PROTO / ASSIGN / CBOOK /
CEIL / LLOYD / SHRINK / ZZHU in field 3. The dated file
`benchmarks/results/YYYY-MM-DD-sandbox-t0.csv` carries anchors + rails +
DIAGNOSTIC smoke rows on kodim01 ONLY, explicitly marked non-gating (no
quad verdict numbers exist at T0; they start at T1a per addendum 20.6).
Rail-integrity checks VB-proto-roundtrip / VB-assign-mirror / VB-net-audit-t
FLIP exit codes; gate rejections never do (addendum 20.1 verbatim). NET
identity extends to every codebook row: net = payload + tables + assign +
cbook; ceiling rows additionally assert assign = 0 (decomposition identity).

## P-T0-13 Explicit-count model cap

SandboxModel::init(explicit count) raises its guard 4096 -> 16384 joint
cells: the GS64 quad worst case (kodim13-class geometry, 768x512) needs
288 groups x 16 classes = 4608 rows. Allocation stays bounded and
sandbox-only; no production path is touched.

## STATUS

Committed 2026-08-26 BEFORE any T-row exists. Addendum 20 precedes this
record and is unchanged; every reading above narrows implementation
freedom, never the gates. T-BASE fresh-in-run comparisons begin at slice
Q1 (T1a); zero container/format bytes spent or exposed anywhere in this
slice.

- the Builder
