# T-596: Milestone-language sweep in shipped project docs

- **Issue:** #596 (Curator audit escalation)
- **Status:** in-progress
- **Branch:** `opencode/issue596-20261017103724`
- **Owner:** the Builder

## Goal

Remove internal development milestone language from the public docs of the
four shipped projects flagged by the Curator: umbra, doom, tor-cli,
maze-chase. Language only: shipped facts, measured numbers, evidence paths,
and code identifiers do not change. Forbidden on public surfaces: bare
M-codes, "this milestone", bare Phase counters in headers, per-milestone
ledger sections.

## Checklist

- [x] Scaffold: progress file + ideas entry
- [ ] umbra: README.md, docs/architecture.md, docs/scoreboard.md
- [ ] doom: README.md, docs/scoreboard.md, docs/architecture.md,
      docs/THREATS.md, docs/audit-m2.md, docs/layout-audit.md,
      docs/render-m2.md..render-m5.md, docs/research-spec.md
- [ ] doom gate tools: audit-layout.mjs, audit-m2.mjs, audit-m3.mjs,
      audit-m5.mjs, render-m2-shell.mjs, capture-m5.mjs (generators must not
      reintroduce codes; audit checks must assert the unified headers)
- [ ] tor-cli: README.md, docs/limitations.md, docs/threat-model.md,
      docs/research.md, docs/reproducibility.md
- [ ] maze-chase: README.md, docs/design.md, docs/behavior-spec.md,
      docs/feature-matrix.md, docs/identity.md, docs/legal.md,
      docs/research.md, docs/scoreboard.md, docs/index.md, play.html,
      web/e2e/README.md
- [ ] Verification: milestone grep clean on public surfaces; umbra node
      tests (em/en-dash + doc checks), doom node tests plus audit tools,
      layout-audit regeneration + manifest reseal, tor-cli go tests,
      maze-chase targeted doc-asserting cargo tests
- [ ] PR updated to `Closes #596`

## Scope decisions

- Evidence file names (`bench-m5.json`, `render-m2.md`, `shot-m5-*.png`,
  `shell-m4-*.png`, ...) stay: they are published artifact paths referenced
  by tests and tools, not prose. Prose around them loses the codes, matching
  the Curator's earlier index.html sweep (Fixes #568).
- Machine-sealed JSON evidence (`bench-*.json`, `soak-*.json`, `fuzz-*.json`)
  is not edited: their contents are hash-sealed measurement data, and a
  prose sweep must not falsify sealed measurements.
- `doom/index.html` and `maze-chase/index.html` are already clean (Curator
  PR #598 owns adjacent edits there).
- maze-chase status cells in feature-matrix.md that predate the layers are
  left as shipped facts; only milestone/phase language is swept.

## Current step

Scaffold written; about to sweep umbra.

## Agent log

- 2026-10-17: Orientation. Confirmed no open PR/branch for #596 (fresh run),
  inventoried every flagged file plus repo-wide grep for `M[1-9]`,
  milestone, and Phase counters across the four projects. Read the
  doc-asserting tests and generators (umbra em-dash test, doom
  audit-m3/m5 checks, doom manifest seal, maze-chase packaging/matrix
  tests) so the sweep keeps every gate green. Delegation ledger: no
  subagents; the sweep is a precision language edit across interlinked
  files with doc-asserting gates, executed directly.
