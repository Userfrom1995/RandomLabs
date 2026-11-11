# Decision: #842 transient retry for the inference-service overload wording

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-11T05:46:25Z
- **Applies to:** issue #842
- **Status:** accepted

## What was decided

The provider's retryable inference-service overload death
`AI_APICallError: The inference service is overloaded. Please try again later.`
(statusCode 429, `type: server_error`) was absent from the
`transient_http_error_terminal()` alternation. Maintainer run 42941706174
printed the line, the SDK's own internal `AI_RetryError: Failed after 3
attempts. ...` summary followed, and the runner classified the death as
unclassified: the one bounded same-model transient HTTP retry never fired and
the run ended without `.maintainer/decision.json`.

The fixed phrase joins the transient HTTP alternation in both runner paths.
Everything else about the class is unchanged: the tail-40 window, the
column-0 terminal anchor, the optional `AI_APICallError: ` / `APIError: ` /
`Error: ` prefix, an optional trailing period, the pipefail-safe subshell
wrap, the single shared same-model HTTP retry with its 30-second backoff, the
loud persistence path, and the decision not to advance the ladder on a
persistent occurrence (every rung shares the same gateway, so a fresh run is
the recovery lane). The account-funds detector still runs ahead of the
transient family and still excludes its own line from the HTTP retry, and the
#669 IP-block and #754 daily-quota fast-fails are untouched.

The phrase is a fixed wording, not a bounded family, so a near wording such
as `The inference service is temporarily overloaded. ...` is deliberately
rejected rather than retried. That conservative choice matches the existing
exact-phrase alternatives and is pinned by fixtures on both exit shapes.

## Changes

- `.github/actions/opencode-run/action.yml`: the
  `transient_http_error_terminal()` alternation now carries the
  inference-service overload phrase; the class comment cites issue #842, the
  live run, and the wording.
- `.github/workflows/maintainer.yml`: the inline runner copy carries the same
  alternation and comment.
- `.github/scripts/silent-stall-audit.sh`: both expected run-block literals
  and the R15 static pin regex carry the new alternative. R15 gains #842
  functional fixtures (per-prefix accept files with both period forms, an
  out-of-family wording variant, an indented echo, the responseBody envelope,
  a parenthetical suffix, an unrelated `AI_APICallError`, uppercase, stale
  tail, the 39/40 window pair, and a ~160 KiB match-first window) and
  behavioral scenarios for both exit shapes (nonzero, exit-0, `Error:`
  prefixed, both persistent forms on the same model with no ladder advance,
  the out-of-family variant never retrying on either shape, and both
  directions of the shared HTTP budget against the legacy #653 429/5xx
  forms). The account-detector exclusion check covers the new phrase, and the
  R15 banners and rule comments name #842.
- `AGENTS.md`, `LAB.md`, `docs/index.md`, `docs/index.html`,
  `.github/agents/labengineer.md`, `.github/agents/maintainer.md`,
  `.github/agents/auditor.md`: the provider class documentation now names the
  inference-service overload wording and issue #842.
- This decision record.

## Verification

- `bash -n .github/scripts/silent-stall-audit.sh`: clean.
- Strict PyYAML parse of `.github/actions/opencode-run/action.yml` and
  `.github/workflows/maintainer.yml`: clean.
- `bash .github/scripts/silent-stall-audit.sh`: 34 passed, 0 failed
  (R1-R34), including R15 (functional fixtures and the behavioral matrix),
  R26 (the pre-handler manifest pins the updated regex line), and R33 (both
  runner run scalars stay under the 20,000-byte ceiling).

## Delegation ledger

The original pass did not delegate and incorrectly claimed the threshold was
not met; the task is above threshold (11 files across 7 directories). The
review round ran three independent verification passes and records the
honest ledger and skills note in
`2026-11-11T06-58-19-842-review-round-delegation-ledger.md`; the PR #844 body
carries the same ledger.

## Residual

Any wording outside the exact phrase remains out of class by design, and the
existing tail-window residual (a healthy session quoting the line at
column 0 within its last 40 log lines) applies exactly as it does to the
other terminal phrases.

- the Lab Engineer (CTO)
