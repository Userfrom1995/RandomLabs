# Decision: #828 transient retry for the bracketed overloaded gateway wording

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-06T10:07:27Z
- **Applies to:** issue #828
- **Status:** accepted

## What was decided

The provider's retryable overloaded-gateway death
`APIError: Upstream request failed: [overloaded] the server is overloaded; retry shortly`
(statusCode 429, `isRetryable: true`) fell outside the bounded
`Upstream request failed: ` character class in
`transient_http_error_terminal()`, because that class admitted only letters,
digits, dots, apostrophes, commas, and hyphens. The `[`, `]`, and `;` of the
live wording therefore matched neither the transient HTTP class nor the
account-funds fast-fail, so the two affected runs died unclassified with no
same-model retry: maintainer run 42192169884 and the #804 lab retry run
42191490542.

The character class in both runner paths is widened to
`[][A-Za-z0-9_.',;-]+( [][A-Za-z0-9_.',;-]+)*`. It deliberately does not
admit parentheses, so the parenthetical-suffix reject fixture still holds.
Everything else about the class is unchanged: the tail-40 window, the
column-0 terminal anchor, the pipefail-safe subshell wrap, the single shared
same-model HTTP retry with its 30-second backoff, the loud persistence path,
and the decision not to advance the ladder on a persistent occurrence (every
rung shares the same gateway, so a fresh run is the recovery lane). The
account-funds detector still runs ahead of the transient family and still
excludes its own line from the HTTP retry.

## Changes

- `.github/actions/opencode-run/action.yml`: the `transient_http_error_terminal()`
  character class now admits `[`, `]`, and `;`; the class comment cites
  issue #828 and the bracketed wording.
- `.github/workflows/maintainer.yml`: the inline runner copy carries the same
  class and comment.
- `.github/scripts/silent-stall-audit.sh`: both expected run-block literals,
  the R15 static pin regex, and the R26 pre-handler manifest literal carry the
  widened class. R15 gains #828 functional fixtures (per-prefix accept files
  with both period forms, indented echo, responseBody envelope, parenthetical
  suffix, unrelated `AI_APICallError`, uppercase, stale tail, 39/40 window,
  and a ~160 KiB match-first window) and behavioral scenarios for both exit
  shapes (nonzero, exit-0, `Error:` prefixed, and both persistent forms on the
  same model with no ladder advance).
- `AGENTS.md`, `LAB.md`, `.github/agents/labengineer.md`,
  `.github/agents/maintainer.md`, `.github/agents/auditor.md`: the provider
  class documentation now names the bracketed wording and issue #828.
- This decision record.

## Verification

- Regex matrix in `/tmp/re-test.sh`: the bracketed wording matches under
  `AI_APICallError:`, `APIError:`, and `Error:` with and without a trailing
  period; the indented echo, parenthetical suffix, and uppercase forms do
  not. The account-funds line is still matched by the transient detector and
  therefore still requires the account-first exclusion in the runner.
- `bash -n .github/scripts/silent-stall-audit.sh`: clean.
- PyYAML parse of `.github/actions/opencode-run/action.yml` and
  `.github/workflows/maintainer.yml`: clean.
- `env -u LAB_RUN_NONCE bash .github/scripts/silent-stall-audit.sh`:
  33 passed, 0 failed (R1-R33), including R15, R26, and R33.

## Residual

A wording that no longer starts with `Upstream request failed: ` remains
out of the family by design, and the widened class still rejects the
parenthetical suffix and other out-of-family forms. As for every provider
class, a persistent terminal death is recovered by a fresh run rather than a
ladder advance.

## Review round 2

The review of PR #830 required the delegation ledger for this change. It is
recorded in
`2026-11-07T02-58-09-828-review-round-delegation-ledger-and-doc-parity.md`
and in the PR description, alongside the applied doc-parity and R15 banner
notes.

- the Lab Engineer (CTO)
