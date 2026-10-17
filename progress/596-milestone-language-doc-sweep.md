# T-596: Milestone-language sweep in shipped project docs

- **Issue:** #596 (Curator audit escalation)
- **Status:** complete (awaiting review)
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
- [x] umbra: README.md, docs/architecture.md, docs/scoreboard.md
- [x] doom: README.md, docs/scoreboard.md, docs/architecture.md,
      docs/THREATS.md, docs/audit-m2.md, docs/layout-audit.md,
      docs/render-m2.md..render-m5.md, docs/research-spec.md
- [x] doom gate tools: audit-layout.mjs, audit-m2.mjs, audit-m3.mjs,
      audit-m5.mjs, render-m2-shell.mjs, capture-m5.mjs (generators must not
      reintroduce codes; audit checks must assert the unified headers)
- [x] tor-cli: README.md, docs/limitations.md, docs/threat-model.md,
      docs/research.md, docs/reproducibility.md
- [x] maze-chase: README.md, docs/design.md, docs/behavior-spec.md,
      docs/feature-matrix.md, docs/identity.md, docs/legal.md,
      docs/research.md, docs/scoreboard.md, docs/index.md, play.html,
      web/e2e/README.md
- [x] Verification: milestone grep clean on public surfaces; umbra node
      tests (em/en-dash + doc checks), doom node tests plus audit tools,
      layout-audit regeneration + manifest reseal, tor-cli go tests,
      maze-chase full workspace cargo tests
- [x] PR updated to `Closes #596`

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

Complete. PR #599 body carries `Closes #596` with the full per-project
summary, gate results, and the out-of-scope observations; the run's review
decision file is written. Handing off to the Reviewer.

## Agent log

- 2026-10-17: Orientation. Confirmed no open PR/branch for #596 (fresh run),
  inventoried every flagged file plus repo-wide grep for `M[1-9]`,
  milestone, and Phase counters across the four projects. Read the
  doc-asserting tests and generators (umbra em-dash test, doom
  audit-m3/m5 checks, doom manifest seal, maze-chase packaging/matrix
  tests) so the sweep keeps every gate green. Authoring ran directly (each
  edit was a precision language change against already-open files); the
  independent verification pass and its delegation ledger are recorded in
  the final agent-log entry.
- 2026-10-17: umbra done. README rewritten as one feature list (combat,
  content, rendering, polish); architecture title and module map de-coded
  (per-subsystem grouping, no per-phase annotations); scoreboard rewritten
  as a final G1-G7 ledger plus capability-named verification rounds with
  every measured number preserved. Evidence paths kept by decision. All 467
  umbra node tests green (incl. the no-em-dash README/scoreboard test).
- 2026-10-17: doom done. README and scoreboard rewritten as one final-ledger
  product view (H1-H5 plus G rows, capability-named verification rounds);
  architecture/THREATS/render proofs/research spec de-coded; generators
  (audit-layout, audit-m2, render-m2-shell, capture-m5) emit unified prose;
  audit-m3/m5 checks updated to the new headers (audit-m5's index.html scope
  check had been failing on main since #568 and now asserts the shipped
  label). README TTFF figures refreshed to the bench-m5 values (313.6 /
  269.4 / 35.2 / 1190) while replacing stale ones. Regenerated
  audit-m2.md (48/48) and layout-audit.md (15 checks, ALL PASS), resealed
  manifest.sha256 (5 artifacts). doom suite 424/424 green; audit-m3 52/52;
  audit-m5 96/96. bench-m5.json prose left untouched (machine evidence).
- 2026-10-17: tor-cli done. README de-coded (exit-code note, per-app and
  layout bullets); limitations.md title, hardening intro, and per-OS section
  labels capability-named; threat-model "delta" headers renamed to their
  subject; research spec title and delivery-order handoff de-coded;
  reproducibility title de-coded. Go code comments (internal) untouched by
  decision. go test ./... green.
- 2026-10-17: maze-chase done. README "What this will be" retitled "What it
  is", done markers de-coded, layout bullets lose "this phase" notes;
  design/behavior-spec/research/identity/legal/scoreboard/index/play.html/
  web-e2e de-coded ("Phase N" headers, per-phase obligations, final-phase
  audit label); feature-matrix status-word definition and section headers
  de-coded and the stale pre-layer note removed (the layer status cells
  themselves are left as shipped facts, flagged in the PR body together
  with the stale `levels/*.toml` mention in legal.md). Full workspace
  cargo tests green (344+ passing, docs-asserting tests included).
- 2026-10-17: Final verification. Public-surface grep (README.md, play.html,
  web/e2e/README.md and every docs/*.md across the four projects) shows no
  M-codes, milestone or phase counters except the intentional policy line
  maze-chase/docs/index.md:4. Out of scope by decision, logged for the PR:
  internal code/test comments and Cargo/binary strings, the authored maze
  header (levels/ember-warren.maze), machine evidence JSONs (bench-m5.json
  owner label prose), and stale planned/done cells in feature-matrix rows.
- 2026-10-17: Shipped. PR #599 body rewritten to `Closes #596` with the
  summary, gate table, and scope notes; decision file written for review.
- 2026-10-17: Independent verification pass (review finding 1). Ledger:
  four `general` subagents, one per project - umbra public-surface audit;
  doom public-surface audit plus sealed-evidence cross-check; tor-cli
  public-surface audit plus Go gate; maze-chase public-surface audit plus
  workspace gate. Returned: tor-cli clean, `go test ./...` green across all
  packages; maze-chase clean with 280/280 non-desktop cargo tests green
  (desktop needs system ALSA, absent in this runner); doom clean with
  audit-m2 regeneration byte-identical, audit gates green, and the manifest
  hash-exact for 4/4 sealed artifacts; umbra clean on the flagged docs but
  one real residue - "M1 shell" in `manifest.webmanifest`'s user-visible
  PWA description, swept in this pass. Primary verified itself: re-ran
  umbra 467/467, doom 424/424 plus audit-m2/m3/m5/layout, tor-cli
  `go test ./...`, the six non-desktop maze-chase crates, the manifest
  hash check, and the final public-surface grep (clean; only the
  intentional policy line and artifact filenames remain). Skills: no known
  skill fits a docs-language verification pass (`skills.md` lists only
  `customize-opencode`, for opencode configuration edits).
- 2026-10-17: Round-2 review fix. `umbra/docs/scoreboard.md:20` said "four
  capability rounds" while the section lists five; corrected to "five"
  (doom's counterpart stays "four": its section has exactly four rounds).
  umbra suite 467/467 green after the edit.
