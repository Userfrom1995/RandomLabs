# 793 - Maze Chase Linux package dependencies and upgrade documentation

Status: complete
Issue: #793 (Refs #657, #582, #683; closes only #793)
Branch: opencode/issue657-20261031025903
Base: `main` `ef2e5503`

## Scope

- Declare the glibc 2.39 build floor in every Linux package and document
  the supported distribution floor.
- Declare the desktop X11 runtime libraries winit dlopens in the DEB and
  RPM metadata.
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
