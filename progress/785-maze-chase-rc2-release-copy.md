# 785 - Maze Chase public release copy at rc.2 and installer usage contract

- **Issue:** #785 (Refs #657, #582)
- **Branch:** opencode/issue785-20261030181216
- **Status:** in-review
- **Updated:** 2026-10-30

## Checklist
- [x] orient: rc.2 is published (`maze-chase-v0.1.0-rc.2` at `e6be3beb`, run 41080938033, 13 assets, prerelease)
- [x] point every current-release surface at rc.2 and the ad-hoc-signed macOS story
- [x] document the macOS 15+/26 System Settings Open Anyway step and the immutable rc.2 bundled doc
- [x] guard missing `--prefix` / `--tarball` values in both Linux installers
- [x] extend the installer and site contract tests
- [x] regenerate rendered docs and run the site/packaging checks
- [x] commit, push, open the PR, and hand off to review

## Current step
PR #789 is open for review. The reviewer's round-1 findings are applied and
re-verified; the remaining gates are the Tester, the Evaluator, and the
Maintainer merge.

## Verification

- `cargo test -p maze-chase-terminal --test tester_packaging --test tester_site --locked`:
  31 + 7 passed, including the new
  `installer_refuses_missing_option_value_with_exit_two`.
- `cargo test -p maze-chase-terminal --locked`: 33 test binaries green,
  exit 0.
- `cargo fmt --all --check`: clean.
- `node tools/site/render-docs.mjs --check`: 15 docs current, 423 internal
  links verified.
- Manual installer probe: both layers, both flags, bare and empty values,
  exit 2 with the usage line and no `unbound variable`; unknown flags still
  exit 2.
- `git diff --check`: clean; no workflow or agent files touched; no em
  dashes.

## Next steps
1. Reviewer re-review of the round-1 fixes.
2. Tester verification, then the binding Evaluator gate.
3. Maintainer merge and issue close.

## Delegation (reviewer round 1)
- explore: stale rc.1 pointer sweep across README/site/docs. Result: no current rc.1 pointers; historical rc.1 records intact; every current pointer names rc.2 and run 41080938033.
- general: installer option-value probe on both layers and both flags. Result: bare and empty values exit 2 with the usage line and no `unbound variable`; unknown flags exit 2.
- general: release-claim checker bypass audit. Result: the targeted "not unsigned but notarized" bypasses are rejected and negated forms stay allowed; residual sentence-boundary and contraction edge cases noted as out of scope for this round.
- skills: no skill fits this release-copy/shell/test task.
Primary verified: focused cargo suite (31 + 7), `cargo fmt --all --check`, and `node tools/site/render-docs.mjs --check` (15 docs, 423 links).

## Agent log
- 2026-10-30 (builder): guarded `--prefix` and `--tarball` in both Linux
  installers (usage line, exit 2, no `$2` expansion under `set -u`), updated
  the current-release copy on the site/README/release guide to rc.2, and
  recorded the rc.2 macOS ad-hoc signing and Gatekeeper facts. Also updated
  the compatibility page and feature-matrix rows so no public page still
  presents rc.1 as the current published artifact, taught the release-claim
  checker to allow a negated "not notarized" while still rejecting a positive
  notarization claim, regenerated the rendered docs, and ran the focused and
  full terminal suites.
- 2026-10-30 (builder): started from the rc.2 tag commit (`e6be3beb`),
  confirmed the live release metadata and the macOS rc.2 report, and scoped
  the change to the public copy, the two installers, and their tests. No
  workflow files, no release cut, no stable tag.
- 2026-10-30 (fixer): applied the reviewer's round-1 findings. Rewrapped the
  macOS approval path so `>` never starts a Markdown line and regenerated
  `docs/release.html`; narrowed the release-claim negation check to filler
  words and added the "not unsigned but notarized" bypass cases; corrected
  the `install.html` embedded-guide name; rewrote the release-notes paragraph
  to stop claiming rc.2 carries the fuller wording; and extended the
  installer test to cover empty values and rule out the unknown-argument arm.
