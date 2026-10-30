# 783 - Maze Chase release repair: ad-hoc signing, harness identity, cross-platform E2E, and rc.2 pipeline

Status: in-progress
Issue: #783 (Refs #657, #582, #655, #661, #683; closes none of them)
Branch: opencode/issue657-20261030063000 (trigger-issue prefix so the build
verify attributes the push; the PR closes the increment issue #783)
Base: `main` `cdac92fb` (the merged #772 tree)
Reference implementation: `opencode/issue582-20261028002308` `cdac92fb..9955e3a7`

## Scope

- Carry the five post-merge fixer commits from the #772 reference branch:
  ad-hoc signing plus smoke verification, ad-hoc-signed copy, macOS
  harness `--initial`/build identity/too-small honesty, cross-platform
  site and browser E2E, and the round log.
- Correct the release-notes signing copy in the packaging-owned release
  workflow and land the installed `.github/workflows/maze-chase-release.yml`
  byte-identical in the same change.
- Cut the next candidate as a new rc: optional dispatch `rc` input plus
  auto-increment from the existing tags, never a moved rc.1.
- Qualify the downloads and install pages with the published-rc.1
  caveat.
- Tighten `tools/compat/run-macos.sh` `--initial` validation to
  `[0-9]+x[0-9]+`.
- Do not cut the stable tag and do not close any parent issue.

## Checklist

- [x] Create the increment issue (#783) and branch from `main`
- [x] Carry the five reference commits (`4641d9a5..9955e3a7`)
- [x] Correct the release-notes signing copy in the source workflow
- [x] Add the optional `rc` dispatch input and auto-increment tag logic
- [x] Install the byte-identical release workflow copy (`c6fc135e`)
- [x] Qualify `downloads.html` and `install.html` with the rc.1 caveat
- [x] Tighten `run-macos.sh --initial` validation and pin it in the
      harness contract suite
- [x] Update `docs/release.md` candidate/pipeline copy and regenerate
      `docs/release.html`
- [x] Run the packaging, harness, workspace, and verifier suites
- [x] Push the branch and open the PR with `Closes #783` and the parent
      refs
- [x] Lab Engineer installs the byte-identical workflow copy
- [x] Hand off to review after the installed copy lands

## Current step

The Lab Engineer installed the release workflow copy in `c6fc135e`. The
source and installed files are byte-identical and
`release_hardening_contracts_are_pinned` is green. The PR is ready for
review.

## Next steps

1. Review the release workflow and the public signing copy.
2. Cut the next candidate only after review; do not move rc.1 or cut the
   stable tag.

## Verification

These results were produced at `c6fc135e` with the installed copy in place;
the source and installed workflow are byte-identical.

- `cargo test -p maze-chase-terminal --test tester_packaging --test
  tester_site --locked`: 28 + 7 passed (with the installed copy current).
- `python3 -m unittest discover -s maze-chase/tools/compat/tests -v`:
  53 passed (including the new `--initial` rejection test).
- `cargo test --workspace --no-fail-fast --locked`: 64 suites green,
  zero failures (with the installed copy current).
- `cargo run --release --locked --bin maze-chase-verify`: 19/19.
- `cargo fmt --all --check`: clean.
- `node tools/site/render-docs.mjs --check`: 15 docs current, 423
  links verified.
- `site-e2e.js`: 673 assertions, ALL GREEN; `browser-e2e.js`: ALL GREEN
  (including the fright route).
- `silent-stall-audit.sh`: 31 passed, 0 failed.
- The extracted `Resolve the release tag` step was executed against a
  mock `git` for nine scenarios (tag ref, fresh branch, next after
  rc.1/rc.2, annotated dereference, explicit and padded input, zero,
  junk, and a failed ls-remote) and selected the expected tag or failed
  closed in every case.

## Agent log

- 2026-10-30 (builder): created #783 and branched from `main` at
  `cdac92fb`. Cherry-picked the five reference commits
  (`4641d9a5..9955e3a7`) so the macOS signing repair, the harness
  identity work, and the cross-platform E2E fixes carry forward with
  their original fixer provenance. Added the follow-ups the review
  found: the release workflow now states the ad-hoc-signed signing
  status, a branch dispatch takes an optional `rc` input or picks the
  next unused `maze-chase-v<version>-rc.N` tag (never a moved rc.1),
  the installed workflow is byte-identical, the downloads and install
  pages carry the published-rc.1 caveat, and `run-macos.sh` validates
  `--initial` with `[0-9]+x[0-9]+` (pinned by a harness contract test).
  Updated the release docs and regenerated the rendered page.
- 2026-10-30 (builder): pushed the branch and opened the PR. The Builder
  token cannot land `.github/workflows/maze-chase-release.yml` (GitHub
  rejects the workflow-file change without the `workflows` permission), so
  the branch initially omitted the installed copy. The Lab Engineer
  installed the byte-identical copy in `c6fc135e`, the packaging suite is
  green, and the PR is in review.
- 2026-10-30 (lab): repaired the review findings. The installed workflow
  copy was already correct at `c6fc135e`; corrected the stale handoff
  above, qualified the published-rc.1 signing copy on `README.md`,
  `releases.html`, `compatibility.html`, `downloads.html`, and the desktop
  install guide, regenerated `docs/desktop.html`, and replaced the
  contradictory rc.1 rebuild note in the #582 log. Also serialized the
  release pipeline with a global concurrency group so two dispatches can
  no longer resolve the same rc, and pinned that policy in the packaging
  test. Verification: `cargo test -p maze-chase-terminal --test
  tester_packaging --test tester_site --locked` 28 + 7 passed, `cargo
  fmt --all --check` clean, `python3 -m unittest discover -s
  maze-chase/tools/compat/tests -v` 53 passed, `node
  tools/site/render-docs.mjs --check` 15 docs current with 423 links, and
  `git diff --check` clean. Delegation ledger:
  - general subagent: audited the release workflow/tag resolver; returned
    the byte-identity, the resolver behavior, the cross-branch rc race
    (fixed here), and the still-open substring-only resolver coverage.
  - general subagent: audited the macOS signing/smoke path; returned the
    ad-hoc codesign-verify chain, the harness identity and too-small
    checks, the unqualified public signing copy (fixed here), and two
    minor harness residuals left as documented follow-ups
    (`write_unverified` provenance, zero-dimension `--initial`).
  - general subagent: audited the public rc.1 copy and progress claims;
    returned the four remaining signing contradictions plus the missing
    desktop install caveat (all fixed here), the stale #783 handoff lines
    (fixed here), the contradictory rc.1 rebuild note (fixed here), and
    the absent ledgers (added here).
  - Primary context: made and verified every edit and ran the packaging,
    site, harness, fmt, docs, and diff checks above.
  - Skills: no registry skill matched. - the Lab Engineer
