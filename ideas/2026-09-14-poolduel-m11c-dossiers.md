# Poolduel M11c: static-first per-pooler dossiers (Refs #302)

Date: 2026-09-14. Branch `opencode/issue302-poolduel-m11c`.
Milestone M11c of `ideas/2026-09-13-poolduel-redesign.md` (website
rebuild: six dossiers on the 7-section-ID contract with full config
tables, filters, resource-evidenced diagnostics). No `Closes #302`
(intermediate milestone; M11d/M12 remain). No owner notification
(mandate rule 6: silence until publishable).

## What was built

- `poolduel/harness/dossiers.py` (new): bundles in,
  `results/dossiermeta.json` out. Reads committed m1/m2/m9
  medians plus report.json plus raw records; `--apply` splices
  fragments into `DOSSIER:pin/lifecycle/config/flat/verdict/na/
  resources` markers in each `poolduel/<slug>/index.html`.
- Six dossiers: pgagroal, pgbouncer, pgpool, odyssey, pgcat (migrated
  to markers, live-fetch scripts replaced by filter-only scripts),
  plus new `poolduel/supavisor/index.html` on the identical template
  (6 N/A statement-twin rows, zero measured cells, honest smoke-gate
  note). Prev/next chain rewired pgcat -> supavisor -> pgagroal.
- Config tables: every M1+M2+M9 row per contender (140 rows total),
  deduped to the max-repeats evidence per cell (M9 re-measured M1/M2
  geometries under their original ids: 146 duplicate pairs). M1/M2
  settings reuse each page's own static markup verbatim (parsed,
  never re-typed); M9 rows generated from median geometry with a
  matrix.csv pointer. Peak cell tagged PEAK, matching the live JS.
- Verdict/flatness/N-A/resource blocks pre-rendered; resource
  evidence aggregates measured raw (median CPU/RSS, iron record,
  auth/dataset posture, PG enforced/disclosed/other).
- `poolduel/assets/poolduel-charts.js`: live lookups now cover m9
  medians with max-n dedupe, so served-page enhancement never
  clobbers pre-rendered M9 rows with "no record".
- `poolduel/tests/test_m11c_dossiers.py` (17 tests): dedupe,
  na-class settings parse, no-tag load cells, re-render stability,
  supavisor N/A honesty, peak tagging, Tester note-shape contract,
  plus drift tests (meta vs bundles, pages vs meta, template
  sameness, zero loading cells).
- `check.py:check_dossier_coherence`, `repro.sh --dossiers`, README
  repro docs, `docs/spec-v1.md` M11c close note, master index nav
  gains the Supavisor dossier link.

## Why this shape

- Template sameness across all six pages is the neutrality
  guarantee: same sections, same order, same generator, no pooler
  gets a longer story (checked by test).
- Dedup by max repeats (not latest leg, not averaging): powered
  M9 evidence (n=7/10) supersedes pilot M1/M2 evidence (n=3/5) for
  the same cell; the note keeps raw per-leg bundle counts so the
  Tester M2 regression contract still verifies exact medians.
- Supavisor ships its 6 N/A rows with nulls, never zeros: a new
  contender with no measured cells is a published finding, never a
  silent exclusion (M7 rule).

## Verification

- 617/617 unittests green (600 existing incl. the Tester PR321
  note-shape suite, 17 new).
- `check.py` rc=0 (binaries, ratios, caps, site + dossier coherence).
- `repro.sh --dossiers` green; second run byte-identical meta
  (idempotent re-apply, unescape-stable settings parse).
- Served-HTTP smoke: all six dossiers 200 with zero "loading",
  filter buttons present, master index links Supavisor.
- `node --check` clean on the edited charts JS.

## Key files

- `poolduel/harness/dossiers.py`, `poolduel/results/dossiermeta.json`
- `poolduel/<slug>/index.html` (six), `poolduel/index.html` (nav)
- `poolduel/assets/poolduel-charts.js` (m9 lookups)
- `poolduel/tests/test_m11c_dossiers.py`,
  `poolduel/harness/check.py`, `poolduel/repro.sh`
- `poolduel/docs/spec-v1.md`, `poolduel/README.md`

## Follow-ups

- M11d: supplementary sections (guide, architecture, methodology,
  reproducibility) plus design system polish.
- M12: reproducibility package plus red-team pass, then the single
  completion notification (tag owner). Chart figures for dossiers
  (own-m9 twins) belong to M11d chart work if the blueprint
  requires them; tables already carry M9 evidence.

- the Builder
