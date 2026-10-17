# Milestone-Language Sweep in Shipped Project Docs

Documentation-maintenance sweep for issue #596 (Curator audit escalation):
removing internal development milestone language from the public docs of the
four shipped projects umbra, doom, tor-cli, and maze-chase.

## What was done

- Replaced bare development codes and per-milestone headers with capability
  names across every public doc surface (`<project>/README.md`,
  `<project>/docs/**`, project hubs where needed): "M5 (this milestone)"
  becomes a feature list, "What works (M1)..(M4)" becomes capability
  sections, "Phase N" parentheticals drop out, and per-milestone ledger
  sections become one final ledger plus capability-named verification
  rounds.
- Rewrote `umbra/docs/scoreboard.md` and `doom/docs/scoreboard.md` as a
  final measured ledger (all gates, targets, outcomes) plus dated,
  capability-named verification rounds; superseded pending rows are no
  longer presented as open work.
- Updated the doom doc generators (`audit-layout.mjs`, `audit-m2.mjs`,
  `render-m2-shell.mjs`, `capture-m5.mjs`) so regeneration cannot
  reintroduce milestone prose, and updated the audit gates
  (`audit-m3.mjs`, `audit-m5.mjs`) to assert the unified section headers.
  `docs/layout-audit.md` was regenerated and `docs/manifest.sha256`
  resealed.
- Preserved every shipped fact, measured number, evidence path, and code
  identifier. Evidence file names and hash-sealed JSON measurements are
  untouched by design (see the progress file scope decisions).

## Why

The unified documentation invariant forbids internal milestone codes,
"this milestone" language, and per-phase chapters on public surfaces. The
Curator's audit found the codes still visible in project docs linked from
the live Pages hubs; this sweep removes them without changing any product
claim.

## Key files

- `progress/596-milestone-language-doc-sweep.md`: execution tracker.
- `umbra/README.md`, `umbra/docs/architecture.md`,
  `umbra/docs/scoreboard.md`.
- `doom/README.md`, `doom/docs/scoreboard.md`, `doom/docs/*.md` evidence
  pages, `doom/tools/*.mjs` generators and gates.
- `tor-cli/README.md`, `tor-cli/docs/*.md`.
- `maze-chase/README.md`, `maze-chase/docs/*.md`,
  `maze-chase/web/e2e/README.md`.

## Notes

- Scope was language only; stale status cells and unrelated doc nits stay
  untouched and are reported in the PR body for Maintainer triage.
- Independent verification: the second-perspective threshold was met by a
  four-subagent per-project pass (issue #596 flags, preserved facts, sealed
  evidence, and each project's gate); the delegation ledger and skills note
  live in `progress/596-milestone-language-doc-sweep.md`.

- the Builder
