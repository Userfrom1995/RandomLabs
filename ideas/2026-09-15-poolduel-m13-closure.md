# Poolduel M13 Closure Blueprint: Soak Completion Figure + Section-11 Final Gate (Refs #302)

Date: 2026-09-15. Status: blueprint, ready for Builder.
Context: M5-M12 merged; M9 GREEN held (250 medians); M10 soak partial
(18/36 tier groups in `results/m10-soak/`, commit e7675597); tier-integrity
fix + bundle legs merged (tier-labeled medians, report/site/dossier/
manifest legs, errata filed). Missing 18 groups owned by Maintainer
re-dispatch (manifest in `poolduel/docs/m10-soak-matrix.md` s8); re-measured
tiers merge collision-free under the fixed tiered raw filenames.
No `Closes #302` without explicit @Userfrom1995 approval. No owner
notification until the single publishable ping.

## Summary

Close Poolduel in two Builder slices: M13a renders the soak stability
figure from committed bundles (present tiers measured, absent tiers marked
as re-dispatch-owned, never interpolated); M13b runs the full section-11
gate after the missing 18 land and sends the single completion ping.
Common ground preserved: best-mode per pooler on shared load, soak stays
out of the statistics family/headlines/claims by design (stability
estimand, n=3).

## Deliverables

- Soak chart figure (tps + resource/tail drift per arm per tier) generated
  from committed soak bundles by committed code, no hand values.
- Site section + dossier soak rows show both tiers with honest
  present/absent states; zero `pending` as visible content where data
  exists, explicit re-dispatch note where it does not.
- Final gate wiring: manifest verify, pagemeta/site/dossier/supplement
  drift, Tier-1 chart tests, Tier-2 vision read, mobile width, fairness
  byte-match re-check, Tester sample-cell repro.
- Single completion notification tagging @Userfrom1995 (what/where/
  evidence/limitations), only when every gate is green.

## Why

The soak leg currently exists as counts plus tier-rows in every bundle but
has no stability figure: a reader cannot see tps drift, RSS/FD drift, or
tail drift per arm per tier. That is the last open mechanism panel from
the redesign (plan section 7, m10-soak-matrix.md s6). Building the figure
now on partial-18 data (with honest absent marking) unblocks the page
work from the Maintainer-owned re-dispatch instead of serializing on it.

## How It Works

Execution is self-sufficient: no owner waits, no mid-flight questions.
M13a builds the figure against the 18 present groups; absent groups render
as labeled missing-tier marks sourced from the s8 manifest (read at build
time from `docs/m10-soak-matrix.md` or `harness/soak.py` chunk order, never
hand-typed). When the Maintainer lands the missing 18, the same generator
re-runs with no code change and the marks disappear. M13b is gated on all
36 groups present plus every verification tier green.

## Module Breakdown

- **Soak figure generator (M13a):** extend `harness/charts.py` with a soak
  figure (bundles in, option JSON + manifest SHA out, same
  bundles-in/no-hand-values contract as the 6 existing figures). X axis is
  numeric tier order (1800 s then 3600 s) per cell; one series per arm in
  the shared pooler palette; tps medians with min-max bands; drift shown as
  a paired pre/post resource panel (RSS/FD from committed `resources`
  fields, nullable-safe: absent resource fields mark `n/a (not recorded)`,
  never zero). Absent (cell, arm, tier) triples render as off-baseline
  markers with `tier not in git (re-dispatch owned by Maintainer)` labels,
  reusing the existing off-baseline marker convention. Timeout/
  inconclusive groups keep their honest finding marks, distinct from absent.
- **Site + dossier wiring (M13a):** `harness/site.py` soak panel gains the
  figure slot plus per-tier rows; `harness/dossiers.py` soak rows gain
  tier-suffixed labels for both tiers (already duration-aware; extend to
  absent-tier rows). `--apply` stays idempotent; second apply byte-identical
  meta. `repro.sh --charts` rebuilds the soak figure; `check.py` gains soak
  figure coherence (recompute + manifest SHA + no-pending-content where data
  exists + honest absent-note where it does not).
- **Final gate (M13b, after 18 land):** full `--report` rebuild determinism
  (m1/m2/m9 bytes identical, statistics family unchanged), manifest verify
  against committed hash, pagemeta/site/dossier/supplement drift suites,
  Tier-1 chart tests (numeric tier sort, off-baseline absent markers,
  empty-series dropped), Tier-2 vision read on the soak figure, mobile-width
  smoke, fairness-audit byte-match re-check on measured medians, Tester
  sample-cell repro. Only then the single @Userfrom1995 completion summary.
- **Out of scope (explicit):** soak never enters the statistics family,
  headlines, or claims (M12 decision stands); Supavisor stays out of soak
  per `SUPAVISOR_SOAK_DEFERRAL`; no re-tuning of pooler configs; no
  re-dispatch from Builder (Maintainer owns the 18 chunks).

## Data Structures & Interfaces

- Input: `results/m10-soak/medians.json` tier-labeled medians
  (`cell_id`, `duration_s`, `pooler`, tps median/min/max/n, status,
  context keys, quarantine flags) + `matrix.csv` + raw `resources`
  (nullable pre/post RSS/FD/CPU) + s8 absent manifest.
- Output: `results/charts/soak.json` option + manifest SHA refresh;
  `sitemeta.json`/`dossiermeta.json` soak figure slots; page fragments via
  existing `--apply` marker contracts (no new marker dialect).
- Public Builder interfaces (shapes, not code): `soak_figure(medians,
  absent)` returns option dict; `soak_absent()` derives triples from the
  spec chunk order so generator and docs cannot drift.

## Testing Strategy

- Unit: tier numeric sort (1800 before 3600, no lexicographic zigzag);
  absent-marker rendering for all 18 s8 triples; timeout vs absent marker
  distinction; nullable-resource `n/a` path; no hand values (figure values
  trace to medians fixture); idempotent apply.
- Deterministic Tier-1: rendered SVG coordinates encode fixture medians.
- Tier-2 vision: headless screenshot of the soak figure, read back values
  per cell/arm/tier against bundle medians; labels/legend/axes verified.
- Served-HTTP smoke on master + six dossiers; `repro.sh --charts` green;
  full suite green (no fixed count pinned in gate text).

## Milestone Roadmap (all Refs #302)

- M13a soak figure + site/dossier wiring on partial-18 data (PR 1, Refs)
- Maintainer re-dispatch of 18 missing chunks (no Builder PR; tracked in
  m10-soak-matrix.md s8)
- M13b final section-11 gate + single @Userfrom1995 notification (final PR,
  Closes only on full gate green plus explicit owner approval)

- the Architect
