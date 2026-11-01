# Decision: #754 daily free-usage wall and account-funds fast-fail

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-01T13:11:50Z
- **Applies to:** issue #754
- **Status:** accepted

## Problem

The provider's daily free-usage allowance is per egress IP and shared by every
free rung. When it runs out the CLI prints
`AI_APICallError: Free usage limit reached. Subscribe to OpenCode Go to keep
going: https://opencode.ai/go` (current wording adds `Free models work in
OpenCode (https://opencode.ai); `), then a long error dump, then goes silent.
The #653 watchdog classified that silence as a provider stall, killed attempt
1 after 600 silent seconds, spent the one same-model stall retry, killed
attempt 2 the same way, and reported `repeated provider stall` for the wrong
class (about 21 minutes per death; review run 40048604834 on #741 and
maintainer run 39964118698, plus review runs 39979034731, 39958120998,
39956006389, and 39946856093).

## Decision

Both runner paths (`.github/actions/opencode-run/action.yml` and
`.github/workflows/maintainer.yml`) now carry two named fast-fails:

1. `free_usage_limit_terminal()` uses the same column-0 terminal anchoring
   and pipefail-safe wrap as the other detectors but a wider bounded 600-line
   window (the terminal line sat about 345 lines above the kill point, so 40
   lines cannot see it). The watchdog checks it at every poll and cuts the
   attempt immediately on the line through a dedicated flag (bounded TERM/KILL
   grace, precedence over the stall flag), and the post-attempt path checks it
   for attempts that end on their own, covering both exit shapes and both
   capture shapes. The class prints a canonical `::error::`, exits 1
   unconditionally, consumes no retry budget, and never advances the ladder.
   The provider's `retry-after` header (80,725-81,395 seconds in the
   incident, resetting at midnight UTC) is diagnostic only, never a park
   horizon.
2. `account_funds_terminal()` detects the account-level
   `Upstream request failed: Insufficient account funds` rejection and is
   structurally excluded from the transient 429/5xx family ahead of its own
   pipeline, so it can never consume the shared HTTP retry. It is a named
   fast-fail with the same unconditional exit-1 contract.

The recovery for both classes is a fresh run on a new runner (crash-parity
triage re-dispatches review/test/lab; the Maintainer's recurring schedule
covers its own arm), because every free rung shares the same per-egress
allowance.

## Verification

- `bash -n` clean on both runner blocks and the audit script.
- R15 detector fixtures: both quota wordings, every prefix and period form,
  the bare form, echo/envelope/suffix/phrase-variant/retry-summary/uppercase/
  stale no-match, the 599/600 window boundary, and the mutual-exclusion pair
  (the quota line must not match the account detector and vice versa).
- R15 behavioral matrix: `quota` watchdog cut (one attempt, no stall retry),
  both exit shapes, older wording, stderr, the 599/600 boundary end-to-end, a
  ~160 KiB match-first window, interleaves after the HTTP/free-tier/stall
  retries, a rung-deep scenario with no ladder advance, and `account-funds`
  variants proving exactly one attempt and no HTTP retry, all under the
  production `bash --noprofile --norc -eo pipefail` shell form.
- Full audit: `bash .github/scripts/silent-stall-audit.sh` reports 33 passed,
  0 failed, rc 0 (R15 and R33 included).

## Follow-up: push-validation expression budget

The first push of this PR exposed a second silent failure. GitHub compiles a
`run:` scalar as a template expression and rejects the whole workflow file
above 21,000 characters, but no audit rule measured script size. The #754
prose pushed `maintainer.yml`'s `Run Maintainer agent` scalar to 22,200 bytes,
so every push on the branch failed push validation with `Invalid workflow
file` and `Exceeded max expression length 21000` (run 41311839234), while the
audit stayed green at 32 passed. The vendored `Run opencode` scalar sat at
20,277 bytes, only 723 under the cap.

The fix moves the explanatory prose out of both block scalars into YAML
comments above the steps (YAML comments survive review but are not part of
the scalar), leaving the two scalars at 14,108 and 13,976 bytes with every
detector, retry path, and fail-closed exit byte-identical. The touched R26
pre-handler manifest was regenerated from the real extractor. A new audit
rule, R33, measures every run scalar in every workflow and composite action
against a documented 20,000-byte ceiling (1,000 bytes of headroom for future
expression edits), requires both incident steps to exist exactly once,
parses with a strict duplicate-key-rejecting loader, fails closed on parse or
sandbox errors, and self-tests padded, renamed, duplicated, and malformed
fixtures.

## Residuals

- Same accepted shape as the other detectors: a healthy session that prints
  the exact provider line at column 0 in its last 600 log lines is
  fast-failed. The cost is one fresh-run re-dispatch, which is this class's
  recovery.
- A quota line more than 600 lines above the kill point is not seen by the
  watchdog and falls back to the stall path; the post-attempt check still
  classifies it correctly when the attempt ends on its own.

- the Lab Engineer
