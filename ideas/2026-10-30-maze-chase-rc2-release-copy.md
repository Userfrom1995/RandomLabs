# Maze Chase: rc.2 public release copy and a strict installer usage contract

## Problem

The rc.2 macOS artifacts are correct: the app is ad-hoc signed, passes
`codesign --verify --deep --strict`, and a quarantined download shows the
unidentified-developer dialog instead of the damaged-app refusal. The public
site and docs still told users to install rc.1, called the current macOS app
unsigned, and told them to build from the current tree. The Linux installers
also expanded `"$2"` under `set -euo pipefail`, so a bare `--prefix` or
`--tarball` died with `$2: unbound variable` instead of a usage exit.

## What changed

- Every current-release pointer on the site, README, and release guide now
  names `maze-chase-v0.1.0-rc.2` (tag `e6be3beb`, release run 41080938033,
  13 assets, prerelease). The rc.1 record stays truthful: it is unchanged at
  `11a0037b`, its macOS app fails code-signature verification, and it opens
  as damaged.
- The macOS copy now states the ad-hoc signature and the verification it
  passes, never notarization or an Apple Developer ID. On macOS 15+/26 the
  Gatekeeper approval is System Settings > Privacy & Security > Security >
  Open Anyway; a right-click Open can still end at the Not Opened dialog.
- `docs/desktop.md` is copied into the dmg and tarball as
  `README-desktop.md`. The published rc.2 asset is immutable, so the page
  says the corrected text ships in the next candidate rather than claiming
  the rc.2 dmg changed.
- Both Linux installers share the same guarded option parser: a missing or
  empty `--prefix` / `--tarball` value prints the usage line and exits 2,
  unknown arguments keep exit 2, and the contract test proves it for both
  layers and both flags.

## Files

- `maze-chase/downloads.html`, `install.html`, `releases.html`,
  `compatibility.html`
- `maze-chase/README.md`, `docs/release.md`, `docs/desktop.md`,
  `docs/feature-matrix.md`
- `maze-chase/packaging/{terminal,desktop}/install-linux.sh`
- `maze-chase/crates/terminal/tests/tester_site.rs`,
  `tests/tester_packaging.rs`, `tests/common/mod.rs`

## Notes

The rendered `docs/*.html` pages are regenerated from their Markdown sources.
Historical dated records (`docs/scoreboard.md`, `docs/terminal-compat.md`)
keep their rc.1 evidence because that is the artifact those runs measured.
No workflow file is touched and no release is cut here.
