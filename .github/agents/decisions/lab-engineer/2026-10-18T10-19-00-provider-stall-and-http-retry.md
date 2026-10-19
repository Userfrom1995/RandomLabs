# Decision: bounded provider-stall watchdog and transient 429/5xx retry for every agent arm

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T10:19:50Z
- **Applies to:** issue #653 (a provider stall burned a whole tick for 46 silent minutes, and an `AI_APICallError: Internal Server Error` death killed eval, lab, and Maintainer runs with no decision file and no automatic retry)
- **Status:** accepted

## What was decided

Both opencode runner paths carry two new bounded defenses alongside the
existing #591 ladder and #620 free-tier retry:

- the shared composite action `.github/actions/opencode-run/action.yml`
  ("Run opencode"), which serves every agent workflow except the Maintainer;
- the Maintainer's inline copy in `.github/workflows/maintainer.yml`
  ("Run Maintainer agent").

**(a) Provider-stall watchdog.** Each attempt is captured through a FIFO:
`tee "$log" < "$fifo" &` and `MODEL="$model" opencode github run > "$fifo" 2>&1 &`
run as separate background children with known PIDs, each waited separately
(`wait "$oc_pid"` then `wait "$tee_pid"`), so a failed tee or a failed
opencode is still attributed exactly. A watchdog subshell tracks idle time by
polling the captured log's byte size every `HANG_POLL_SECONDS` (default 30):
an attempt whose log does not grow for `HANG_IDLE_SECONDS` (default 600) is
flagged (`hang_flag`), TERM/KILLed (exactly those two PIDs, with a 5-second
TERM-to-KILL grace), and retried once on the SAME model after a 10-second
backoff (bare `continue` inside the same-model `while`, `hang_retry_used`
capped at 1). A second stall exits loudly (rc 1). When `mkfifo` is
unavailable (some Windows Git Bash environments) the runner prints a loud
warning and degrades to the legacy inline pipeline without the watchdog
instead of bricking the arm; the degraded shape still honors every other
retry class.

**(b) Transient 429/5xx retry.** A new anchored detector
`transient_http_error_terminal` matches the provider's terminal 429/5xx
lines at column 0 with the same `tail -n 40` window and optional prefix
forms as #591/#620:
`^(AI_APICallError: |APIError: |Error: )?(Rate limit exceeded\. Please try
again later\.|Internal Server Error|Bad Gateway|Service Unavailable|Gateway
Timeout)\.?$`.
On a match, the SAME model is retried exactly once per arm after 30 seconds
(`transient_retry_used` capped at 1; a bare `continue`, never a rung
advance). A second terminal rejection fails loudly: the exit-0 path exits 1,
the nonzero path propagates the provider's own `exit "$status"`. The budget
is shared across rungs, like the free-tier one.

The stall, HTTP, and free-tier budgets are independent (the HTTP and stall
budgets are shared across rungs, like the free-tier one), each capped at one
retry. The provider's own `AI_RetryError: Failed after 3 attempts. Last
error: ...` summary, a transcript echo, a phrase variant, and the
`responseBody` envelope can never consume a retry.

## Root cause

Two silent-death classes sat outside every existing guard:

- A stalled stream (no output at all) was terminated only by the agent-step
  timeout (75 minutes on the eval arm at that time, 60 minutes on the
  Maintainer arm): eval run 39094600854 stalled for 46 silent minutes
  (2026-10-18 ~04:12Z), and Maintainer run 39104661889 printed its 429
  terminal line at 06:37:19Z and then produced no output for 60 silent
  minutes until the agent-step timeout.
- A transient 429/5xx terminal death falls into the "not a model-resolution
  or free-tier death; remaining rungs are not retried" branch and exits
  nonzero with no decision file: the 2026-10-18 quick-death cluster eval
  39110580426, lab 39110581700, and maintainer 39110680183/39110681392 all
  died on `AI_APICallError: Internal Server Error` within 91-199 seconds
  (alongside maintainer 39104695066 attempt 1, which died on ISE at
  07:37:52Z; its re-run recovered).

Both are transient by nature (the same model succeeded on watchdog-aborted
retries elsewhere), so one bounded same-model retry absorbs the blip while a
persistent failure still fails loudly.

## Evidence

- Incidents: eval 39094600854 (46-minute stall), Maintainer 39104661889
  (`Rate limit exceeded. Please try again later.` at 06:37:14Z, then 60
  silent minutes until the agent-step timeout), the 2026-10-18 quick-death
  cluster eval 39110580426 / lab 39110581700 / maintainer 39110680183 /
  39110681392 (all `AI_APICallError: Internal Server Error` within 91-199
  seconds), and maintainer 39104695066 attempt 1 (same ISE class, first
  ISE line 07:37:52Z; attempt 2 recovered); exact column-0
  terminal lines verified from the run logs via `gh run view --log` (the 429
  line with the `FreeUsageLimitError` envelope, and `Internal Server Error`
  without a trailing period).
- Audit: `silent-stall-audit.sh` 23 passed / 0 failed with R15 extended;
  the R15 summary text now names the #653 coverage.
- Primary harness (extracted real run blocks, executable mock `opencode`,
  mock `sleep` with value-keyed recordings, env-scrubbed per delegation.md
  section 6): HTTP recovery on both exit shapes (`30:1` backoff,
  value-scoped and wait-ordered), persistent HTTP loud on both shapes with
  the provider's own status propagated (rc 3; exit-0 path rc 1), watchdog
  kill plus same-model retry (`10:1`, ordering proven), a second stall
  loud, per-class budget independence in both directions
  (`http-then-hang`, `hang-then-http`), and the degraded no-mkfifo shape
  still honoring the free-tier retry contract loudly (`nofifo-freetier`
  with a failing mkfifo mock swapped onto PATH).
- Functional detector fixtures: terminal matches for every prefix form;
  no-match for the indented echo, `responseBody` envelope,
  trailing-suffix, phrase variant, uppercase, and the `AI_RetryError`
  summary; the tail-window 39/40 lower-bound pair.

## Why R15 was extended instead of adding a new rule number

The stall watchdog and the 429/5xx retry are part of the same
model-resilience subsystem as #591/#620 (same two files, same anchoring
rules, same loop), so extending R15 keeps every invariant under one rule.
The rule's description, header properties, and result strings now name all
three issues.

## Delegation ledger

- Primary implemented the runner changes, the R15 extension, the docs and
  prompt sync, and ran the audit (`23 passed / 0 failed`).
- Verifier subagent (general; scope: independent mutation matrix against
  fresh exports under `/tmp/opencode/`, per delegation.md section 6)
  reproduced the round-1 detector, clamp, and harness shell-form classes;
  its 9/9 catch result is recorded in
  `2026-10-18T11-14-27-provider-stall-http-retry-review-fixes.md`.
- Skills: no skill fits (GitHub Actions lab infrastructure, not opencode
  configuration of this workspace).

## Notes

- Documented residual (inherited from the #591 exit-0 detector): a healthy
  run whose own final response contains the exact terminal form as a
  standalone column-0 line could still consume the retry; no such line has
  ever been observed for the 429/5xx forms, and the retry is bounded.
- Documented residual: an attempt that produces a few bytes and then stalls
  is killed only after `HANG_IDLE_SECONDS` of no growth, so a stall with
  slow drip output is bounded by the agent-step timeout rather than the
  watchdog.
  The observed incident class produces no output at all.
- `maintainer.yml`'s Model-not-found retry, freetier retry, verify
  contracts, and the general arm's loud verify are unchanged.

- the Lab Engineer
