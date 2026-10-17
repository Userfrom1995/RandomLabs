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

## Addendum II: F4 position pins (review round 2)

- **F4 (Reviewer, BLOCKING):** two one-line counter relocations still escaped
  `r15_freetier_pins` while breaking the runtime contract. Both are now
  caught by position pins added inside the same function (no runtime code
  changed; the runner blocks are byte-identical to the reviewed head):
  - `freetier_retry_used=0` init pinned immediately before the `for model`
    loop (`grep -B3 -F 'for model in $candidates; do'` window), so relocating
    it into the `while :; do` retry body (budget reset per attempt, i.e.
    unbounded retries: 650 attempts/8 s under an always-rejecting mock) trips
    `freetier-budget-init-not-outside-the-retry-loop`;
  - `freetier_retry_used=1` consumption pinned inside the cap branch
    (`grep -A3 -F 'if [ "$freetier_retry_used" -lt 1 ]; then'` window), so
    hoisting it one line up (unconditional, cap always false, transient
    branch unreachable, the retry silently disabled) trips
    `freetier-budget-not-consumed-inside-cap-branch`. Combined with the
    existing `-B2` marker pin, the assignment's exact position is pinned from
    both sides.
- **This pass's evidence:** full audit 19 passed / 0 failed on the branch
  tree (R17/R19/R20 included); F3/F4 mutation matrix 16/16 executed against
  the real extracted pin function on copies of both runner files in
  `/tmp/opencode/f4-verify/`: pristine files stay CLEAN, each of the seven
  mutation classes trips exactly its expected sub-flag with no collateral
  (F4a -> `freetier-budget-not-consumed-inside-cap-branch`; F4b ->
  `freetier-budget-init-not-outside-the-retry-loop`; F3a -> both
  `freetier-retry-budget-not-consumed-before-retry` and the new inside-cap
  flag; F3b -> `freetier-detector-not-wired-both-paths`; F3c ->
  `no-bounded-retry-backoff`; F3c1 -> `persistent-freetier-exit-0-path-not-loud`;
  F3c2 -> `persistent-freetier-exit-status-path-not-loud`), and every
  mutated file stays YAML-parse-clean with all extracted `run` blocks
  `bash -n`-clean. `bash -n` on the audit script; em-dash sweep.
- **Delegation ledger (this pass):** primary only; the F4 pin strings are
  the Reviewer's own verified corrected code, the mutation matrix is a
  mechanical re-run of the round-1 harness extended with the two F4
  relocations, and the runner runtime blocks are untouched.

## Addendum III: F5 loop-level behavioral guard (review round 3)

- **F5 (Reviewer, BLOCKING):** R15 must stop relying on textual pins.
  Static pins and the detector-only functional test cannot express execution
  order or reachability; three review rounds (F3/F4/F5) each found escapes
  where decoys, dead lines, or one-line relocations satisfied every pin while
  the runtime contract changed. The guard now extracts each runner's REAL
  `run:` block by step name and executes it loop-level in an isolated
  sandbox: `mktemp -d` outside the repo, execution cwd set to the sandbox so
  no relative path can escape it, `env -u` scrub of the live Actions
  variables, a PATH containing only an executable mock `opencode` plus
  symlinked coreutils, a mock `sleep` (records the backoff, costs zero wall
  time), and `timeout 10` per scenario. Extraction fails closed on an empty
  or unparsable block, a missing detector definition, or a missing terminal
  `exit 1`; interception is proven before any scenario (`command -v opencode`
  must resolve to the mock, and a probe scenario must be answered by it).
- **Contract matrix (16 scenarios per path, both `action.yml` and
  `maintainer.yml`):** transient recovery on both exit shapes with the
  bounded backoff actually slept (exit 1, exit 0), exactly one same-model
  retry, persistent rejection loud after exactly two attempts with the
  provider's own status propagated across distinct values (exit 3, exit 7;
  exit-0 -> rc 1), rung advance preserved (Model-not-found on both exit
  shapes), echo/envelope non-match, indented echo non-match, a trailing
  suffixed terminal-line look-alike never consuming the retry, a stale
  terminal line beyond the `tail -n 40` window never matching, a superset
  model id never matching the boundary regex, the budget shared across rungs
  (a-free retry -> a-free -> b-free, then loud), and unclassified status
  propagation across distinct values (5, 9). Any unbounded retry re-spelling
  hangs into the per-scenario timeout and fails the rule.
- **Detector functional test (expanded):** both real extracted detectors
  (`freetier_error_terminal`, `model_error_terminal`) from both runner paths
  run against the incident terminal lines (match) and echo / envelope /
  trailing-suffix / stale-beyond-tail / superset-id forms (no match).
- **Static pins trimmed:** the brittle F3/F4 proximity windows were removed
  (they false-failed benign edits and could never express order); cheap
  anchored element-presence counts remain as tripwires, and the nonzero
  persistent exit pin is now a column-anchored whole-line match, so a
  comment quoting `exit "$status"` can no longer satisfy it.
- **Adversarial closure:** the independent adversarial verifier's round-3
  verdict (seven escape classes in the first behavioral draft: suffix regex
  loophole, whole-log Model-not-found match, tail window widened to 400, a
  boundary-less Model-not-found prefix regex, constant exits in the
  unclassified and persistent branches, and a removed exit-0 backoff) now
  has a dedicated fixture or scenario per class; its honesty note (the block
  ran with the audit's cwd) is closed by executing with cwd inside the
  sandbox.
- **This pass's evidence:** full audit 20 passed / 0 failed (2.6 s); the
  combined mutation matrix 20/20 RED under `/tmp/opencode/f5-harness/` (the
  14 original classes plus the 7 escape classes; no collateral);
  4/4 fail-closed edge tests (removed terminal `exit 1`, renamed step,
  removed detector header, non-executable mock); `bash -n` and YAML parse
  clean; em-dash sweep. The runner runtime blocks are byte-identical to the
  reviewed head (guard-only change).
- **Delegation ledger (this pass):** primary integrated the guard and
  closed the adversarial escapes; verifier A (general, independent harness:
  18/18 scenario runs across both paths, zero side effects); verifier B
  (general, adversarial: contract matrix 18/18 independent probes, seven
  escape classes reported, all closed as above). All verification ran in
  isolated copies under `/tmp/opencode/` per delegation.md section 6; the
  live workspace reports the same 20/0 verdict.

- the Lab Engineer
