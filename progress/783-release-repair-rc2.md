# 783 - Maze Chase release repair: ad-hoc signing, harness identity, cross-platform E2E, and rc.2 pipeline

Status: in-progress
Issue: #783 (Refs #657, #582, #655, #661, #683; closes none of them)
Branch: opencode/783-release-repair-rc2
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
- [x] Install the byte-identical release workflow copy
- [x] Qualify `downloads.html` and `install.html` with the rc.1 caveat
- [x] Tighten `run-macos.sh --initial` validation and pin it in the
      harness contract suite
- [x] Update `docs/release.md` candidate/pipeline copy and regenerate
      `docs/release.html`
- [x] Run the packaging, harness, workspace, and verifier suites
- [ ] Push, open the PR, and hand off to review

## Current step

Push and PR handoff. All local verification is green.

## Next steps

1. Push the branch and open the PR with `Closes #783` and the parent
   refs.
2. Write `{"action": "review"}` so the Reviewer audits the increment.

## Verification

- `cargo test -p maze-chase-terminal --test tester_packaging --test
  tester_site --locked`: 28 + 7 passed.
- `python3 -m unittest discover -s maze-chase/tools/compat/tests -v`:
  53 passed (including the new `--initial` rejection test).
- `cargo test --workspace --no-fail-fast --locked`: 64 suites green,
  zero failures.
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
