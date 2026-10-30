# 785 - Maze Chase public release copy at rc.2 and installer usage contract

- **Issue:** #785 (Refs #657, #582)
- **Branch:** opencode/issue785-20261030181216
- **Status:** in-progress
- **Updated:** 2026-10-30

## Checklist
- [x] orient: rc.2 is published (`maze-chase-v0.1.0-rc.2` at `e6be3beb`, run 41080938033, 13 assets, prerelease)
- [ ] point every current-release surface at rc.2 and the ad-hoc-signed macOS story
- [ ] document the macOS 15+/26 System Settings Open Anyway step and the immutable rc.2 bundled doc
- [x] guard missing `--prefix` / `--tarball` values in both Linux installers
- [ ] extend the installer and site contract tests
- [ ] regenerate rendered docs and run the site/packaging checks
- [ ] commit, push, open the PR, and hand off to review

## Current step
The installer guard and the public release-copy edits are in place. Extend
the tests, regenerate the rendered docs, and run the focused checks.

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
  recorded the rc.2 macOS ad-hoc signing and Gatekeeper facts.
- 2026-10-30 (builder): started from the rc.2 tag commit (`e6be3beb`),
  confirmed the live release metadata and the macOS rc.2 report, and scoped
  the change to the public copy, the two installers, and their tests. No
  workflow files, no release cut, no stable tag.
