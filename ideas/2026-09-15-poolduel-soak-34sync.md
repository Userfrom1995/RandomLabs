# 2026-09-15 - Poolduel soak 34-group sync - derived bundles plus pins

Re-dispatch commits 9c08348b + 4ff63721 landed 16 more M10 soak
tier-groups on top of e7675597 (18 groups). Committed soak truth is
now 34 of 36 groups (156 raw, 27 measured plus 7 timeout/inconclusive
medians); only M10-S3/3600 odyssey + pgcat are absent (chunks m10s35 /
m10s36 recorded version files but no raw, so they stay
Maintainer-owned re-dispatch, never interpolation).

What this sync did (harness outputs only, zero new numbers):
- Rebuilt every derived bundle from committed data with the existing
  generators, no code change: `repro.sh --report` (soak leg only;
  m1/m2/m9 bytes identical, statistics family 98 / headlines 96
  unchanged), `--site`, `--dossiers`, `--supplement`, `--charts`
  (6 soak figures over 34 medians / 156 raw), `--manifest`
  (2395 files sealed).
- Moved 7 pinned test files from the partial-18 state to the
  34-group truth (test_soak_tiers, test_m13a_soak_figure,
  test_m11b_site, test_m12_manifest, test_m12_tester_gate,
  test_tester_pr348, test_tester_pr349_crash). Tripwires now pin
  the 2 known-absent triples; a final re-dispatch landing them
  fails loudly until bundles rebuild again.
- Synced `docs/m10-soak-matrix.md` status + section 8 (present
  table per tier, remaining manifest m10s35/m10s36), appended a
  `docs/errata.md` ledger row plus the matching reproducibility
  page row, and updated the root README + landing soak counts
  (34 medians / 27 measured / 7 timeout / 156 raw).

Verification: 745/745 unittests green, `check.py` ok, page JS
`node --check` clean, served-HTTP smoke on master + six dossiers
(200s, 6 soak figure hosts, zero pending in soak section).

Still open (not this slice): m10s35/m10s36 re-dispatch
(Maintainer-owned), M13b final section-11 gate, Tester
sample-cell repro, single @Userfrom1995 notification. Refs #302.
