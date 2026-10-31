# 793 - Maze Chase Linux package dependencies and upgrade documentation

Status: complete
Issue: #793 (Refs #657, #582, #683; closes only #793)
Branch: opencode/issue657-20261031025903
Base: `main` `ffe54275` (rebased from `ef2e5503` through review rounds)

## Scope

- Declare the glibc 2.39 build floor in every Linux package and document
  the supported distribution floor.
- Declare the desktop display runtime libraries winit dlopens (X11,
  X11-xcb, and Wayland) in the DEB and RPM metadata.
- Replace bare `dpkg -i` / `rpm -i` install copy with dependency-resolving
  `apt install ./...` / `dnf install ./...` commands.
- Document the same-NEVRA candidate replacement path (`dnf reinstall` /
  `rpm -U --replacepkgs`) while keeping the RPM Release field at `1` for
  the installed release workflow's filename glob.
- Extend the release Linux smoke and the packaging regression suite to
  assert the metadata.
- Do not bump the workspace version, cut a stable tag, close a parent
  issue, or edit the release workflow source.

## Checklist

- [x] Add the shared glibc floor constant and package metadata
- [x] Declare desktop X11 runtime dependencies in DEB and RPM
- [x] Extend `smoke-linux.sh` to assert the metadata
- [x] Add packaging regression tests (static plus built-package metadata)
- [x] Update `docs/terminal.md`, `docs/desktop.md`, `docs/release.md`
- [x] Regenerate the rendered docs HTML
- [x] Update `install.html`, `downloads.html`, `compatibility.html`
- [x] Run the packaging, site, workspace, and verifier gates
- [x] Push and open the PR with `Closes #793` and the parent refs

## Current step

Implementation and local verification are complete; the branch is pushed
and the PR is open for review.

## Next steps

None in this increment. The installed release workflow's RPM glob
(`maze-chase-*-1.*.rpm`) stays valid because the Release field remains
`1`; the stable cut and the parent-issue close belong to the release
lane.

## Verification

- Built a desktop deb/rpm in a scratch fixture tree with a cargo shim;
  `dpkg-deb --field` shows the X11 libraries and `libc6 (>= 2.39)`, and
  `rpm -qp --requires` shows the X11 libraries and `glibc >= 2.39`.
- `packaging/release/smoke-linux.sh --deb <deb> --rpm <rpm>` passes
  against those artifacts.
- `cargo test --workspace --locked --no-fail-fast` passes after installing
  the host's ALSA/udev headers and `libxkbcommon-x11-0` (the same runtime
  libraries this change declares).
- `cargo run --release --locked --bin maze-chase-verify`: 19/19 checks.
- `cargo fmt --check`, `node tools/site/render-docs.mjs --check`
  (15 docs, 424 links), and `bash -n` on all touched scripts pass.

## Agent log

- 2026-10-31 (fixer): delegation ledger for the round-2 verification,
  which re-ran the above-threshold gate set on the rebased tree:
  - general: packaging regression suite; returned 34/34 passed including
    the floor, docs, and built-metadata tests, `cargo fmt --check` clean,
    and 8/8 `bash -n` plus `shellcheck -S warning` clean.
  - general: hermetic package build and smoke; returned both desktop
    packages built with an interception-proven cargo shim and
    `smoke-linux.sh` OK on both, metadata carrying `libc6 (>= 2.39)`,
    `glibc >= 2.39`, and the four X11 runtime libraries.
  - general: Linux floor doc consistency; returned CONSISTENT with no
    weak-symbol claim remaining and `render-docs --check` green
    (15 docs, 424 links).
  - Primary context: applied the forced-install correction in
    `docs/release.md`, regenerated `docs/release.html`, verified the
    rendered source hash matches, and rebased onto `origin/main`
    (`c28215a1`) before rerunning the gates.
  - Skills: no registry skill matched; `AGENTS.md` conventions applied.
- 2026-10-31 (fixer, review round 3): delegation ledger for the findings:
  - general: package metadata verification; returned PASS on the X11-xcb
    and Wayland declarations, exact smoke matching, and 34/34 packaging
    tests with `dpkg-deb`/`rpm`/`rpmbuild` present.
  - general: adversarial smoke probe; returned PASS with the control RPM
    exiting 0 and a libXi-removed RPM exiting 1 naming `libXi`.
  - general: docs consistency audit; returned PASS with no stale X11-only
    list and no false `GLIBC_2.39` abort claim, `render-docs --check` green.
  - Primary context: applied the dependency, exact-match, and GLIBC 2.35
    corrections across the scripts, docs, rendered pages, and tests, then
    rebased onto current `origin/main` before rerunning the gates.
  - Skills: no registry skill matched; `AGENTS.md` conventions applied.
