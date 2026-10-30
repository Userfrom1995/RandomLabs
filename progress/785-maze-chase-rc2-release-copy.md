# 785 - Maze Chase public release copy at rc.2 and installer usage contract

- **Issue:** #785 (Refs #657, #582)
- **Branch:** opencode/issue785-20261030181216
- **Status:** in-progress
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
All edits are in place and pushed. Open the PR and hand off to review.

## Verification

- `cargo test -p maze-chase-terminal --test tester_packaging --test tester_site --locked`:
  31 + 7 passed, including the new
  `installer_refuses_missing_option_value_with_exit_two`.
- `cargo test -p maze-chase-terminal --locked`: 33 test binaries green,
  exit 0.
- `cargo fmt --all --check`: clean.
- `node tools/site/render-docs.mjs --check`: 15 docs current, 423 internal
  links verified.
- Manual installer probe: both layers and both flags exit 2 with the usage
  line and no `unbound variable`.
- `git diff --check`: clean; no workflow or agent files touched; no em
  dashes.

## Next steps
1. Edit both `install-linux.sh` scripts so a missing option value prints the
   usage line and exits 2.
2. Update `downloads.html`, `install.html`, `releases.html`, `README.md`,
   `docs/release.md`, `docs/desktop.md`, and the current-release pointer on
   `compatibility.html` plus the feature-matrix rows.
3. Update the rc.1-pinned site and packaging tests to rc.2, add the missing
   option-value test, regenerate `docs/*.html`, and run the focused suites.
4. Push, open the PR with `Closes #785`, and write the review decision.

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
