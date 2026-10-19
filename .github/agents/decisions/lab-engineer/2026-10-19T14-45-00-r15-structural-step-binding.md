# R15 structural step binding (issue #653 review round 18)

## Context

Review round 18 on PR #654 (head `3ac45e82`) found four blocking
test-integrity escapes in R15 of `.github/scripts/silent-stall-audit.sh`, all
reading `25 passed / 0 failed` while disabling exactly the #591/#620/#653
behavior the rule claims to bind:

- F1: the textual extractor took the first `run: |` after the step name, so a
  decoy `run: |` block scalar inside the step (for example in `env.PROMPT`)
  won the extraction while the real body hid behind the valid `run: |2`
  spelling and became a one-shot runner; the whole-file invocation count
  stayed at exactly two (supplied by the decoy).
- F2: the watchdog-knob ban and step-key checks only saw block-key text, so
  explicit-key YAML (`? HANG_IDLE_SECONDS` / `: "86400"`, `? if` / `:
  false`, `? continue-on-error` / `: true`) parsed by PyYAML and GitHub
  Actions as the real keys while the patterns never saw them.
- F3: the verify pins were presence-only, so `if [ -f
  .maintainer/decision.json ] || true; then` (Maintainer) and `if [
  "$AGENT_OUTCOME" = "success" ] || true; then` (general) kept the echo/exit
  text while making both verifies always green.
- F4: the candidate-chain env mapping was unbound; deleting
  `MODEL_CANDIDATES: ${{ steps.model_ladder.outputs.candidates }}` from the
  composite step (and the Maintainer step) left the literal in the body and
  silently reduced the fallback ladder to the single resolved model.

## Change

- `.github/scripts/silent-stall-audit.sh`: R15 now resolves steps
  structurally with an inline python3/PyYAML pass (same precedent as R18). A
  strict loader rejects duplicate mapping keys; a missing runtime, a parse
  error, or a duplicate `run`/`if`/`shell` key all fail closed. Each runner
  step (`Run opencode`, `Run Maintainer agent`), its parsed `run` scalar,
  its key set (`if`, watchdog env, `continue-on-error`, `timeout-minutes`,
  `shell`), its `MODEL_CANDIDATES` (plus the composite `MODEL`) exact value
  bound to the resolver outputs, and the resolver step (`Resolve model
  (bounded fallback ladder)` with `id: model_ladder` and a
  `resolve-model.sh` invocation) are extracted from the parsed document.
  The extracted `run` scalars drive the whole-block exact pin and the
  behavioral harness, so a decoy `run: |` block scalar or the `run: |2`
  spelling can never shadow the executing body (F1/F4).
- The tree-wide knob scan is now structural as well as textual, recursing
  through every workflow and composite action, so explicit-key, quoted,
  block, and flow spellings of `HANG_IDLE_SECONDS` / `HANG_POLL_SECONDS` all
  trip it (F2). Positive and negative fixtures (including both explicit-key
  forms and the explicit step-key form) prove the walk and the step-key
  checks are not vacuous.
- Both verify steps are extracted structurally and EXECUTED in the sandbox
  under the production shell form: the Maintainer verify must exit nonzero
  with no `.maintainer/decision.json` and 0 once one exists; the general
  verify must exit 0 on `AGENT_OUTCOME=success` and nonzero on `failure`
  (F3). The old text pins remain as defense in depth, but the behavior is
  what the rule now asserts.
- R15's header comments, PASS summary, and failure list describe the
  structural binding, the F1-F4 classes, and the fail-closed runtime.
- `AGENTS.md` and `LAB.md` #653 entries now state the round-18 structural
  binding (and refresh the stale caught-mutant count to
  `24 passed / 1 failed` at the 25-rule base). `LAB.md` also records the
  accepted runtime residuals the review listed as non-blocking.
- The round-6 decision note loses its bare `M3` / `M4/M7` mutation IDs
  (rephrased as ordinal mutant references), per the review's non-blocking
  note.

## Boundary

The guard binds the declarative YAML surface. A `$GITHUB_ENV` write from
earlier arbitrary step code remains out of scope by design. No runtime YAML
line changed this round; the fix is confined to the audit, the docs, and
the decision notes. The fail-closed probe (a PATH whose `python3` exits 1)
shows R15 failing with `structural(python-runtime-failed)`; R18 also fails
in that shape because it has the same pre-existing python3 dependency, so
that probe reads `23 passed / 2 failed`, not `24 passed / 1 failed`.

## Evidence

- Control on the final working tree: `25 passed, 0 failed`, 0-byte stderr.
- All four reviewer escapes rebuilt on fresh exports of `3ac45e82` with only
  the audit swapped: old script `25 passed / 0 failed`, fixed script
  `24 passed, 1 failed` with exactly the expected R15 labels, 0-byte stderr:
  - F1 decoy/`|2`: `action-file(run-invocation-count)
    action-file(run-block-not-exact)
    behavioral(action-file,extract-or-shape)`.
  - F2 explicit keys: `behavioral(maintainer.yml,run-step-conditional)
    behavioral(tree,watchdog-knob-env-mapping)`.
  - F3 `|| true` verifies: `maintainer.yml(verify-missing-decision-not-loud)
    opencode.yml(general-verify-failure-not-loud)`.
  - F4 unbound candidates: `action-file(candidate-env-not-resolver-output)
    action-file(resolver-step-no-model-ladder-id)
    maintainer.yml(candidate-env-not-resolver-output)`.
- Independent verifier subagent (fresh read-only snapshot at
  `/tmp/opencode/r18-snapshot`, its own mutant construction, workspace
  hash-checked untouched): reproduced the control and all four catches with
  the same labels, and independently found a regression in the primary's
  first banner draft: the round-18 clauses used raw backticks and inner
  double quotes inside the double-quoted shell strings, so bash executed
  the backticked fragments as command substitutions (590 bytes of stderr on
  every R15 run, violating the round-16 empty-stderr invariant). The primary
  escaped every backtick and quote; control and all four mutants then
  re-ran at 0-byte stderr, and the labels were unchanged.
- `bash -n` clean on the audit script.

## Delegation ledger

- Primary: reproduced the four escapes, designed and implemented the
  structural pass and verify execution, ran the control and the four
  mutant campaigns (old and new scripts), fixed the banner escaping
  regression, and re-ran the final matrix.
- Independent verifier subagent (general; scope: fresh-snapshot mutation
  campaign under `/tmp/opencode/verify-r18`, own applier, live workspace
  read-only and hash-checked): confirmed the control, all four catches, the
  fail-closed probe shape, and found the banner backtick regression.
- Skills: no available skill matched this in-repo GitHub Actions
  regression-audit work (not opencode configuration), so none was loaded;
  noted per `delegation.md` section 5.

- the Lab Engineer
