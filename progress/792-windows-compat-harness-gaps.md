# 792 - Windows compatibility harness gaps

Status: complete
Issue: #792 (Refs #655, #786)
Branch: opencode/issue792-20261105060842
Scope: test harness only. No shipped game, site, or workflow behavior change.

## Defects

- W1: `run-windows.ps1` recorded `disposition: pass` from a 110x30 host
  that only ever painted the too-small card (issue #657 report comment
  6532711345). The collector's too-small gate reads the transcript, and
  Windows rows have none by design, so the card alone signed a pass.
- W2: the compat unit suite was not Windows-portable: `probe-graphics.py`
  imports `termios` at module top, the executable-bit assertion assumes
  POSIX mode bits on NTFS, and the macOS separator test invokes `bash`
  (which resolves to the WSL launcher on Windows runners).
- W3: the documented `python3 -m http.server` site E2E path aborts mid-crawl
  on Node 22.23.4 with an undici `Parser.finish` assertion, so the final
  game/asset assertions never run.
- L6 (scope addition from the Linux rc.2 row): `run-linux.sh` accepted a
  malformed `--initial 100x40x50` and never validated `--wide`/`--small`,
  while `run-macos.sh` rejected the same value, and the unit suite covered
  only the macOS runner.

## Checklist

- [x] Collector: a Windows `pass` requires measured console geometry at or
      above 62x35 (below the floor is `unverified`, unknown is `partial`),
      every fixed-session checkpoint capture, and a recorded build identity
- [x] `run-windows.ps1`: record measured console geometry and build
      identity, size the console to the requested (>= floor) geometry, and
      grade from the captured checkpoint set
- [x] Portable unit suite: lazy `termios` import, platform-gated mode-bit
      and bash-driven tests
- [x] Shared geometry parser sourced by `run-linux.sh` and `run-macos.sh`,
      validating `--initial`/`--wide`/`--small`, with tests on both runners
- [x] Keep-alive Node static server for the web E2E harnesses, deterministic
      lifecycle, and a `Connection: close`/drain/continue client path in
      `site-e2e.js` so a request failure can never abort the crawl
- [x] Docs and harness tests updated
- [x] Full verification recorded, PR opened (PR #821)

## Agent log

- 2026-11-05: claimed the lane after #788 merged (the #786 harness rewrite
  is on main), surveyed the current collector/runner/site harness, and
  wrote this plan. No work exists on an earlier branch for this issue.
- 2026-11-05: implemented all four lanes. `collect.py` gates a Windows
  pass on measured geometry >=62x35 (too small is unverified), all seven
  fixed-session captures, and the build identity; `run-windows.ps1`
  requests `-Initial` (default 100x40, rejects below-floor requests),
  records the measured console and build identity, and grades from them.
  The compat suite skips POSIX-only cases on Windows and `probe-graphics.py`
  imports `termios`/`tty` lazily. A shared `run-options.sh` validates
  `--initial`/`--wide`/`--small` for both transcript runners. The web
  suites now start `web/e2e/serve-site.js` (HTTP/1.1 keep-alive,
  deterministic lifecycle) and `site-e2e.js` drains every body, requests
  `Connection: close`, and records a failed fetch without aborting the
  crawl. Verification: 86 compat unit tests pass, 37 node tests pass,
  `render-docs --check` clean, `pwsh` parse clean, `bash -n` clean.
  PR #821 is open for review.

- 2026-11-05 (fixer, review round 1): F2's `-Initial` validation exited 1
  behind a terminating `Write-Error` and threw on Int32 overflow; the fix
  uses one `Fail` helper (`[Console]::Error.WriteLine` plus `exit`) for the
  geometry, platform, dependency, and binary checks, and `[int]::TryParse`
  with case-sensitive `-cnotmatch`/`-csplit` (`100X40` is malformed like the
  bash parser). `docs/release.md` now states the browser E2E runner starts
  its own HTTP/1.1 keep-alive `web/e2e/serve-site.js` (python3 only
  allocates ports), and `release.html` is regenerated. The build pass
  recorded no delegation ledger, so this fix pass runs the remaining
  above-threshold work through the protocol and records the real ledger:
  - Delegation ledger (fix pass, 3 areas):
    - general: pwsh `-Initial` validation matrix -> reproduced rc 1 from
      terminating `Write-Error`, confirmed `TryParse` rejects Int32
      overflow, supplied the fixed matrix (rc 2).
    - explore: stale E2E serving references -> only `release.md:34` and
      generated `release.html:60` were E2E-stale; manual-play
      `http.server` references stay.
    - explore: delegation ledger and skills precedent -> required fields
      and house-style examples from `progress/783`, `785`, `786`.
    - general: full verification suite -> 88 compat tests OK, 37 node
      tests pass, render-docs 15/424, `bash -n` clean, pwsh parse clean.
    - explore: diff audit against F1/F2/F3 -> F2/F3 closed; flagged F1
      still open (now addressed by this entry).
  - Primary verified: read `run-windows.ps1:36-114`, applied and ran the
    pwsh matrix (malformed, below-floor, overflow, and uppercase inputs
    exit 2; valid 100x40 reaches the platform check with exit 3),
    regenerated `release.html`, and added the pwsh-gated
    `TestWindowsInitialValidation`.
  - Skills: no registry skill fits a compatibility-harness repair
    (`customize-opencode` is for opencode configuration); no skill loaded.

- 2026-11-05 (fixer, review round 2): addressed N1-N10 from the second
  review. `run-windows.ps1` now passes the global `wt --size` option
  before `new-tab` (N1), anchors `-Initial` with `\A...\z` so a trailing
  newline is malformed like the bash parser (N7), and its argument order
  is pinned by `TestWindowsLaunchCommandOrder`. `collect.py` validates
  the build identity formats at runtime (N2), treats non-dict geometry
  containers as unknown instead of crashing (N3), and enforces the
  documented clean zero-code game exit on a Windows pass (N4). The
  transcript runners reject a value-taking flag with no value at exit 2
  via `compat_require_value` (N6). `site-e2e.js` bounds each fetch with
  a 10 s timeout (N8), and `serve-site.js` fixes the root-filesystem
  prefix plus slashless-directory redirects with the raw request path
  (N10). README wording (N5), the #657 citation, and the granted-geometry
  wording (N9) are corrected; `terminal-compat.html` is regenerated.
  - Delegation ledger (fix pass 2, four areas):
    - general: collector Windows gates (N2/N3/N4) -> all pass; 14/14
      honesty tests and 20 independent fixture checks; only non-blocking
      notes (whitespace strip, `0.0 == 0` equality).
    - general: web E2E server/crawl (N8/N10) -> pass; found the root-FS
      regression test was non-load-bearing and the redirect decoded an
      encoded directory name, both fixed in this pass.
    - general: runner parsing (N1/N6/N7) -> pass; all value-taking flags
      exit 2, trailing-newline parity holds, pwsh parse clean.
  - Primary verified: read every changed diff, ran 95 compat tests,
    38 node tests, `render-docs --check` (15 docs, 424 links), `bash -n`
    and shellcheck (only the pre-existing SC2015), and the pwsh matrix.
  - Skills: no registry skill fits a compatibility-harness repair
    (`customize-opencode` is for opencode configuration); no skill loaded.
