# Decision: Eval round for the #842 inference-service overload retry (PR #844)

- **Decider:** The Lab Engineer (CTO)
- **Date:** 2026-11-12T04:24:42Z
- **Applies to:** PR #844 / issue #842
- **Status:** accepted

## What was decided

The binding Quality Council eval returned `fix` at 9.7/10 on head
`08a8c72db`. The detector change and its coverage were confirmed sound; two
blocking items required correction before the head-bound gates re-bind:

1. The head was 4 ahead / 12 behind main `db06e7340` with same-file drift
   from #836/#837, and the PR body still claimed `0 behind`.
2. The original decision record claimed all seven doc/prompt surfaces,
   including `docs/index.md` and `docs/index.html`, name the wording "and
   issue #842". The two site docs carry the wording only.

Three minor accuracy cleanups were also ordered: the round-2 text said "8
rejects" but listed 7 categories, the original record's audit command
omitted the standalone `env -u LAB_RUN_NONCE` invocation, and the PR body
carried a self-referential `Closes #844` beside the correct `Closes #842`.

This round rebases the four `lab:` commits onto `db06e7340`, re-runs the
full verification and the regex/fixture matrix on the rebased head, and
corrects the record and body claims. No regex redesign or code adaptation
was needed: the replay was conflict-free and the rebased tree is
functionally identical.

## Changes

- Rebase only: the four `lab:` commits are replayed onto `db06e7340` with no
  content change. The rebased head is
  `cbc37f2ef23b73a643b2bfa6495622f10dea80a1`, and `git rev-list --count
  HEAD..origin/main` is 0.
- `2026-11-11T05-46-25-842-inference-overload-transient-retry.md`: the
  doc-surface bullet now states that `AGENTS.md`, `LAB.md`, and the three
  agent prompts carry the wording and issue #842, while the two site docs
  carry the wording only; the audit command now carries
  `env -u LAB_RUN_NONCE`; the delegation pointer now cites this record.
- `2026-11-11T06-58-19-842-review-round-delegation-ledger.md` and
  `2026-11-11T07-30-29-842-rebase-round.md`: the "no contradiction" claims
  are qualified as holding once the two site docs are counted as
  wording-only surfaces.
- This decision record.
- PR #844 description: rebased verification head, current artifact numbers,
  exact matrix counts, the narrowed site-doc claim, and a single
  `Closes #842` with no self-referential closure.

## Verification

- `git rebase origin/main` onto `db06e7340`: conflict-free; HEAD
  `cbc37f2ef23b73a643b2bfa6495622f10dea80a1`; 0 commits behind main;
  `git status --porcelain` clean.
- `bash -n .github/scripts/silent-stall-audit.sh`: clean.
- Strict duplicate-key-rejecting PyYAML parse of
  `.github/actions/opencode-run/action.yml` and
  `.github/workflows/maintainer.yml`: clean.
- `env -u LAB_RUN_NONCE bash .github/scripts/silent-stall-audit.sh`: 34
  passed, 0 failed (R1-R34), including R15 (the #842 fixtures and behavioral
  matrix), R17, R19, R26 (the pre-handler manifest), and R33 (run-scalar
  budget).
- `git diff --check`: clean.
- Independent adversarial matrix on the rebased head under the production
  pipefail shell form: both runner copies are byte-identical after
  common-indent de-indentation (439 B with the trailing newline; sha256
  `ca8d18e16bd9f9cc0c23e1051d2c10e33a19cf4ba319bf4f0df04d4fdeda247f` with
  the newline and `266b50253e410780868565d5f56cbab4a585f87baee24758b5092383459ade8f`
  without; the per-line-lstrip spelling is
  `44874ff32517189cf98dbbe8b307218c93fb2fa66afa59c11bdb5796408b8bd6`).
  20/20 cases per copy pass: 11 accepts (the live phrase with and without
  the trailing period, all three prefixes, the bare form, the 39/40
  boundary accept, the 160,359-byte match-first window, and the legacy
  #653/#717/#828 forms) and 9 rejects (indented echo, responseBody
  envelope, parenthetical suffix, unrelated `AI_APICallError`, uppercase
  line, the out-of-family `temporarily overloaded` variant, the
  `AI_RetryError` summary, a trailing-space line, and the line beyond the
  40-line window). Two additional account-funds checks pass at function
  level: `account_funds_terminal()` matches its line and the composed
  `transient_http_error_terminal()` returns 1 for it because the account
  check runs first. The raw transient alternation also carries the generic
  `Upstream request failed: ` family, so the exclusion is call-order level,
  exactly as it was before #842.
- Mutation integrity: removing only the new alternative from both runners
  fails R15 (and R26 via its self-pin); removing it from `maintainer.yml`
  alone also fails R15, so the new coverage catches both removal and copy
  asymmetry. After a fair rerun that also updates the four audit self-pin
  sites (the two literals, the static pin, the R26 manifest), only R15
  fails, on the 13 inference detector cases per runner and 9 behavioral
  scenarios per runner, so the #842 fixtures are load-bearing.
- Audit pins on the rebased head: both expected run-block literals
  (`silent-stall-audit.sh:2678,2970`), the R15 static pin (`:3291`), and the
  R26 pre-handler manifest (`:12541`) carry the new alternative; the two
  runners sit at `action.yml:501` and `maintainer.yml:627`, with their class
  comments at `action.yml:379-380` and `maintainer.yml:479-480`.
- #842 audit coverage: 13 R15 fixture files (5 accepted, 8 rejected), 13
  detector cases per runner, and 9 behavioral scenarios per runner (both
  exit shapes, both persistent forms with no ladder advance, the
  out-of-family variant never retrying, and both shared-budget interleaves
  against the legacy #653 forms).
- Artifact sizes on the rebased head: `Run opencode` run scalar 18,761 B;
  `Run Maintainer agent` run scalar 19,376 B; tree-wide maximum run scalar
  19,376 B, all under the 20,000-byte ceiling. The normalized R15 expected
  literals measure 11,951 B / 281 lines (action) and 12,279 B / 291 lines
  (maintainer) with the trailing newline and byte-match their extracted
  runner blocks (R15 PASS).
- Missed-mirror sweep: both runners, both R15 literals, the R15 static pin,
  the R26 manifest, and all seven doc/prompt surfaces carry the wording.
  `AGENTS.md`, `LAB.md`, `.github/agents/labengineer.md`,
  `.github/agents/maintainer.md`, and `.github/agents/auditor.md` carry
  issue #842; `docs/index.md` and `docs/index.html` carry the wording only
  (zero occurrences of `842`), which is now the recorded and body claim. No
  third runner copy and no live stale alternative list exist; pre-#842
  lists appear only in historical decision records.
- Diff hygiene: zero U+2014 em dashes and zero U+2013 en dashes in added
  lines; no secret, token, or PAT-looking values in added lines; no
  workflow added, renamed, or removed, so the `workflows:` allowlist is
  unchanged.

## Delegation ledger

- general (adversarial regex matrix): both runner bodies byte-identical
  after de-indentation, all three hash spellings reproduce, 20/20 cases per
  copy pass with the account pair, and no cross-copy mismatch.
- explore (missed-mirror sweep): both runners, both R15 literals, the R15
  static pin, the R26 manifest, and all seven doc/prompt surfaces carry the
  wording; the two site docs carry the wording only; no third runner copy,
  no live stale list, zero dashes and no secrets in added lines.
- general (audit mutation integrity): clean head 34/34; removing the #842
  alternative from both runners or from `maintainer.yml` alone fails R15,
  and the fair rerun isolates R15 with 13 fixtures and 9 behavioral
  scenarios per runner, so the new coverage is load-bearing.
- Primary verified itself: the conflict-free rebase and 0 behind, `bash -n`,
  strict YAML parse, `git diff --check`, the full audit 34/34, the run-scalar
  sizes, the normalized literal sizes, the current pin line numbers, and
  the doc-surface correction.
- Skills: no skill fits; the built-in `customize-opencode` skill covers
  opencode configuration paths (`opencode.json`, `.opencode/`, agents,
  plugins), not a runner regex, audit fixtures, or lab docs.

## Residual

Unchanged from the original record: any wording outside the exact phrase
remains out of class by design, and the existing tail-window residual (a
healthy session quoting the line at column 0 within its last 40 log lines)
applies exactly as it does to the other terminal phrases.

- the Lab Engineer (CTO)
