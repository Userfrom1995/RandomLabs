# R26 hardening round 15: F28 rebase renumber and F29 shell-faithful scan

Round-14 review of PR #670 (issue #668) found the PR conflicting after
`main` took R25 for issue #701, and found the F26 literal-spelling scan
still missed ordinary shell spellings of `gh issue create`. The dedupe
handler remains untouched this round: every change is the branch rebase
onto `main`, audit-side hardening, and contract text.

## Findings addressed

- **F28 (blocking, conflict):** `main` advanced to `03752020` and claimed
  audit rule R25 for issue #701 (lab/fix agent cap headroom). The branch
  was rebased onto that base by a merge-resolution pass (the 15 original
  commits conflicted one by one; the resolved tree is re-applied as fresh
  modular commits), main's R24 (#692) and R25 (#701) are preserved intact,
  and the dedupe rule is renumbered R26 everywhere: the section header,
  `R25_*` variables and helper names to `R26_*`, the pass/fail check pair,
  `R1-R26`/`R7-R26` range labels, and the inventories in `opencode.yml`,
  `auditor.yml`, `AGENTS.md`, `LAB.md`, `maintainer.md`, and `tester.md`.
- **F29 (blocking, test-integrity):** the F26 token scan missed
  path-qualified executables (`/usr/bin/gh`, `./gh`), `env`/`command`
  prefixes, `bash -c`, quote/backslash word concatenation (`g""h`,
  `i""ssue`), backslash-newline continuations, and ANSI-C quoting
  (`$'\x69ssue'`). The scan is now shell-faithful and is exercised by a
  red self-test matrix, so a future weakening fails the audit itself.
- **F27 follow-up (minor):** the repo-local script invocation regex now
  accepts `bash`/`sh`/`source`/dot-source with optional flags, absolute or
  quoted paths, and separators.
- **F21 follow-up (minor):** a job-level `strategy` matrix is rejected
  alongside the container/defaults/env execution-shape pins.
- The round-14 decision note is corrected: the pre-fix range is
  `silent-stall-audit.sh:5034-5061` at the reviewed head (not 4732-4752),
  the changed-file count is five (the audit script, `AGENTS.md`, `LAB.md`,
  and the round-13 and round-14 notes), and the residual now records that
  the F29 spelling class is closed while direct REST creates and the
  indirection classes remain review-gated.

## What changed

1. **F28 renumber:** `.github/scripts/silent-stall-audit.sh` now runs
   `check "R25"` for main's cap-headroom rule and `check "R26"` for the
   dedupe rule; the early shadow-snapshot names, the dedupe `r26_*`
   variables, the failure summary, and every range label were updated.
   `AGENTS.md` and `LAB.md` keep the #701 R25 paragraph and describe the
   dedupe as R26.
2. **F29 shell-faithful predicate:** `issue_create_in(text)` folds
   backslash-newline continuations, folds ANSI-C quoted fragments with
   `codecs.decode(..., "unicode_escape")`, splits on shell metacharacters
   `;&|()` and backticks, strips quotes/backslashes per word, accepts
   `gh`/`gh.exe` as a path-suffix executable, and rejects any non-handler
   step run containing `gh` plus `issue` plus `create` after the `gh`
   token. The normalized Python-list check remains as a second layer.
3. **F29 self-test matrix:** `_f29_red` covers plain, absolute and
   relative path, `env`, `command`, backslash-continuation, `g""h`,
   `i""ssue`, ANSI-C, `bash -c`, global flag before the subcommand,
   subcommand repo flag, subshell, semicolon, and tab spellings;
   `_f29_green` covers `gh issue list`, `hg issue create`,
   `gh api --method POST .../issues`, and `gh workflow run`. A missed red
   case or a false-positive green case exits 21 with
   `f29-selftest-missed:` or `f29-selftest-false-positive:`.
4. **F27/F21 minor hardening and docs sync:** the invocation regex at
   `silent-stall-audit.sh:5349` is generalized; `handler-job-strategy-set`
   (exit 16) is added; the audit header, `AGENTS.md`, `LAB.md`, and the
   R26 PASS text describe the shell-faithful scan, the self-test matrix,
   and the residual (repo scripts, composite actions, reusable workflows,
   variable or command-substitution indirection, and direct REST calls).

## Verification ledger (this session)

- Baseline after the merge resolution and every edit wave:
  `bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml`
  -> `26 passed, 0 failed`; `bash -n` clean; `yaml.safe_load` succeeds on
  `maintainer.yml`, `opencode.yml`, and `auditor.yml`.
- F28: main's R24 block and R25 (#701) block are byte-untouched; the dedupe
  block, its check, and all live inventories are R26. A live-doc sweep
  found no `R1-R25`/`R7-R25` range and no dedupe reference that still says
  R25.
- F29 mutation matrix on a throwaway copy of `maintainer.yml`, restored
  after each case: plain, `/usr/bin/gh`, `./gh`, `env gh`, `command gh`,
  `g\` newline `h` at block indentation, `g""h`, `$'\x69ssue'`,
  `bash -c`, `gh -R owner/repo issue create`,
  `gh issue --repo owner/repo create`, `(gh ...)`, `gh ...;`, and
  tab-separated tokens each produced `25 passed, 1 failed` with
  `issue-create-outside-handler:<job>:<step>`. A continuation whose second
  line carries extra spaces stays green because it does not execute `gh`.
- Self-test integrity: removing the backslash-newline folding from
  `issue_create_in` produced `FAIL R26` with `f29-selftest-missed`, so the
  matrix detects a weakened predicate.
- F21: adding a job-level `strategy.matrix` produced `FAIL R26` with
  `handler-job-strategy-set`.
- F27 regex probes: `bash .github/scripts/resolve-model.sh`,
  `/bin/bash scripts/x.sh`, `bash -e -x ./scripts/x.sh`,
  `source 'scripts/x.sh'`, `. ./scripts/x.sh`, `sh "scripts/x.sh"`,
  `(bash scripts/x.sh)`, and `foo; bash scripts/x.sh` all matched;
  `gh issue list`, `echo bash is a shell`, `cat scripts/x.sh`, and
  `python3 scripts/x.py` did not.
- Handler untouched: `git diff 1b332ed7 -- .github/workflows/maintainer.yml`
  is empty; the handler run block is 14,624 bytes with md5
  `5c52d8239c31e16e97483d70f4470091` and still invokes
  `python3 -I -`.
- Zero U+2014 em dashes in the changed text files; `git diff --check`
  clean; no conflict markers in the resolved files.

## Delegation ledger

- **Explore subagent** (read-only docs/scope sweep): confirmed R26 for the
  dedupe and R25 only for #701 across all live docs, the F29 wording and
  matrix, the `opencode.yml` R24/R25/R26 inventory, exactly one section per
  rule, and no stale ranges or content inconsistencies. It also observed
  the unresolved (`UU`) index state while the working tree was already
  resolved, which this session fixed by staging the resolved files.
- **Primary (this session):** completed the merge-resolution rebase,
  renumbered the rule, implemented the F29 predicate and self-test, added
  the F27 regex and strategy pins, corrected the round-14 note, ran the
  control audits and the mutation matrix, rebuilt the branch history, and
  wrote the handoff files.
- **Skills:** no skill fits (GitHub Actions lab infrastructure and audit
  engineering, not opencode workspace configuration).

## Known residual / gap boundary

- Direct REST creates (`gh api --method POST .../issues` or
  `curl .../issues`), creates executed from inside a repo script,
  composite action, or reusable workflow, and creates reached through a
  variable or command-substitution indirection at the call site remain
  review-gated. The F26/F29 literal spelling class itself is closed and
  self-tested.
- The pre-handler canonical manifest still blocks any new pre-handler run
  line until it is regenerated with the same extractor.
- Deliberate fingerprinting, call-site character-class transformations
  outside the tested digit/space-removal/truncation classes, and
  thresholds above the fixture envelope remain as previously documented.

Refs #668.

- the Lab Engineer
