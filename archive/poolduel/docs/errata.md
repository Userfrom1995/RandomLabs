# Poolduel errata + verified-by ledger (M12, plan section 12.2)

> Refs #302. This file is the machine-checked source for the errata and
> verified-by tables on the reproducibility page. The drift test
> (`tests/test_m12_manifest.py`) fails when the page tables disagree with
> this ledger. Corrections raise trust; silent edits kill it.

## Errata

| Date | Cell / page | Issue | Fix |
|---|---|---|---|
| 2026-09-15 | M10 soak, 18 of 36 (cell, arm, duration) groups absent from git | Harness defect: `runner.run_plan` wrote raw records as `CELL-ARM-rN.json` with no duration tier, so the 30-min and 60-min tiers of one arm wrote identical filenames and the `poolduel-m10-soak` aggregate's flat-dir copy kept one tier per arm (last-writer-wins); `write_medians` grouped by `(cell_id, pooler)`, ignoring duration. Proven: 34 of 36 chunks uploaded `pooler-versions-*.txt` while only 18 tier-groups reached `results/m10-soak/raw/`; the success run's artifacts have expired, so the lost tier is unrecoverable from artifacts. | Filenames now carry the tier (`M10-S1-1800s-direct-r1.json`, soak cells only; M1/M2/M9 names byte-identical); grouping is `(cell_id, duration_s, pooler)` everywhere. The surviving 18 medians were rebuilt tier-labeled with numerically identical values (verified by comparison). The absent 18 groups are listed for Maintainer re-dispatch in `docs/m10-soak-matrix.md` section 8; nothing interpolated, nothing carried forward. |
| 2026-09-15 | M10 soak re-dispatch, 16 more groups landed (34 of 36 in git); M10-S3/3600 odyssey + pgcat still absent | Re-dispatch ran the fixed harness (tiered filenames); all 36 chunks now carry `pooler-versions-*.txt`, but chunks m10s35/m10s36 recorded versions without raw, so no medians exist for those two tiers. Proven from `results/m10-soak/raw/` (156 files, 34 tier-groups) vs `SOAK_CHUNKS` order. | Derived bundles rebuilt from committed data only (`report.json` soak leg 27 measured + 7 timeout, `sitemeta`/`dossiermeta`/`supplementmeta`/charts/manifest re-applied; M1/M2/M9 bytes identical, statistics family 98 unchanged). The remaining 2 groups stay Maintainer-owned re-dispatch per `docs/m10-soak-matrix.md` section 8; nothing interpolated, nothing carried forward. |
| 2026-09-15 | M10 soak final landing, all 36 of 36 groups in git; coverage complete | Final re-dispatch of chunks m10s35/m10s36 produced raw for M10-S3/3600 odyssey + pgcat (both measured). Proven from `results/m10-soak/raw/` (162 files, 36 tier-groups) vs `SOAK_CHUNKS` order. | Derived bundles rebuilt from committed data only (`report.json` soak leg 29 measured + 7 timeout, `sitemeta`/`dossiermeta`/`supplementmeta`/charts/manifest re-applied; M1/M2/M9 bytes identical, statistics family 98 unchanged). No group interpolated, zero-filled, or carried forward. |

## Verified-by

No independent re-runs recorded yet. Tester sample-cell repros land here
with run links (date, verifier, cell, result).
