# Poolduel M11b: static-first master report (Refs #302)

Date: 2026-09-14. Second slice of the M11 website-rebuild chain
(blueprint `ideas/2026-09-13-poolduel-redesign.md`, operative plan
`864738b` v2.2, section 10 step 1). Branch:
`opencode/issue302-20260914103956`.

## What was wrong

The master report shipped hardcoded `pending` tables that only filled
via JS fetch, cryptic cell IDs, throughput without beside-latency, and
420px chart hosts. Any no-JS reader (or failed deploy) saw placeholders
instead of numbers. Plan section 10 step 1 requires static-first: every
public number pre-rendered in table plus chart plus CSV plus raw JSON,
plain-words titles, throughput beside latency, text badges, and a
Throughput|Latency|All-Telemetry toggle.

## What was built (harness + page + docs, no sweep, zero numbers claimed)

- `harness/site.py`: stdlib generator (bundles in, pre-render facts
  out). Claim titles come from `statistics.CLAIM_CELLS` (registered
  wording, no duplication); plain-words titles derive from `M1_CELLS`
  geometry; integers thousand-separated. Emits `results/sitemeta.json`
  (5 executive cards, 7 flagship rows, 52 M2 rows, M9 leg, matched-only
  iso slices, flatness with named peak+trough, source SHAs) and
  `--apply` splices fragments into `index.html` between
  `SITE:<name>:begin/end` markers.
- `index.html`: new section 0 executive cards (verified-only; claim 4
  ships `inconclusive` per the kill rule, never as a win); section 5
  flagship baseline (7 rows, plain-words titles, throughput beside p99,
  all six arms per row, `Best in class` badges, column toggle);
  section 6 M2 blocks (52 per-cell rows, N/A arms named); new section
  6c M9 leg (215 measured of 250, family 98, 96 Holm-gated headlines);
  section 7 iso/flatness pre-rendered. Zero `pending` as visible
  content. `.echart` hosts raised to 560px min-height. Inline JS is
  enhancement-only (same 3 bundle URLs, toggle wiring, honest
  fetch-failure note); charts still load via the vendored ECharts
  5.5.1 SVG path untouched.
- Wiring: `repro.sh --site`, `check.py` site coherence (sitemeta
  recompute + SHA + marker presence), README repro docs.
- `tests/test_m11b_site.py`: 19 tests (formatting, titles, cards incl.
  kill-rule, fixture generators, sitemeta drift + SHAs, marker
  byte-match, no-pending-content, badges/toggle/560px).

## Verification

- Full suite 586 green, `check.py` ok, page JS `node --check` clean,
  HTML parses, served-HTTP smoke shows 5 cards + 7 `Best in class`
  badges + formatted bands (`24,039 [23,305-24,716]`).
- M3 inline-JS contract preserved (same 3 fetch URLs, `pending` word,
  `esc` function) so `test_tester_m3_report` stays green.

## Follow-ups (not this PR)

- M11c: six dossier rebuilds (full config tables + lifecycle
  blueprints + resource-evidenced diagnostics, same 7-section
  contract) reading the committed bundles.
- M11d: supplementary sections (`/guide/`, `/architecture/`,
  `/methodology/`, `/reproducibility/`) plus design system.
- M12: reproducibility package + red-team pass + single completion
  notification.

Refs #302. No Closes, no owner notification (mandate rule 6:
notify once when publishable; M11/M12 remain).

- the Builder
