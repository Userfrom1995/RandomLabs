# R26 hardening round 19: F37 `gh issue new` alias, F38 residual naming, F39 artifacts

Round-19 review of PR #670 (issue #668) proved one more ordinary spelling
still executed a real create while the R26 scan reported `26 passed,
0 failed`: the documented `gh issue new` alias of `gh issue create`
(F37, blocking). It also asked the residual enumeration to name (or close)
the remaining composition spellings (F38, minor), and flagged two artifact
nits plus a stale PR body (F39, minor). All fixes are audit-side: the
production dedupe handler in `.github/workflows/maintainer.yml` is
untouched (`md5 05e477fa6a503fbfeb44365d6d5950a9`).

## Findings addressed

- **F37 (blocking):** `issue_create_in` required the literal `create`
  subcommand and the normalized aliases matched `"issue,create"` only, so
  `gh issue new --title x --body y` (and `/usr/bin/gh issue new`,
  `gh -R owner/repo issue new`, `gh issue $"ne"w`, and a Python
  `["gh", "issue", "new"]` list) was green at 26/0 while creating an
  issue. Fixed with `_issue_subcommand(words, start)`, which resolves the
  first non-flag word past global flags (`--repo`/`-R`/`--hostname`/
  `--config` and their values), with `issue_create_in` accepting `create`
  or `new`, and with the combined detector also matching `"issue,new"`
  in the decoded, normalized form. Fixture coverage: seven alias spellings
  in `_f29_red`, a new `_f30_alias_red` list (subprocess list form,
  adjacent-literal split `"ne" "w"`, `\x6e` escape) so the normalized
  alias path has a load-bearing direct self-test
  (`f37-normalized-selftest-missed`), and three `_f29_green` negatives
  (`gh issue list --search new`, `gh issue comment 1 --body new`,
  `gh issue close new`) so the word `new` alone can never trip the scan.
- **F38 (minor):** the documented residual now names the composition
  spellings explicitly: a create reached through `xargs`, a shell-function
  wrapper, a shell `alias`, or a glob-expanded executable path such as
  `/usr/bin/g[h]` (these stay review-gated; statically following arbitrary
  shell composition is not claimed). Synced in the script header, the R26
  PASS text, `AGENTS.md:76`, and LAB.md.
- **F39 (minor):** the round-18 note's line 7 now says "round-16 note
  (F36)" (F36's own heading already did); the trailing whitespace on its
  mutation-integrity line is stripped; the PR body is refreshed to the
  current R26 shape (this round).

## What changed

1. `.github/scripts/silent-stall-audit.sh`: `_issue_subcommand` helper;
   `issue_create_in` accepts `create`/`new`; `issue_create_detected`
   matches `"issue,new"` on the decoded normalized form; seven `_f29_red`
   alias fixtures, three `_f29_green` negatives, the `_f30_alias_red` list
   plus its direct self-test, the extended combined loop, and header/PASS
   text synced (alias resolution, F37/F38).
2. `AGENTS.md:76` and the LAB.md R26 paragraph: alias/F37 coverage,
   `_f30_alias_red` in the self-test list, the F38 residual names, and the
   findings range moved to `F2/F4-F38`.
3. `2026-10-19T17-25-34-create-issue-dedupe-r26-f34-f35-hardening.md`:
   F39 corrections.

## Verification ledger (this session)

- Baseline on the working tree:
  `bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml`
  -> `26 passed, 0 failed` before and after every edit; `bash -n` clean.
- Positive controls (subagent A, isolated `/tmp` copies), each inserted
  before `bash .github/scripts/approve-held-runs.sh` in the post-handler
  step: `gh issue new`, `/usr/bin/gh issue new`,
  `gh -R Userfrom1995/RandomLabs issue new`,
  `gh issue --repo Userfrom1995/RandomLabs new`, `gh issue $"ne"w`, and
  `subprocess.run(["gh", "issue", "new", ...])` each ->
  `25 passed, 1 failed` with
  `issue-create-outside-handler:maintainer:22`.
- Negative controls: `gh issue list --search new --limit 10` and
  `gh issue comment 1 --body new` stay `26 passed, 0 failed` (no
  false positives from the bare word `new`).
- Detector integrity: restoring `issue_create_in` to the literal
  `("create",)` -> `f29-selftest-missed` on the `gh issue new` fixture;
  dropping the `"issue,new"` normalized match ->
  `f31-combined-selftest-missed` on the subprocess alias fixture. Counts
  `25 passed, 1 failed` in both cases.
- Handler untouched: `git diff HEAD -- .github/workflows/maintainer.yml`
  empty; `md5sum` `05e477fa6a503fbfeb44365d6d5950a9`; the run block md5
  `5c52d8239c31e16e97483d70f4470091` unchanged.
- Zero U+2014 em dashes in the changed files; `git diff --check` clean;
  `yaml.safe_load` clean on `maintainer.yml`, `opencode.yml`, and
  `auditor.yml`.
- Observation (pre-existing, not a new finding): the audit script ends
  with `exit 0` and surfaces R26 failures through the loud health-issue
  comment plus the red-looking summary line; this is the script's
  long-standing design (auditor.yml posts to the lab-health board), not a
  regression introduced here.

## Delegation ledger

- **general subagent A (adversarial R26 hunt):** reproduced 26/0 on a
  fresh copy; all six alias controls and both detector mutations red with
  the expected tokens; both negative controls green; surfaced that the
  script's terminal `exit 0` means an R26 failure is output-only, which is
  the pre-existing auditor design noted above. All mutation work under
  `/tmp`; workspace untouched.
- **general subagent B (independent verification):** confirmed `bash -n`,
  YAML loads, `git diff --check` clean (old trailing-whitespace complaint
  gone), the corrected round-16 reference, zero em dashes, alias coverage
  present in script plus both docs, and no stale range in the live files;
  flagged the summary-range drift (docs still said `F2/F4-F37`), fixed in
  this round to `F2/F4-F38`.
- **Primary verified itself:** every code edit, the baseline, the
  positive/negative controls, both detector mutations, the handler md5s,
  and the final clean-tree state; composed the refreshed PR body and this
  note.
- **Skills:** no skill fits (GitHub Actions lab infrastructure and audit
  engineering, not opencode workspace configuration).

## Known residual / gap boundary

- The documented residual is unchanged and now names the F38 spellings:
  direct REST creates, creates from inside a repo script, composite
  action, or reusable workflow, variable/command-substitution
  indirection, `xargs`, shell-function wrapper, shell `alias`,
  glob-expanded paths such as `/usr/bin/g[h]`, and creates assembled by
  runtime string construction (`${IFS}` word splitting, brace expansion
  such as `cr{e,}ate`, `"gh issue create".split()`) remain review-gated.
- Emptying any fixture list remains diff-review territory: fixtures are
  data, not structurally pinned, the same boundary that applies to every
  edit of the audit script itself.

Refs #668.

- the Lab Engineer
