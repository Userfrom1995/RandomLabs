# R26 hardening round 21: F41 handler PATH pin and the ambient-shim surface

Round-21: the Reviewer's verdict on PR #670 BLOCKED the guard with F41:
the anchored `Run /oc triggers as owner` handler step carried no `PATH`
key, so the runner's ambient PATH (which on hosted runners includes the
user-writable directories `/home/runner/.local/bin`,
`/home/runner/.cargo/bin`, `/home/runner/.dotnet/tools`, and the composer
vendor bin, ahead of `/usr/bin`) decided which `gh`/`python3` binary the
handler executed. A pre-handler repo script could therefore plant a shim
that answers the dedupe query with `[]` (or shims `python3`), silently
restoring the exact duplicate the guard exists to prevent, while the audit
stayed green. The production dedupe handler itself is untouched: whole
file `md5 535bf74533e12288c095654a793d24e5` (was
`a017b55323a9050f8a75e49f50a445c4`; the delta is the single env line),
handler run block `md5 5c52d8239c31e16e97483d70f4470091` (14,624 bytes,
the PyYAML `run` value of the unique `Run /oc triggers as owner` step,
byte-identical to round 20), `python3 -I -` isolation preserved.
Correction (round 22, F42): the earlier `30824dca...` / 13,725-byte figure
was a double-dedented extraction (10 more spaces stripped from the
already-unindented value), not the executing step's run block; the audit's
canonical pinned rendering (blank lines dropped) is 14,606 bytes / md5
`6df27e3fbcfdbef18b154f8c76ef415d`.

## Findings addressed

- **F41 (blocking, reviewer):** fix in four layers.
  (1) The handler step env now pins
  `PATH: /usr/local/bin:/usr/bin:/bin`, so the step environment, not the
  ambient runner PATH, selects the binaries the handler invokes.
  (2) The R26 parse-tree check requires that exact PATH value
  (`handler-step-path-not-pinned`, exit 14) and the exact env key set
  `{"GH_TOKEN", "BOT_TOKEN", "PATH"}` (`handler-step-env-keys-changed`,
  exit 14); the extractor hands the parsed value to the shell section via
  a fifth output file, and the shell owns a first-class assertion
  (`handler-path-not-exact`) with a pinned fallback, so the functional
  sandbox can never compose an unpinned PATH even if the extractor were to
  fail early.
  (3) The pre-script token scan now also bans `.local/bin`, `.cargo/bin`,
  `.dotnet/tools`, and `.config/composer/vendor/bin` in every repo-local
  script invoked by a pinned pre-handler step (defense in depth; the
  primary F41 defense remains the pin, because the scan is a named-token
  check and indirection is the documented residual).
  (4) A new functional scenario `outside` plants an executable fake `gh`
  at `$dir/home/.local/bin/gh` (marker `$dir/outside-hit`) and asserts
  `outside-shim-not-executed`, `outside-lists-once`, `outside-no-create`,
  `outside-skip-loud`, and the `outside-triage-665` dispatch with the
  sandbox PATH composed only from the derived `$GITHUB_PATH` dirs, the
  mock bin, and the extracted pinned value - never the ambient audit PATH
  and never the user directory.
- **Precision item surfaced by subagent A (recorded, residual class):** a
  pre-handler repo script can still write a directory to `$GITHUB_PATH`
  through variable/string indirection (e.g. `"GITHUB_""PATH"` or
  `${!name}`), and the actions/runner prepends `$GITHUB_PATH` entries to
  the step env PATH (`ScriptHandler`/`FileCommandManager`), so the pin
  alone does not neutralize that channel: the named-token scan is
  load-bearing there, and one level of indirection inside a repo-local
  script stays the documented review-gated residual. This matches the
  AGENTS.md/LAB.md residual text ("an env-file channel reached through one
  level of indirection inside a repo-local script"); no claim of
  neutralizing `GITHUB_PATH` writes is made anywhere in the new text.
  A literal `.local/bin` write to a script is caught
  (`handler-pre-script-channel`), and a shim planted without a
  `$GITHUB_PATH` entry is provably unreachable (the `outside` scenario).

## What changed

1. `.github/workflows/maintainer.yml`: one added env line,
   `PATH: /usr/local/bin:/usr/bin:/bin` on the handler step.
2. `.github/scripts/silent-stall-audit.sh`:
   - extractor: F41 PATH value check plus env key-set check (both exit 14),
     PATH handed to the shell via the fifth output file (argv[5]);
   - shell: `r26_handlerpath_out` mktemp, fifth extractor argument, value
     read, pinned fallback, and the `handler-path-not-exact` assertion;
   - pre-script token scan extended with the four ambient user-writable
     directory tokens;
   - `r26_run` gains a seventh parameter `plant_outside`; the `outside`
     scenario (`$r26_tmp/outside`, marker/assertions above) runs after
     `pathshadow`; the composed PATH drops the ambient `$PATH`;
   - comment updates (F25 pre-handler region, F27 repo-script scan, F41
     ambient surface) and the R26 PASS text/contract property synced with
     the F41 narrative.
3. `AGENTS.md:76` and the `LAB.md` R26 section: pinned PATH, ambient
   directories, the `outside` scenario, and the moved findings range
   (`F4-F41`).
4. This note (round-21 evidence).

## Verification ledger (this session)

- Baseline and final:
  `bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml`
  `-> 26 passed, 0 failed` (final run by independent verifier B; `bash -n`
  clean; `yaml.safe_load` clean on `maintainer.yml` and `opencode.yml`).
- Primary mutation matrix (edit, audit, restore via `/tmp` backups):
  PATH line removed -> `handler-step-path-not-pinned` (25/1); PATH value
  extended with `/home/runner/.local/bin` -> same token (25/1); extra env
  key added -> `handler-step-env-keys-changed` (25/1); literal `.local/bin`
  appended to `resolve-model.sh` -> `handler-pre-script-channel` (25/1);
  sandbox PATH with the user dir ahead of the mock bin ->
  `functional-outside-shim-not-executed` plus the other `outside-` failures
  (25/1), proving the scenario is sensitive.
- Subagent A (adversarial hunt, 10-case matrix): A1-A9 all fail closed
  with the intended tokens (or stay green exactly when the effective value
  is unchanged: quoted PATH, flow-style env mapping); A10 identified the
  `$GITHUB_PATH` indirection residual recorded above, reproduced twice,
  with the literal-token control red proving the scan itself runs. No
  new in-envelope escape: the pinned pin, the parse-tree check, the token
  scan, and the scenario each carry their intended case.
- Subagent B (independent verification): 12/12 checks PASS - syntax/YAML,
  diff scope exactly the four intended files with zero untracked, the
  one-line `maintainer.yml` delta, run-block md5 `5c52d823...`/14,624
  bytes, whole-file md5 `535bf745...`, em-dash scan clean, extractor
  argv[5] handoff, scenario wiring and assertions quoted at their live
  line numbers, token list complete, docs consistency (including no stale
  "two token keys only" claim and no misassociated `GITHUB_WORKSPACE`
  sentence), and the final 26/0 run with all F41 phrases present in the
  R26 PASS text.
- Hygiene: zero U+2014 em dashes in the changed files; `git diff --check`
  clean; the branch remains `opencode/lab-668-create-issue-dedupe` at
  `529e3159` plus the two new commits, 0 behind `origin/main`.

## Delegation ledger

- **general subagent A (adversarial F41 hunt):** baseline plus A1-A10,
  the runner-source analysis of the `$GITHUB_PATH` prepend behavior, and
  the production-reachability judgment of each green result; saved under
  `/tmp/opencode/hunt-a` with logs; real workspace untouched.
- **general subagent B (independent verification):** the 12-check matrix
  above, each with the exact command and observed output; read-only on the
  real workspace.
- **Primary verified itself:** every edit, the baseline and final 26/0
  runs, the five mutations above, the md5s, the em-dash scan, and this
  note.
- **Skills:** no skill fits (GitHub Actions lab infrastructure and audit
  engineering, not opencode workspace configuration).

## Known residual / gap boundary

- The four F41-adjacent residual classes stay review-gated: repo-script
  indirection into the runner env-file channels (A10; named in the R26
  residual text), deliberate fingerprinting, thresholds above the fixture
  envelopes, and the previously documented create/`gh` indirection
  families (F2/F4-F41).
- Emptying any fixture list or shrinking any assertion remains
  diff-review territory: fixtures and assertions are data, not
  structurally pinned, the same boundary that applies to every edit of
  the audit script itself.

Refs #668.

- the Lab Engineer
