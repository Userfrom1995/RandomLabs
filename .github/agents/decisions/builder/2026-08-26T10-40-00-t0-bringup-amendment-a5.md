# T0 bring-up repairs (amendment A5): four defects fixed BEFORE any
# measurement

- **Role:** the Builder
- **Date:** 2026-08-26 (Builder slice Q0 of the T-series program, PR #146,
  issue #130)
- **Authority:** the A2/A4b precedent - implementation defects discovered
  during instrument bring-up are repaired and numbered BEFORE any
  measurement row exists, each with a regression test that fails on the
  pre-fix code. No addendum-20 constant is retuned by anything below; every
  repair restores code to its pinned contract. All four were found by the
  new T0 unit suite and live fixtures while wiring slice Q0; zero `--t0`
  measurement rows existed when they landed.

## A5-1 crc32_combine dropped the running CRC state

`prism::crc32_combine(crc, data, len)` ignored `crc` entirely and returned
the CRC of the appended chunk alone. Every multi-part blob therefore
carried a CRC over ONLY its final section: 'SBM1' covered deltas but not
priors, 'SBC1' covered only the assignment context, 'SBD1' covered only
the delta stream (a flipped parent-map byte decoded silently). Fixed to
true incremental chaining (append semantics), so chained parts hash as
one contiguous span. All serializer/deserializer pairs in staticmodel use
symmetric append chains, so every format is repaired at once with no
layout change and no committed number affected (CRC values never appear
in any CSV). Regression: SBD1/SBC1 corruption tests now bite on parent-
map/priors flips (`test_staticmodel.cpp`).

## A5-2 Lloyd cold start assigned against unfilled zero centroids

The assign/update loop ran its FIRST assignment before any centroid update,
comparing group stacks against zero-filled prototypes. Symmetric distances
then tie to the lowest prototype id and the whole image collapsed to one
survivor regardless of K - T1b could never measure anything but K=1.
Fixed per the standard pinned reading ("iterate assign/update" from real
seeds): the farthest-point seed stacks initialize their prototype slots
before the first assignment. Collapse to K=1 remains reachable and is now
a MEASURED outcome (it genuinely occurs on kodim01 under the pinned chi-
square metric - see the dated CSV) instead of a structural artifact.
Regression: `LloydCluster.SeparatedStacksStaySplitDeterministically`.

## A5-3 'SBC1' serializer disagreed with its own pinned layout

P-T0-5 pins the stride field as the PER-PROTOTYPE block (16 x profile
stride; class16 folded into every row) and priors as u16[K x stride] per
joint row. The deserializer implemented exactly that; the serializer
asserted an impossible prior shape (K*16*S entries on a table whose global
prior row is S entries) and wrote stride = S. Any call would have thrown.
Serializer rebuilt to the pinned shape: shape-check against what
`build_tables_enforced` actually produces, replicate the image-global
prior into every joint row on write (decoder mirrors it losslessly),
stride field = 16 x S. Expect-match comparison extended accordingly.

## A5-4 'SBD1' decoder mirror indexed parents by a flat modulo

Reconstruction used `class16[i % (16*stride)]` instead of the transmitted
parent map, silently pairing children 16..342 with wrong parent rows;
the expect-compare also ignored child_delta. Both fixed: rebuild walks
each context's parent row through pmap[cq], and the tamper surface
compares child_delta too (P-T0-9 surface = P-T0-5). Additionally a_c = 0
is accepted per P-T0-8's unit-limit reading (reproduces child ML
normalization); negative pseudo-counts stay malformed.

## Consequences recorded beside the smoke measurement

- The words tail of 'SBC1' is NOT part of the CRC-covered span (pinned
  layout); word-stream corruption is caught by the rANS structure plus
  the expect_words surface. The VB-proto-roundtrip tamper probe therefore
  flips a CRC-covered content byte, not a words-tail byte.
- serialize_codebook gained an optional `words_tail_bytes` out-param so
  NET decomposition splits tables from assignment cost mechanically
  (pin P-T0-10's mandatory columns); no other API change.

## STATUS

Committed 2026-08-26 BEFORE any T-row existed. The dated diagnostic CSV
(`2026-08-26-sandbox-t0.csv`, kodim01 only, non-gating) was produced
entirely by post-repair code; all six VB rails + three new T-rails green;
137/137 unit tests. Zero container/format bytes spent or exposed anywhere
in this slice.

- the Builder
