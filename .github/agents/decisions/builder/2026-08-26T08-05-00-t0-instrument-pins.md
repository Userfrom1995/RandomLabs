# T0 instrument extension: superseding and converging structural pins

- **Role:** the Builder
- **Date:** 2026-08-26 (Builder slice Q0 of the T-series program, PR #146,
  issue #130)
- **Authority:** spec addendum 20 (algorithmic-spec.md section 20) and the
  T-series blueprint (`architecture-jxl-parity-tseries.md` section 1) are
  binding. Two Builder sessions opened slice Q0 concurrently; both landed
  pre-measurement pin records (2026-08-26T08-00-00 first, this one minutes
  later). This record RESOLVES the overlap: it supersedes exactly one
  reading of the earlier record with the addendum-verbatim justification,
  ADOPTS the rest of that record's readings wholesale, and adds the
  remaining implementation pins. Nothing here retunes any addendum-20
  constant; all of it lands BEFORE any `bench-sandbox --t0` row exists.

## P-T0-1 SUPERSEDES 08-00-00 P-T0-1/P-T0-4/P-T0-5 shape: class16 stays INSIDE every group stack

Addendum 20.2 is a three-index sentence: "GROUP STACK X_j: per-(class16
class, bin kind, key) event counts ... exactly the counting layout of
addendum 18.2". The earlier record's "one cluster row per group over
(kind, key) only" drops the middle index and would silently demote the
joint locality-context mechanism - the exact thing research v3 says was
never measured - into another single-axis replacement. Binding reading for
all T-machinery:

    stack X_j[g][(class16 c, kind off + key)] with n0/n1 per cell
    'SBC1' u32 stride = 16 * SandboxModel::init_stride(ZFFCTRL)
                       (the PER-PROTOTYPE block folds the class16 axis)
    prototype/cluster row id = k * 16 + c   (clusters = K * 16)
    ceiling joint cluster id = g * 16 + c   (clusters = G * 16)

Prototype estimation pools member groups' stacks into a SandboxModel whose
cluster axis indexes (k, c) joint cells and runs build_tables_enforced
VERBATIM (prior = image-global pooled across prototypes; every smoothing
constant is the shipped 18.2 arithmetic). Assignment words stay ONE WORD
PER GROUP over alphabet K - the class16 axis is resolved causally on both
sides exactly as in every prior row family.

## P-T0-2 Lloyd metric realization

Bins flatten to the interleaved outcome counts (n0 then n1) of every
(class, kind offset + key) cell in ascending cell order (P-T0-1 layout);
RAWBITS excluded (no table entries), TOKEN zero-span under ZFFCTRL. Term =
floor(((X' - P')^2 << 16) / (X' + P')), X' = X + 1, P' = P + 1; accumulated
in unsigned 128-bit and saturating-clamped to INT64_MAX for the int64
argmin comparison; distances are never serialized and never reported as
data.

## P-T0-3 ADOPTS 08-00-00 P-T0-3 verbatim (seeding/loop/drop)

Total event count = sum of ALL n0+n1 entries of the stack. First center =
max total, ties lowest group id; next centers maximize the minimum distance
to already-chosen centers among NOT-YET-CHOSEN groups (candidate exclusion
is this record's only addition), ties lowest id; assignment ties lowest
prototype id; centroids are per-bin SUMS; convergence = assignment vector
unchanged, hard cap 16 iterations; empty prototypes drop ONCE afterwards,
survivors renumber ascending, EVERY group reassigned to its nearest
surviving prototype by the same metric (ties lowest new id), centroids NOT
recomputed after the drop, transmitted K = survivor count. A constant
image collapses to transmitted K = 1 (the --self-check-t0 direction
fixture).

## P-T0-4 ADOPTS 08-00-00 P-T0-6 verbatim (assignment symbol rANS)

Single-state symbol rANS on the vendored port's constants L = 1 << 23,
scale_bits = 12 (M = 4096); frequencies = the blob-carried 4096-normalized
context histogram (support >= 1 by construction); encoder walks words in
REVERSE raster-group order per plane, planes concatenated in plane order;
flush writes the u32 state; decoder reads forward from 4 bytes; round-trip
unit-bound both directions.

## P-T0-5 ADOPTS 08-00-00 P-T0-5 blob skeleton as amended by P-T0-1

'SBC1', u32 K, u32 stride (= 16 x profile stride here), u32 profile_id,
u16[K * stride] priors raw, u32 coded_len + plane-rANS(pin D6) bytes over
delta_raw ++ ctx_raw (delta_raw = K * stride s16 pairs proto_u12 -
prior_u12; ctx_raw = K u16 pairs assignment histogram), u32 crc32 over
prior_bytes ++ delta_raw ++ ctx_raw, u32 assign_nwords, u32 assign_len +
symbol-rANS words. Audit counter counts every emitted byte once; decoder
mirror exact; expect-match compares prior, p, context AND words.

## P-T0-6 CEILING mode

Per-group exact stacks with NO budget pass (exactness by construction; the
decomposition columns expose the true serialized cost). Joint ids g * 16 +
c arrive through NEW keyings KGROUP64 / KGROUP128 (position tile x shipped
ac_v2_prior_class reduction) so counting, serialization ('SBM1' verbatim at
clusters = G * 16), B-RANS coding and decode mirrors all reuse the existing
paths unchanged. assign column pinned 0 on every ceiling row.

## P-T0-7 'SBP2' wide merge map

Joint raw ids exceed 'SBP1's u8 entries: magic 'SBP2'; u16 raw-cluster
count; u16 entry per raw cluster (final id, range-checked); trailing u32
CRC32 over everything before it; audit-counter contract identical to
'SBP1'. ClusterMap consumes it transparently (internal vector stays u32).

## P-T0-8 Shrinkage integer form

ADOPTS 08-00-00 P-T0-8 including its test-limit reading: cp[bin] =
n_child(bin) * 4096 + a_c * parent_u12(bin) through the standard
normalize_counts_4096 pass (floor + largest remainder, support floor 1,
ascending-id ties). The blueprint matrix line "a_c -> 0 limit reproduces
parent entry" reads as its INVERSE limit (a_c large / n_child zero); the
addendum 20.3 formula is authoritative. Consequences unit-bound: a_c = 0
reproduces child ML normalization; zero-count child reproduces the parent
proportions EXACTLY; every child table sums to exactly 4096; decoder mirror
step-equal.

## P-T0-9 'SBD1' layout

ADOPTS 08-00-00 P-T0-9 verbatim: 'SBD1', u32 nchildren = 343, u32 stride,
u32 profile_id, u8[343] parent map (ac_v2_prior_class per context),
u16[16 * stride] ALL class16 pooled rows, u32 coded_len + plane-rANS over
the 343 * stride s16 delta stream (child_u12 - parent_u12), u32 crc32 over
parent_map ++ class16 bytes ++ delta_raw. Decoder mirror exact; truncation/
CRC hard-detect; expect-match surface as P-T0-5.

## P-T0-10 ADOPTS 08-00-00 P-T0-10 verbatim (scope, fixtures, schemas)

--t0 measures kodim01 ONLY (any other input refused); anchors first
(SANDBOX control, BRACKET, anchor trio exactly like every other phase so
VB-anchor-* guard the CSV); TB rows re-run the S4 composition procedure
FRESH in-process (winner by real NET bytes, ties ADAPT = the denominator of
every payload_pct_gain column); candidate rows T0,<img>,CEIL|CB<K>,<gs>,<be>
,... with NET = payload+tables+maps+trees+assign (I12 extended) and
mandatory decomposition columns; PROTO/AMIRROR rail-fixture rows emitted by
the live run; synthetic self-check fixtures generated deterministically
in-process, tagged SYNTHETIC, carrying NO anchor rows, excluded from
anchor-coverage rules.

## P-T0-11 ADOPTS 08-00-00 P-T0-11 verbatim (non-gating boundary)

Every T0 diagnostic readout prints but NEVER gates; only VB-* rail-
integrity checks flip exit codes, and only inside probe_sandbox.sh. No quad
verdict number exists at T0; T1a starts that series.

## P-T0-12 ZZ-HU identity

ZZ-HU is a ROW-SCHEMA LABEL ONLY: TokProfile::HYB_C reused verbatim
(addendum 18.3 ladder ESC-C); no tokenization code exists behind the name.
The --t0 smoke emits one ZZHU identity row echoing profile id 3 so the
wiring is provably present before T3 ever reads it.

## P-T0-13 Explicit-count model cap

SandboxModel::init(explicit count) raises its guard 4096 -> 16384 joint
cells (GS64 kodim13-class geometry needs 288 groups x 16 classes = 4608
rows). Allocation stays bounded and sandbox-only; no production path is
touched.

## STATUS

Committed 2026-08-26 BEFORE any T-row exists, reconciling the two
concurrent Q0 openings into ONE implementable reading. The 08-00-00 record
stands as first-landed provenance; where the two disagreed, this record
follows addendum 20 verbatim and says so above. T-BASE fresh-in-run
comparisons begin at slice Q1 (T1a); zero container/format bytes spent or
exposed anywhere in this slice.

- the Builder
