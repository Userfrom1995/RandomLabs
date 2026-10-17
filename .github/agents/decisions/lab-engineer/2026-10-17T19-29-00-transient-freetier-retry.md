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

- **Rebase:** the branch was cut at `17e32457`; that cut already carried R19
  (review-comment publication evidence, issue #616; its planned R18 was
  renumbered during that lane, no R18 exists - verified by `git show
  17e32457:.github/scripts/silent-stall-audit.sh`, corrected during the F6-F8
  pass). Main meanwhile landed R17 (per-OS findings-report contract, issue
  #608) and R20 (paginated comment-read guard, issue #621). The branch was
  rebased onto main at `b560ed38`. The single content
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
  verdict (six escape classes in the first behavioral draft: suffix regex
  loophole, whole-log Model-not-found match, tail window widened to 400, a
  boundary-less Model-not-found prefix regex, constant exits in the
  unclassified and persistent branches, and a removed exit-0 backoff) now
  has a dedicated fixture or scenario per class; its honesty note (the block
  ran with the audit's cwd) is closed by executing with cwd inside the
  sandbox.
- **This pass's evidence:** full audit 20 passed / 0 failed (2.6 s); the
  combined mutation matrix 20/20 RED under `/tmp/opencode/f5-harness/` (the
  14 original classes plus the 6 behavioral-draft escape classes; no
  collateral);
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

## Addendum IV: rebase onto main after the #612 R18 landing

- Main advanced 13 commits during this pass (PR #612 landed the Windows MSYS
  argv handoff guard and added `R18` to the audit, alongside lab health
  commits). The branch is rebased onto `a28687b5`, 0 commits behind.
- Single content conflict: the audit's failure-body invariant list.
  Resolution keeps main's new `R18 Windows MSYS argv-conversion guard` item
  and retains `R15 model fallback ladder plus transient free-tier retry`.
  Addendum I's historical note ("no R18 exists") referred to the #616 lane's
  renumbering at that time; main has since filled the slot with the MSYS
  guard, and the rebased tree carries it.
- The runner blocks (`action.yml` "Run opencode", `maintainer.yml` "Run
  Maintainer agent") are byte-identical to the previously verified head
  (guard-only diff, no conflicts there), and the full guard verification was
  re-run on the rebased tree: pristine audit 21 passed / 0 failed (R18
  included); combined mutation matrix 20/20 RED; 4/4 fail-closed edge tests.
- **Delegation ledger (this pass):** primary only: mechanical rebase plus a
  re-run of the existing harness in refreshed isolated copies
  (`/tmp/opencode/f5-harness/repo-e2`, `tree`).

## Addendum V: rebase onto main after the #629 R22 landing

- Main advanced to `114406a2` (PR #629 landed the tester verdict publication
  contract and added `R22`; the audit's range labels are now `R1-R22` with
  R22 after R21). The branch is rebased onto it, 0 commits behind.
- Single content conflict: the audit's failure-body invariant list. The
  resolution keeps main's new `R22 tester verdict publication` item and
  retains `R15 model fallback ladder plus transient free-tier retry`. The
  auto-merged `AGENTS.md`/`LAB.md` text was checked for coherence: the #620
  free-tier sections and main's #629 R22 section coexist with no duplicated
  sections and no stale `R1-R21` label anywhere in the tree. `git range-diff`
  shows every commit identical except the conflict hunk in the R15 guard
  commit; the runner blocks and the entire R15 region are byte-identical to
  the reviewed head.
- Re-verification on the rebased tree: pristine audit 22 passed / 0 failed
  (R22 included, run both in the workspace and in an extracted copy under
  `/tmp/opencode/mutfix2`); the mutation spot-check matrix re-run there is
  7/7 RED, one class per pin/behavioral layer: decoy cap (anchored count plus
  behavioral timeout), persistent-branch `exit 0` substitution (behavioral
  rc mismatch only: the static pins stay clean by design), loop-condition
  rewrite (behavioral attempt mismatch), dead backoff after `continue`
  (behavioral no-backoff-sleep), alternate in-loop budget reset
  (`$((0))` spelling: behavioral timeout), budget-after-`continue` (behavioral
  timeout), hoisted budget (consumption count plus behavioral mismatch). A
  step-rename fail-closed edge check trips `extract-or-shape` (never skips).
- **Delegation ledger (this pass):** no subagents; the pass is a mechanical
  rebase plus a re-run of the previously specified harness in isolated copies
  under `/tmp/opencode/` (delegation.md section 6: mocks `chmod +x`,
  interception asserted, env scrubbed, execution cwd inside the sandbox,
  timeout per scenario). Zero external side effects confirmed (no new PR
  comments or API writes from the harness runs; the audit's mocks intercepted
  every invocation). Skills: no skill fits (GitHub Actions lab
  infrastructure, not opencode workspace configuration).

## Addendum VI: F6-F8 guard closure (review round 4)

- **F6 (Reviewer, BLOCKING):** the mock `sleep` recorded the executed value,
  but the behavioral case asserted only that the sleeps file was non-empty,
  so a decoy `sleep 15` holding the static count while the live wait became
  `sleep 31536000` kept the full audit green. The case now requires exactly
  one recorded sleep with the value `sleep 15` (`bad-backoff` otherwise);
  the corrected snippet is the Reviewer's own verified code.
- **F7 (Reviewer, BLOCKING):** no scenario reached post-loop exhaustion, so
  one `exit 0` before the exhaustion echo made a dead ladder silently green.
  A new `mnf-all` scenario (every rung answers Model-not-found, attempts
  `a-free, b-free`) asserts rc 1 with the exhaustion message on both paths.
- **F8 (Reviewer, BLOCKING):** two outside-every-fixture escapes are closed.
  (a) The MNF detector fixtures used dotless ids, so unescaping the live
  regex (dot -> wildcard) while holding the pinned forms in comments passed;
  the `mnf-dotted` / `mnf-dot-lookalike` fixture pair (the real dotted rung
  id `opencode/deepseek-v4.1-flash-free` matches, its lookalike with the dot
  position held by another character does not) plus the parameterized
  detector case close it. (b) No scenario advanced on Model-not-found and
  then hit a free-tier rejection, so consuming the retry budget before the
  MNF `continue 2` passed; `mnf-then-ft` (nonzero MNF) and `mnf-then-ft0`
  (exit-0 MNF) assert the advance consumes no free-tier budget (`a-free
  b-free b-free`, one exact sleep, rc 0).
- **Non-blocking extraction hardening:** the behavioral extractor takes the
  first step matching its name, so a duplicate compliant decoy step could
  shadow a broken real step; a uniqueness pin now requires exactly one `Run
  opencode` / `Run Maintainer agent` step in each file.
- **Mutation matrix (this pass, full audit per mutation, both runner
  files):** pristine control 22 passed / 0 failed; F6 (huge live sleeps plus
  two unreachable decoy `sleep 15` lines) -> `bad-backoff`; F7 (`exit 0`
  before the exhaustion echo) -> `mnf-all:rc=0,want=1` and missing-output;
  F8a (unescaped live MNF regexes plus a comment decoy holding the static
  pins) -> `mnf-dot-lookalike` on both detector files with no static flag;
  F8b (`freetier_retry_used=$((1))` before both MNF `continue 2` lines) ->
  `mnf-then-ft` and `mnf-then-ft0`; re-confirmed F5 classes: cap decoy ->
  `no-bounded-freetier-retry-cap`, persistent-branch `exit 0` ->
  `persistent-zero` rc mismatch, loop-condition rewrite -> attempt mismatch,
  dead backoff -> `bad-backoff`, alternate in-loop reset -> timeout
  (rc=124). 10/10 with no collateral: each mutation fails only R15, every
  other rule stays green, and every mutated YAML parses.
- **Count and date corrections (Reviewer nits):** Addendum III's "seven
  escape classes" / "14 original plus 7" was internally inconsistent (the
  enumeration lists six, and 14 + 6 = 20 matches the stated matrix); both
  now read six, and the R15 source comment and check text are harmonized.
  Addendum I dated R19 after the branch cut, but `git show
  17e32457:.github/scripts/silent-stall-audit.sh` already contains the R19
  checks; the text now records R19 as present at the cut with only R17 and
  R20 landing on main afterwards.
- **Docs sync:** the AGENTS.md and LAB.md R15 contract enumerations now
  name the exact-backoff assertion, the budget-preserving Model-not-found
  advance, the reached-and-loud exhaustion, and the dotted-id boundary
  matching, so the public description matches what the guard executes.
- **Documented residual (non-blocking, Reviewer-identified):** the
  behavioral harness runs the documented two-rung candidate chain (`a-free
  b-free`) while the production ladder has three rungs, so a budget reset
  gated on the third rung id could escape; a generic per-rung reset is
  already caught (`budget-rungs`). Widening the harness candidates is
  deferred; the Reviewer explicitly declined to block on it.
- **This pass's evidence:** control audit 22 passed / 0 failed in the
  workspace and in a fresh export; the 10-case matrix above under
  `/tmp/opencode/lab620-f6f8/` (per-mutation tree copies outside the repo;
  mock `opencode`/`sleep` interception, env scrubbed, per-scenario timeout).
- **Delegation ledger (this pass):** primary integrated the Reviewer's
  verified corrected snippets and ran the full matrix; one independent
  general verifier subagent reproduced the control and all four F6-F8
  mutations on its own fresh export under
  `/tmp/opencode/lab620-verify-sub/` (same flags, only R15 red, YAML parse
  clean, repo untouched). Skills: no skill fit (GitHub Actions lab
  infrastructure).

## Addendum VII: R15 round-6 closure (A1/A2/A3)

- **A1 (Reviewer, BLOCKING):** the log-capture guard was pinned statically but
  never executed: every scenario's capture succeeds, so the guard's failure
  branch could rot behind a satisfied pin while the run continued on an empty
  log. The sandbox now swaps a failing `tee` mock (reads stdin, writes `$1`,
  exits 3) onto `PATH` for a `failing-tee` scenario whose mock `opencode`
  otherwise prints a healthy success line: both runner paths must fail loudly
  (rc 1, exactly one attempt) with the `could not capture the opencode log`
  error and must never continue on the empty log.
- **A2 (Reviewer, BLOCKING):** the tail window had only upper-bound fixtures,
  so shrinking `tail -n 40` itself passed every detector fixture. New
  boundary pair for both detectors: `ft-window39` (terminal line + 39 healthy
  trailing lines) must still match, `ft-window40` must not; new `ft-trailing`
  behavioral scenario (attempt 1 exits 0 with the FT terminal line followed
  by 3 healthy lines) must still consume exactly one same-model retry
  (attempts `a-free a-free`, rc 0): a narrowed window mistakes the failure
  for success and stops after one attempt.
- **A3 (Reviewer round 6, "Also exercise"; round 7 re-flagged the F8a
  remainder as blocking):** the dotted-candidate
  production-shape behavioral path now covers the nonzero boundary grep too:
  `mnf-dot-lookalike` runs the real dotted candidate
  `opencode/deepseek-v4.1-flash-free` whose attempt-1 nonzero line names the
  lookalike `opencode/deepseek-v4X1-flash-free` (one character where the dot
  sits) and asserts the run does not advance to the next rung on it
  (attempts stay `opencode/deepseek-v4.1-flash-free`, rc 4).
- **Guard implementation:** four window fixtures, three mock opencode arms
  (`failing-tee`, `ft-trailing`, `mnf-dot-lookalike`), the failing `tee` mock
  plus its per-scenario swap/restore in the sandbox setup, a candidates
  parameter on the behavioral runner (`MODEL_CANDIDATES`/`MODEL`), the third
  optional `cands` argument on the case helper, three new behavioral cases,
  and the R15 header/check/failure text now naming the functional detector
  fixtures and the new scenarios.
- **Mutation matrix (this pass, full audit per mutation, both runner files):**
  pristine control 22 passed / 0 failed (workspace and an independent fresh
  export); 19 mutations each trip exactly one check (R15) with their
  dedicated flags, no collateral, every mutated YAML parses:
  - round-6 classes: A1 failing-tee decoy (`|| true` failure branch plus a
    comment decoy holding the static pin) -> `failing-tee:rc=0,want=1` and
    missing-output on both labels; A2 window narrowing (`tail -n 2`, static
    pins held) -> `ft-window39` functional mismatch on both detector files
    plus `ft-trailing` attempts and backoff on both labels plus the new
    tail-scope static pin; A3 unescaped nonzero boundary grep (comment decoy
    holds the pinned form) -> `mnf-dot-lookalike` attempts mismatch on both
    labels.
  - re-confirmed rounds F3-F8: F3a budget moved after `continue` -> timeout
    (rc=124); F3b `if false` wiring plus comment decoys -> static wiring
    pins; F3c huge live sleeps plus unreachable decoy sleeps -> anchored
    static count plus `bad-backoff`; F3c1/F3c2 per-branch loud-exit swaps ->
    the branch-tied exit pins; F4a hoisted budget ->
    `transient-nonzero:rc=1,want=0`; F4b in-loop init -> timeout; F5a cap
    decoy -> static cap pin; F5b persistent `rm -f "$log"` -> `exit 0` ->
    `persistent-zero:rc=0,want=1`; F5c loop-rewrite (condition-only advance)
    -> `transient-nonzero:rc=1,want=0` (the while body never re-enters for
    the next rung, so the false exhaustion is caught behaviorally); F5d dead
    backoff -> `bad-backoff`; F5e alternate in-loop reset -> timeout; F6/F7/
    F8a/F8b as recorded in Addendum VI.
- **Docs sync:** the AGENTS.md #620 bullet and both LAB.md R15 sections now
  name the functional detector fixtures (39/40 lower bound, dot-lookalike),
  the failing-tee loudness, the trailing-lines retry, and the widened denial
  (no textual pin relocation, decoy, loop rewrite, or detection-window tweak
  impersonates the contract).
- **This pass's evidence:** control audit 22/0 in the workspace; 20-case
  matrix under `/tmp/opencode/lab620-a12/` (full-tree copies outside the
  repo, full audit plus YAML parse per mutation).
- **Delegation ledger (this pass):** primary implemented the guard scenarios
  and ran the full 20-case matrix directly; one independent general verifier
  subagent re-exported the workspace, reproduced the control (22/0) and the
  three round-6 mutations on its own copies, confirmed exactly one R15 FAIL
  with the dedicated flags, clean YAML each time, and the new scenario tokens
  present in the guard file. Skills: no skill fit (GitHub Actions lab
  infrastructure).

## Addendum VIII: R15 round-7 hardening (blocking items re-verified, four non-blocking residuals adopted)

The round-7 review (run 39074509081, head `6150a829`) found A1, A2 and the
F8a remainder blocking; a concurrent run had already folded all three in
`ff1d2f50`, `6dde5362` and `6150a829`, and this pass re-verified them present
(failing-tee mock, 39/40 window pair, ft-trailing, mnf-dot-lookalike). The
four non-blocking hardening residuals from that review are now adopted:

- **Backoff timing (H1):** the mock `sleep` records its own start and end
  timestamps around a real 0.2s nap; the F6 check now requires exactly one
  `^sleep 15 ` record, exactly one `^end ` record, and proves the last
  recorded attempt started at or after the recorded sleep end. A
  backgrounded `sleep 15 &` (which starts attempt 2 before the nap ends) is
  caught as `backoff-not-waited` even while dead decoy `sleep 15` lines hold
  the anchored static count at 2 per file.
- **Case sensitivity (H2):** two new fixtures (`ft-upper.txt`,
  `mnf-upper.txt`) carry the terminal forms with the distinguishing words
  uppercased and expect no match, so a case-folding `grep -qiE` on either
  detector is caught (`mnf-upper.txt,rc=0,want=1`).
- **Deep-rung budget gating (H3):** two new behavioral scenarios run the
  three-rung candidate chain `a-free b-free c-free`: `deep-grant` asserts the
  third rung gets its own FT retry (`a-free a-free b-free c-free`, one
  sleep), so a rung-gated grant or an in-loop reset is caught by rc=124 and
  an attempts mismatch; `deep-advance` asserts the third rung's FT retry is
  consumed before the fourth candidate (`a-free b-free c-free c-free`), so a
  synthetic consumption/thrift on a later rung is caught by the attempts
  mismatch.
- **Step identity (H4):** each runner file must carry exactly one
  `opencode github run` invocation string; the extracted step header (name
  line through `run: |`) must carry no `if:` gate (`run-step-conditional`);
  and the fail-closed shape check now also requires the invocation inside
  the extracted block, so a dead decoy step parked earlier can neither
  shadow a broken real step nor itself be extracted while skipped.
- **Anchored static tripwires:** the tee-guard count and the `tail -n 40`
  scope count are now anchored line-count pins (1 and 2 per file) replacing
  four weaker unanchored substring pins; a decoyed or displaced guard or
  scope change is caught statically before the behavioral run.
- **Mutation matrix (this pass, fresh `git archive HEAD` export under
  `/tmp/opencode/lab620-r7h/`, full audit per mutation, both runner files):**
  pristine control 22 passed / 0 failed; 12 mutations each turn exactly R15
  red with their dedicated flags and no other rule failing:
  - H1 backgrounded `sleep 15 &` plus dead decoy sleeps ->
    `bad-backoff`/`backoff-not-waited`; H2 `grep -qiE` on the mnf detector ->
    `mnf-upper`; H3 theft `freetier_retry_used=$((1))` on `c-free` ->
    `deep-advance` attempts mismatch; H3 grant/reset `$((0))` -> `deep-grant`
    rc=124 plus attempts mismatch.
  - H4 dead `if: false` decoy named `Run opencode`/`Run Maintainer agent`
    parked before the renamed real step -> `run-invocation-not-unique` plus
    `run-step-conditional` (and the extracted decoy trips the static count
    cohort).
  - Re-confirmed seeds: F5b persistent zero-exit -> `persistent-zero`; F5c
    loop rewrite -> `transient-nonzero`; F5e alternate in-loop reset ->
    timeout (rc=124); F6 huge live sleep plus decoys -> `bad-backoff`; F7
    exhaustion exit-0 -> `mnf-all`; A1 decoyed tee guard -> `failing-tee`;
    A2 narrowed tail window -> `ft-window39` plus `ft-trailing`.
  - Harness-side note (honesty): the first A1 decoy mutation used an empty
    `if` body, which is invalid bash; the guard reported
    `extract-or-shape`, not the behavioral flag. After giving the decoy a
    non-empty body the guard reported the dedicated `failing-tee` flag, so
    the miss was in the mutation construction, not the guard.
- **Independent verification:** a general verifier subagent re-exported
  `faa64bdb`, reproduced the control (22/0, byte-exact summary), confirmed
  `opencode github run` appears exactly once per runner file, built its own
  six mutations with its own applier (M1 backgrounded backoff, M2 case fold,
  M3 deep-rung theft, M4 deep-rung reset, M5 shadowed step, M6 decoyed tee
  guard), and observed exactly one R15 FAIL with the expected dedicated
  flags and no collateral failures on all six. Verdict: CONFIRMED.
- **Docs sync:** the AGENTS.md #620 bullet and both LAB.md R15 paragraphs now
  name the recorded-and-waited backoff proof, the case-sensitivity fixtures,
  the deep-rung budget scenarios, and the unique-invocation and
  unconditional-header step identity checks.
- **This pass's evidence:** workspace audit 22/0; primary matrix under
  `/tmp/opencode/lab620-r7h/`; independent verification report under
  `/tmp/opencode/verify-r7/` (full-tree copies outside the repo, full audit
  per mutation).
- **Delegation ledger (this pass):** primary implemented the four hardening
  items, the anchored tripwires and the docs sync, and ran the direct 13-run
  matrix; one independent general verifier subagent reproduced the control
  and the six hardening mutations on its own fresh export and confirmed the
  dedicated flags with no collateral. Skills: no skill fit (GitHub Actions
  lab infrastructure).

## Addendum IX: R15 round-8 closure (A4 tee pin re-verified, AENV residual accepted and recorded)

The round-8 review (run 39076944681, head `6150a829`) found A4 blocking: the
log-capture (tee) guard was pinned only by whole-file substring greps plus the
`failing-tee` behavioral fixture whose tee exits exactly 3, so a live
condition rewrite to `if [ "$tee_status" -eq 3 ]; then` with a comment decoy
quoting the pinned substring kept the full audit green while a failing tee
that writes nothing and exits 1 blind-advanced silently (rc 0 instead of the
loud rc 1). The review could not see the fix because the concurrently running
round-7 hardening pass had authored it at 23:02:26Z in `d0d14361` but the PAT
push landed at 23:20:41Z, after the review sampled the then-pushed head.

- **Closure already shipped:** `d0d14361` replaced the four weak pins with
  anchored line-count tripwires, including exactly the pin the review
  prescribed. `.github/scripts/silent-stall-audit.sh:689` now counts
  `^[[:space:]]*if \[ "\$tee_status" -ne 0 \]; then$` per file (= 1), which a
  comment decoy can never satisfy, with the `failing-tee` scenario carrying
  the behavioral semantics.
- **A4 re-verification (this pass, fresh `git archive HEAD` export under
  `/tmp/opencode/lab620-a4/`):** pristine control 22 passed / 0 failed; the
  exact round-8 A4 mutation in both runner files (live guard rewritten to
  `-eq 3`, comment decoy holding the pinned substring) turns exactly R15 red
  with `action-file(tee-guard-decoyed-or-missing)` and
  `maintainer.yml(tee-guard-decoyed-or-missing)`, 21 passed / 1 failed, no
  collateral.
- **AENV accepted residual (reviewer finding, reproduced in
  `/tmp/opencode/lab620-a4/aenv/`):** inserting
  `if [ "${GITHUB_ACTIONS:-}" = "true" ]; then exit 0; fi` immediately before
  the persistent-rejection message in each branch keeps the full audit green
  (the harness scrubs `GITHUB_ACTIONS` per delegation.md section 6, so the
  sabotage is inert under test), while in a live Actions environment the
  persistent path exits 0 silently before the loud message (reviewer-verified:
  scrubbed env rc 1 loud, `GITHUB_ACTIONS=true` rc 0 silent). Accepted, not
  fixed: any scrubbed harness is exposed to an edit that reads its
  environment, and a runner diff branching on `GITHUB_ACTIONS=true` is
  facially malicious. Recorded here as a known limitation.
- **Non-blocking re-confirmations:** the round-8 review measured the
  backgrounded-sleep, case-fold, per-rung budget and step-shadowing classes
  on head `6150a829`, before `d0d14361`; the H1-H4 hardening recorded in
  Addendum VIII was verified on `faa64bdb`, and `29c8955a` only extends it
  with the decision note, so that evidence carries by ancestry.
- **Nit corrections (round-8 review):** Addendum VII's A3 label now records
  that round 7 re-flagged the F8a remainder as blocking; LAB.md's R15
  paragraph now labels the covered classes "review rounds F5-F8 plus A1-A3"
  instead of the under-inclusive "F5-F6".
- **Delegation ledger (this pass):** primary only - this was mechanical
  re-verification of an already-prescribed pin plus the recording of a
  reviewer-executed residual, so a subagent would have duplicated the same
  execution. Skills: no skill fit (GitHub Actions lab infrastructure).

- the Lab Engineer

## Addendum X: R15 round-9 closure (F9 tee-status narrowing, seed matrix re-run)

The round-9 review (run 39078662290, sampled head `29c8955a`) found F9
blocking: the round-8 A4 anchored tee pin is still a whole-file count, so a
dead line carrying the exact anchored form satisfies it, and the single
`failing-tee` fixture exercises tee exit status 3 only. A live guard
narrowed to `if [ "$tee_status" -eq 3 ]; then` (anchored form parked in an
unreachable `if false` block) therefore kept the full audit green while a
tee failure at any other status silently blind-advanced on both runner
paths.

**Closure shipped (harness only, runtime blocks untouched):**

- The failing-tee mock now exits `"${R15_TEE_FAIL:-3}"` instead of a
  hardcoded 3; the swap condition covers every `failing-tee*` scenario; the
  mock `opencode` answers the `failing-tee*` family; the scrubbed `env`
  invocation forwards `R15_TEE_FAIL`; and the matrix adds `failing-tee1`
  (status 1) and `failing-tee2` (status 2) beside the original status-3
  case, each asserting rc 1, exactly one attempt, and the per-path loud
  `could not capture the ... opencode log` message.
- The R15 comment block, the R15 pass text, `AGENTS.md`, and `LAB.md` now
  name the status-parameterized coverage.

**Evidence (isolated `/tmp/opencode` sandboxes, fresh copies, no repo side
effects):**

- **Closure proof:** with the F9 mutation applied to both runner files (dead
  `if false; then <anchored guard> fi` block after the status assignment,
  live guard rewritten to `-eq 3` behind a comment decoy), the PRE-fix guard
  (audit script from HEAD `c1d11c3a`) reports 22 passed / 0 failed, exactly
  reproducing the reviewer's escape, while the POST-fix guard reports
  21 passed / 1 failed with `behavioral(action-file,failing-tee1:rc=0,want=1)`
  plus `failing-tee1:missing-output` and the same pair for `failing-tee2`,
  on both labels, no collateral.
- **Seed matrix on the new guard** (one isolated sandbox per mutation, every
  mutated YAML parse clean, exactly one R15 FAIL each, no collateral):
  - F5b persistent-branch `rm -f "$log"` -> `exit 0`: rc-mismatch flags
    (`persistent-nonzero:rc=0,want=3`, `persistent-nonzero7:rc=0,want=7`,
    `persistent-zero:rc=0,want=1`, `deep-grant`, `deep-advance`,
    `budget-rungs`) on both labels.
  - F5e `freetier_retry_used=$((0))` at the top of the retry loop: rc=124
    timeouts with 47-attempt runs on both labels (unboundedness spilling
    past the 10 s per-scenario timeout).
  - A1 no-decoy guard disable: static
    `tee-guard-decoyed-or-missing` plus the behavioral status-3 flags.
  - F6 live `sleep 31536000` with two unreachable count-holding decoys:
    `bad-backoff` on every retry scenario on both labels.
  - F7 `exit 0` before the exhaustion echo: `mnf-all:rc=0,want=1` plus
    missing-output on both labels.
  - F9 as above.
- **Control:** pristine tree 22 passed / 0 failed.
- **Round-9 non-blocking items:** the A4 matrix and AENV record the review
  asked for were already landed on this head by `25ae3d6f`/`c1d11c3a`
  (after the review sampled `29c8955a`); verified present (Addendum IX
  records both, Addendum VII's A3 label records the round-7 re-flag, and
  LAB.md reads "review rounds F5-F8 plus A1-A3").

**Delegation ledger (this pass):** one independent verifier subagent
(general; fresh `git archive` export of the committed head `b6347e65`,
own YAML mutation scripts, sandbox `/tmp/opencode/r10-verify`): reproduced
control 22/0; reproduced the F9 mutation at 21/1 with exactly the eight
`failing-tee1`/`failing-tee2` flags on both labels and no collateral; also
showed a `-eq 1` narrowing variant is caught by the status-3 fixture plus
the static anchored pin; repo tree untouched. Primary verified itself:
control on the committed tree 22 passed / 0 failed; the closure proof
(pre-fix guard 22/0 under the F9 mutation, post-fix 21/1 with the identical
flags) in `/tmp/opencode/san-f9-prefix` and `/tmp/opencode/san-f9`; the
six-mutation seed matrix in six isolated `/tmp/opencode/san-*` sandboxes;
YAML parse on every mutated copy; `bash -n` on the audit script; em-dash,
attribution, and clean-tree sweeps. Skills: no skill fit (GitHub Actions
lab infrastructure, not opencode workspace configuration).

- the Lab Engineer
