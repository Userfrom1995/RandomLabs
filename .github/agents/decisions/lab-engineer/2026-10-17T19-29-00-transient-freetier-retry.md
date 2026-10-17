# Decision: bounded transient FreeTierError retry for every agent arm

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-17T19:29:00Z
- **Applies to:** issue #620 (a transient provider free-tier rejection killed a Tester gate and a Maintainer wake-up with no decision file and no automatic retry)
- **Status:** accepted

## What was decided

Both opencode runner paths now carry a bounded retry for the provider's
transient `FreeTierError`:

- the shared composite action `.github/actions/opencode-run/action.yml`
  ("Run opencode"), which serves every agent workflow except the Maintainer;
- the Maintainer's inline copy in `.github/workflows/maintainer.yml`
  ("Run Maintainer agent").

On a death whose log tail carries the provider's anchored terminal error
line (`AI_APICallError: OpenCode's free tier can only be used from within
OpenCode. Download it at https://opencode.ai and keep building.`, optional
`AI_APICallError: `/`APIError: `/`Error: ` prefix), the runner retries the
SAME model exactly once per arm after a 15 s pause. The retry re-enters the
same-model loop (a bare `continue` inside its nested `while`, never the
`continue 2` rung advance), a second rejection exits loudly (`exit 1` /
`exit "$status"`), and the budget is capped at one per run. The detector
reuses the issue #591 anchoring rules: `tail -n 40` + column 0 + exact
terminal line, so a transcript echo (indented or tool-prefixed) and the
`responseBody` JSON envelope can never consume the retry. Model-not-found
semantics are untouched.

## Root cause

Issue #591's fallback ladder classified only `Model not found`. The provider
instead rejected two calls seconds into their agent steps with
`AI_APICallError: OpenCode's free tier can only be used from within OpenCode`
(provider error type `FreeTierError`), which fell into the "not a
model-resolution death; remaining rungs are not retried" branch and exited
nonzero with no decision file. The Tester gate went red and the Maintainer
wake-up was lost, each recovered only by a manual re-dispatch. The failure
mode is transient by nature (the same model succeeded on the manual retry),
so one bounded same-model retry absorbs the blip while a persistent rejection
still fails loudly.

## Evidence

- Incidents: Tester run 39059437136 (2026-10-17T18:44:59Z) and Maintainer run
  39060571484 (2026-10-17T19:00:53Z), both `conclusion=failure`; logs show
  the column-0 terminal lines and the `responseBody` `FreeTierError` envelope
  (fixtures in the harness).
- Audit: `silent-stall-audit.sh` baseline 17 passed / 0 failed after the
  change, with R15 extended (static pins + a functional detector test that
  executes both extracted real detectors against the incident terminal lines,
  transcript echo, JSON envelope, and a Model-not-found form).
- Primary harness (extracted real run blocks, executable mock `opencode`,
  env-scrubbed per delegation.md section 6): 11/11 scenarios per path,
  including transient-recovery (exit 1 and exit 0 variants), persistent
  failure after exactly one retry, no rung advance for this class, budget
  consumption ordering, Model-not-found preserved, echo/JSON rejection,
  unclassified failure status propagation, rung exhaustion.
- Verifier A (static + mutation): 7/7 requested mutations caught; verifier B
  (independent behavioral): 36/36 assertions across 18 scenarios on both
  paths, blocks behaviorally identical modulo labels.
- Verifier A finding, fixed in this branch: the first loudness pin
  (`grep -A2 'persistent free-tier rejection' | grep -qF 'exit'`) was
  satisfied by the token "exit" inside the message text, so
  `exit "$status"` -> `exit 0` slipped through. The pin now asserts the
  exact-form exit lines per branch (`^exit 1$` after the exit-0 path,
  `exit "$status"` after the nonzero path); the previously-escaping mutation
  and two sibling mutations now trip R15 with dedicated sub-flags.

## Why R15 was extended instead of adding a new rule number

Open PRs #609 (claims R17) and #614 (claims R18) both extend
`silent-stall-audit.sh` and bump the same `R1-R19` range strings; the #616
decision note records this expected conflict surface. The free-tier retry is
part of the same model-resilience subsystem as #591 (same two files, same
anchoring rules), so extending R15 keeps every invariant under one rule and
avoids a three-way renumbering collision. The rule's description, header
properties, and result strings now name both issues.

## Delegation ledger

- Verifier A (general; scope: baseline audit + 7-mutation matrix + static
  sweep + docs coherence + side-effect read-only check, in `/tmp`): R15 PASS
  under both audit roots; 7/7 requested mutations caught; 21/21 YAML and
  261/261 bash blocks clean; detector regex byte-identical across paths;
  found the weak loudness pin (fixed here).
- Verifier B (general; scope: independent behavioral harness, 18 scenarios x
  2 paths, `/tmp`): 36/36 PASS; two-block equivalence identical modulo the
  Maintainer label words and one pre-existing benign candidates-default
  divergence; zero external side effects.
- Primary verified itself: audit live runs (17/0 before and after), all
  mutations re-run after the pin fix (N1/N2/N3 trip the new sub-flags), both
  own harness matrices 11/11, YAML + `bash -n` on every run block of the
  touched workflows, em-dash sweep on the full diff, clean-tree and
  attributed-commit checks before committing.
- Skills: no skill fits (GitHub Actions lab infrastructure, not opencode
  configuration of this workspace).

## Notes

- Documented residual (inherited from the #591 exit-0 detector): a healthy
  run whose own final response contains the exact terminal form as a
  standalone column-0 line could still consume the retry; no such line has
  ever been observed, and the retry is bounded and side-effect free beyond
  one extra agent attempt.
- Documented residual: a death whose log survives only as an
  Actions-annotation form (`##[error]APIError: ...`) without the bare
  column-0 line would not match; the observed provider path always prints
  the bare line first.
- A retried success can leave the wrapper's sign-off-less APIError comment
  on the issue; that comment never satisfies the #616 publication gate, so
  no gate can advance on it.
- `maintainer.yml`'s Model-not-found retry, verify contracts, and the
  general arm's loud verify are unchanged.

## Addendum: rebase onto main and review-finding fixes

- **Rebase:** the branch was cut at `17e32457`; main meanwhile landed R17
  (per-OS findings-report contract, issue #608), R19 (review-comment
  publication evidence, issue #616; the planned R18 was renumbered during
  that lane, no R18 exists), and R20 (paginated comment-read guard, issue
  #621). The branch was rebased onto main at `b560ed38`. The single content
  conflict was in `silent-stall-audit.sh`'s failure-body invariant list; the
  resolution keeps main's R17/R19/R20 items and adds "plus transient
  free-tier retry" to the R15 item. Everything else auto-merged; both runner
  blocks (`action.yml` "Run opencode", `maintainer.yml` "Run Maintainer
  agent") are byte-identical to the reviewed head, so the behavioral
  evidence below is unchanged.
- **F2 (Reviewer):** the vendored action header mislabeled the bounded
  FreeTierError retry as "audit rule R20"; it now reads "also guarded by
  extended audit rule R15" (R20 is the paginated comment-read guard of issue
  #621).
- **F3 (Reviewer):** the new R15 pins were count-only/shape-only. Three
  verified escape mutations now trip dedicated sub-flags on both runner
  files:
  - order-pinned budget: `freetier_retry_used=1` must sit in the two lines
    before the retry marker, so moving it after the `continue` (unreachable,
    unbounded retry) fails;
  - anchored wiring and backoff: `^[[:space:]]*if freetier_error_terminal
    "\$log"; then$` and `^[[:space:]]*sleep 15$` reject comment decoys and a
    `sleep 31536000`;
  - per-branch, message-tied loud exits: a compensated swap (exit-0 path
    silently `exit 0`, aggregate `exit 1` count held by an unreachable line
    in the other branch) fails the exit-0 sub-pin.
- **This pass's evidence:** full audit 19 passed / 0 failed on the rebased
  tree (R17/R19/R20 included); F3 mutation matrix 10/10 (pristine files stay
  clean, each mutation trips exactly its sub-flag, no collateral, on both
  `action.yml` and `maintainer.yml`); YAML parse on the touched workflows;
  `bash -n` on the audit script; em-dash sweep. The harness lives outside
  the repo tree (`/tmp/opencode/f3-verify/`), per delegation.md section 6.
- **Delegation ledger (this pass):** primary only; the F3 pin replacement
  strings and the mutation matrix follow the Reviewer's own verified
  corrected code, and the extraction is mechanical (no subagent needed for
  a two-file pin fix).

- the Lab Engineer
