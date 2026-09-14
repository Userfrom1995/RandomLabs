# Poolduel M11d: supplementary sections plus design system (Refs #302)

Date: 2026-09-14. Branch: this run (`opencode/issue302-*`).
Status: M11d slice of `ideas/2026-09-13-poolduel-redesign.md` (website
rebuild, plan section 10). M11a (statistics publication), M11b
(static-first master report), and M11c (six dossiers) are merged;
this change adds the four supplementary pages plus the shared design
system. M12 (reproducibility package plus red-team plus single
completion notification) remains. No `Closes #302`: close rule is
binding (explicit @Userfrom1995 approval only).

## What was built

- Four static-first pages, relative links only, zero pending/loading
  content, no CDN, no Mermaid renderer:
  - `poolduel/guide/` - contender picker, decision tree, needs table,
    FAQ (native details plus open-all), glossary, onboarding ladder.
  - `poolduel/architecture/` - six-way taxonomy (cited to
    `docs/configs/`), lifecycle text diagrams per pooler, honest
    absent memory-per-1000-idle table (never estimated), mode matrix.
  - `poolduel/methodology/` - claim registry, run-rules table
    (shared load, best-mode), M10 statistics prose, disclosure
    minimums, mandatory threats list.
  - `poolduel/reproducibility/` - one-command runbook, per-cell
    recipe, manifest/digest/corpus note, BibTeX with copy button,
    data-availability statement, challenge flow, errata and
    verified-by tables (honestly empty, never silent).
- Shared design system: `poolduel/assets/poolduel-theme.css` (dark
  default, light via data-theme, print rules, permalinks, picker,
  FAQ, glossary) plus `poolduel/assets/poolduel-ui.js`
  (enhancement-only: theme toggle with localStorage, heading
  permalinks, contender-picker jumps, BibTeX copy with fallback,
  FAQ open-all; `node --check` clean).
- Generator: `poolduel/harness/supplement.py` (bundles in,
  `results/supplementmeta.json` out: counts, six pooler pins, file
  SHAs, banner sentence; `--apply` splices one meta fragment into
  `SUPPLEMENT:meta` markers; idempotent). Master index banner now
  links all four pages; each page links back plus a prev/next ring.
- Wiring: `repro.sh --supplement`, `check.py`
  `check_supplement_coherence` (meta drift plus markers plus IA
  plus no-pending), README repro docs, spec-v1 s6 M11d note.
- Tests: `poolduel/tests/test_m11d_supplement.py` (14 tests: meta
  drift, SHA match, idempotent apply, markers, IA lock, shared
  assets, two-way nav, content blocks).

## Verification

- Full suite 640 green (was 626: 14 new), `check.py` ok,
  `repro.sh --supplement` idempotent, page JS `node --check` clean.
- Served-HTTP smoke: master plus all four pages 200 with
  `supplement-counts` fragments; zero `pending`/`loading` as
  visible content (fetch-failure note path untouched on master).

## Key files

- `poolduel/guide/index.html`, `poolduel/architecture/index.html`,
  `poolduel/methodology/index.html`,
  `poolduel/reproducibility/index.html`
- `poolduel/assets/poolduel-theme.css`,
  `poolduel/assets/poolduel-ui.js`
- `poolduel/harness/supplement.py`,
  `poolduel/results/supplementmeta.json`
- `poolduel/tests/test_m11d_supplement.py`
- `poolduel/harness/check.py`, `poolduel/repro.sh`,
  `poolduel/README.md`, `poolduel/index.html`,
  `poolduel/docs/spec-v1.md`

## Notes

- Numbers on the four pages come only from `supplementmeta.json`
  (itself counted from bundles); prose never carries a measurement.
- The memory-per-1000-idle table is deliberately dashes: the soak
  sweep owns that measurement and fabrication is forbidden.
- M12 remains: manifest-hash build, pinned digests, log corpus,
  DOI snapshot, Tier-1 plus Tier-2 plus mobile green, fairness
  byte-match, Tester repro, single @Userfrom1995 notification.

- the Builder
