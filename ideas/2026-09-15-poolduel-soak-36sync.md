# 2026-09-15 - Poolduel soak 36-group sync - full coverage plus SHA-rule hardening

The final soak re-dispatch (chunks m10s35/m10s36) landed M10-S3/3600
odyssey + pgcat, closing the last gap from the 34-group sync. Committed
truth is now all 36 of 36 (cell, arm, duration) groups in
`results/m10-soak/` (162 raw, 29 measured plus 7 timeout/inconclusive
medians, 36/36 chunk version files). No group is absent,
interpolated, zero-filled, or carried forward.

What was rebuilt (generators unchanged, outputs only, same regen order
as the 34-sync: report, site, dossiers, supplement, charts, manifest):

- `repro.sh --report`: soak leg 29 measured + 7 timeout, 6 soak_cells
  keys; `m10-soak/matrix.csv` gains the 2 landed rows; M1/M2/M9 bytes
  identical, statistics family 98 / headlines 96 unchanged (soak stays
  out of statistics by design).
- `--site`: soak leg total 36 / present 36 / measured 29 / missing 0;
  index section 6d reads complete (no best arm, no verdicts, as before).
- `--dossiers`: 6 poolers, odyssey/pgcat regain their M10-S3/3600 tier
  rows; zero absent rows on committed data (absent-row rendering stays
  for synthetic gaps, proven by fixture tests).
- `--supplement` + `--charts` (6 soak figures over 36 medians / 162 raw,
  timeout markers with zero absent markers) + `--manifest` (2401 files
  sealed, new build hash).
- Pins: 8 test files moved 34-state to 36-state with empty-absent
  tripwires (any future dropped group fails loudly); `soak_absent()`
  on committed data returns empty.
- Docs/surfaces: `m10-soak-matrix.md` status + section 8 rewritten to
  complete (per-tier present table verified cell-by-cell against
  medians.json), `errata.md` new ledger row + matching reproducibility
  page row, root README + landing soak counts (36/29/7/162, no pending
  re-dispatch clause).

SHA-rule hardening (Lab-flagged product scope): CI toolchain flakes
write `BLOCKED: <reason>` markers into `supavisor.sha`, and the M9
workflow passes the first field through `SUPAVISOR_SHA`. `pin_sha`
accepted any non-empty string, so a blocked toolchain rendered as a
recorded-SHA pass in the smoke gate. `pin_sha` now requires a full
40-hex commit SHA: BLOCKED markers, truncated values, and short hashes
raise ValueError, so the gate reports fail and the matrix entry stays
blocked. Test `test_sha_strips` updated to the honest rule plus a new
`test_blocked_markers_rejected` matrix.

Proof: 761/761 green, `check.py` ok, `--dry-run` intact,
`--manifest-verify` matches the committed hash, page JS `node --check`
clean, HTTP smoke 200s on master + six dossiers + four supplement pages
with zero static pending cells and the soak section reading complete.

Refs #302. No Closes: M13b final section-11 gate + explicit owner
approval remain. Next: Builder M13b (final gate verdict + single
@Userfrom1995 notification per the M13 closure blueprint).
