# T0 instrument extension: structural pins before any machinery output

- **Role:** the Builder
- **Date:** 2026-08-26 (Builder slice Q0 of the T-series, PR #146,
  issue #130)
- **Authority:** spec addendum 20 (algorithmic-spec.md section 20) and the
  T-series blueprint (`architecture-jxl-parity-tseries.md`) are binding.
  This record fixes ONLY the structural readings those texts leave open -
  all BEFORE any `bench-sandbox --t0` row exists (same discipline as
  records 2026-08-25T16-20-00 through 2026-08-25T23-45-00). No constant
  here may be retuned after a measurement has been seen.

## P-T0-1 Group stacks as counting-model rows

A group stack X_j IS one cluster row of the existing `SandboxModel` layout:
per-(kind, key) n0/n1 event counts of the ZFFCTRL profile, stride = the
18.2 layout. Groups are realized as an EXPLICIT per-sample ClusterMap
(cluster := group), so counting reuses `count_plane` unchanged. Global
group id = plane_index * groups_per_plane + local raster id; planes never
share a stack (addendum 20.2 "no cross-plane grouping"). Partial right/
bottom edge tiles count in full; local id = (y / gs) * tiles_x + (x / gs).

## P-T0-2 Lloyd metric flattening order

"Sum over bins" reads as: every stride entry contributes TWO scalar terms,
its n0 count then its n1 count, iterated in ascending entry order. With
X' = X + 1 and P' = P + 1 the term is floor(((X' - P')^2 << 16) / (X' + P'))
in int64. Order cannot affect the sum; it is pinned so independent
implementations stay comparable.

## P-T0-3 Lloyd init/loop/drop details

- Total event count of a group = sum of ALL its n0+n1 entries.
- First center: max total, ties to lowest group id.
- Next centers (deterministic farthest-point): maximize the minimum
  distance to already-chosen centers, ties to lowest group id.
- Assignment ties: lowest prototype id. Centroid update: per-bin SUMS of
  member stacks (n0 and n1 summed independently), never means.
- Convergence = assignment vector unchanged from the previous iteration;
  hard cap 16 iterations, whichever first.
- Empty prototypes are dropped ONCE after the loop ends: survivors keep
  relative order and are renumbered ascending; every group is reassigned to
  the nearest surviving prototype by the same pinned metric (ties lowest
  new id); transmitted K becomes the survivor count. Centroids are NOT
  recomputed after the drop.

## P-T0-4 Prototype estimation identity

Prototype tables = `build_tables_enforced` applied verbatim to the centroid
model (K rows). That IS the pinned 18.2 pipeline (pseudo-count 32,
geometric r = 15/16 for positional kinds, uniform otherwise; normalize to
exactly 4096 with support floor 1 and ascending-id largest remainder)
against the image-global pooled prior. No new smoothing mathematics exists
in T0.

## P-T0-5 'SBC1' blob layout (little-endian throughout)

    'SBC1'
    u32 K                      transmitted prototype count
    u32 stride                 18.2 profile stride
    u32 profile_id             (uint32_t)TokProfile
    u16[K * stride]            prior tables (image-global pooled u12 rows)
    u32 coded_len              plane-rANS (pin D6) over delta_raw ++ ctx_raw:
                               delta_raw = K*stride s16 pairs
                               (proto_u12 - prior_u12); ctx_raw = K u16
                               pairs (assignment context histogram,
                               4096-normalized u12)
    u32 crc32                  over prior_bytes ++ delta_raw ++ ctx_raw
    u32 assign_nwords
    u32 assign_len + bytes     symbol-rANS stream (P-T0-6)

Audit-counter semantics identical to serialize_tables (every emitted byte
counted once); decoder mirror exact; expect-match compares prior, p AND the
context histogram AND the words.

## P-T0-6 Assignment-word symbol rANS

Single-state symbol rANS sharing the vendored port's constants:
L = 1 << 23, scale_bits = 12 (M = 4096). Frequencies = the blob-carried
4096-normalized context histogram (support >= 1 guaranteed by the u12
normalization). Encoder walks words in REVERSE raster-group order per plane
(planes concatenated in plane order), emits bytes on renorm; flush writes
the u32 state big-endian. Decoder reads forward, init from 4 bytes. Exact
round-trip is unit-bound both directions.

## P-T0-7 CEILING mode serialization

Per-group exact stacks = the group model counted WITHOUT any budget pass,
tables through the EXISTING 'SBM1' serialize_tables (global prior +
per-group s16 deltas, plane-rANS once, CRC32 over uncompressed bytes) and
fully NETTED as `tables`. No codebook, no clustering, no assignment bits BY
CONSTRUCTION (assign column = 0 on every ceiling row). Decomposition
columns payload_pct_gain (vs fresh same-run T-BASE winner NET), tables_bytes
and assign_bytes ride EVERY t0 row so the T1a fail clause stays mechanically
readable without re-measurement.

## P-T0-8 Shrinkage integer form and test-limit reading

p_hat(child bin) realizes as cp[bin] = n_child(bin) * 4096 + a_c *
parent_u12(bin) followed by the standard normalize_counts_4096 pass (floor +
largest remainder, support floor 1, ascending-id ties) - integer-exact and
scale-correct. Test-matrix limits bind to the FORMULA of addendum 20.3:
a_c = 0 reproduces the child ML normalization exactly (parent weight gone);
a large child total drives the parent term relatively to zero; a zero-count
child reproduces the parent-proportional normalization. (The matrix row
"a_c -> 0 reproduces parent entry" reads as its inverse limit a_c large /
n_child zero; the formula is authoritative and this note fixes the reading
before any T2 measurement.)

## P-T0-9 'SBD1' blob layout

    'SBD1'
    u32 nchildren              343
    u32 stride                 18.2 profile stride
    u32 profile_id
    u8[343] parent map         parent class16 id per context (bytes)
    u16[16 * stride]           ALL class16 pooled u12 rows (decoder needs
                               every parent row to rebuild any child)
    u32 coded_len + bytes     plane-rANS (pin D6) over the 343*stride s16
                               delta stream (child_u12 - parent_u12)
    u32 crc32                  over parent_map ++ class16 bytes ++ delta_raw

Decoder mirror exact; expect-match surface like deserialize_tables.

## P-T0-10 Diagnostic scope, fixtures, and row schemas

- --t0 measures kodim01 ONLY (addendum 20.6); any other input is refused.
- Anchors first: the SANDBOX control, BRACKET, and anchor trio rows are
  emitted exactly like every other sandbox phase, so VB-anchor-adapt /
  VB-anchor-ideal guard the t0 CSV against the committed reference.
- T-BASE rows (`TB,<img>,<cand>,<trial>,<be>,payload,tables,maps,trees,net,
  audit,rt`) re-run the S4 composition procedure FRESH in-process (same
  schema semantics as S4 rows); the winner by real NET bytes (ties ADAPT)
  is the denominator of every payload_pct_gain column.
- Candidate rows (`T0,<img>,CEIL|CB<K>,<gs>,<be>,payload,tables,maps,trees,
  assign,net,audit,rt,tbl_bits,gain_pct,assign_rep`): CEIL x {GS64,GS128} x
  B-RANS(+B-IDEAL reference), CB x K in {4,8,16,24} x GS64/GS128 x B-RANS.
  NET = payload+tables+maps+trees+assign (I12 extended).
- Rail fixture rows emitted by the live run: `PROTO,<img>,<sbc1|sbd1>,
  rt_ok,trunc_det,crc_det,tamper_det` and `AMIRROR,<img>,<fixture>,ok`.
- Synthetic self-check fixtures (two-half opposite-skew, constant) are
  SELF-CHECK ONLY: generated deterministically in-process, tagged SYNTHETIC
  in the image column, carrying NO SANDBOX/BRACKET anchor rows and excluded
  from anchor-coverage rules (they never touch committed references).

## P-T0-11 Non-gating boundary

Every T0 diagnostic readout (gains, best-K, smoke verdicts) prints but NEVER
gates; only VB-* rail-integrity checks flip exit codes, and only inside
probe_sandbox.sh. No quad verdict number exists at T0; T1a starts that
series.

- the Builder
