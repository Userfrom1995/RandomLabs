# R26 hardening round 20: F40 single-shell-string creates, constant-expression sibling, and the rebase onto main's actor write gate

Round-20: the Tester verdict on PR #670 (comment 6275581000) BLOCKED the
guard with F40: two ordinary single-shell-string spellings executed a real
`gh issue create` while R26 reported `26 passed, 0 failed`
(`"gh issue " "create --title x --body y"` left an empty token at the
subcommand position, and `"gh issue crea" "te ..."` split the keyword
across adjacent literals so the normalized form never matched). The
adversarial subagent hunt for this round then surfaced a constant-expression
sibling family (`* 1`, `+ " " * 1`, `"" * 1`, `* 1 + "new"`,
`* (2 - 1)`) before the commit; it was closed in-round. In parallel the
branch was 15 commits behind `origin/main`, which had adopted the actor
write gate (#696/#698) for this very handler step; the branch was rebased
cleanly (13 commits, zero conflicts) and R26 was re-pinned for the new
gate shape. The production dedupe handler itself is untouched by this
round apart from the rebase integration: whole-file
`md5 a017b55323a9050f8a75e49f50a445c4`, handler run block
`md5 30824dca3dafad6bb4bcb405de471796`, env keys `GH_TOKEN`/`BOT_TOKEN`,
`python3 -I -` isolation preserved.

## Findings addressed

- **F40 (blocking, tester):** `issue_create_in` read exactly one token at
  the subcommand position, so an empty boundary token from adjacent
  literals (`"gh issue " "create ..."`) made it look past the command; and
  the decoded normalized form matched `"issue,create"` only when the
  keyword was whole, so `"gh issue crea" "te ..."` (compile-time
  concatenation is invisible to the raw regex) was green. Fix:
  (a) the word scan skips empty words, so the subcommand comparison sees
  the first real word after `issue`; (b) `collapsed_create_form` joins
  adjacent and `+`-folded string constants after compile-time folding and
  scans for a collapsed `gh issue create` / `gh issue new` signature;
  `issue_create_detected` ORs the collapsed signature into the combined
  predicate. `_f40_red` carries 11 fixtures (the tester probes, the plain
  single-string forms, `"g" "h ..."`, the `+`-folded form, the `new`
  alias, and the numeric operator forms), and direct self-tests keep the
  empty-word skip (`f40-word-selftest-missed`) and the collapsed form
  (`f40-collapsed-selftest-missed`) load-bearing.
- **Constant-expression sibling (found by subagent A before commit, closed
  in-round):** the first collapse draft dropped only non-alphanumerics, so
  digits survived the fold: `"gh issue " * 1 + "create ..."` collapsed to
  `ghissue1create` and escaped, as did `"" * 1`, `+ " " * 1`, and
  `* (2 - 1)`. The collapse now drops every non-letter (`re.sub(r"[^a-z]",
  "", collapsed)`); digits can never appear in a real `gh issue create` or
  `gh issue new` subcommand, so no legitimate spelling is lost. Mutation C
  (reverting to the alnum collapse) reds the audit on the `* 1` fixture,
  proving the digit-drop is load-bearing.
- **Numbering:** the tester's finding is F40; the round-19 note keeps F39
  for its artifact nits, so every new label (fixtures, self-test tokens,
  PASS text, docs) uses F40.
- **Integration (rebase onto main):** `git rebase origin/main` replayed all
  13 commits with zero conflicts. Main's #696 introduced
  `Actor write gate (issue #428)` as the step before the handler and put
  the handler behind `always() && steps.actor_gate.outputs.run == 'true'`,
  so R26's structural pins were adapted: the handler `if:` pin requires the
  gate form exactly (a bare `always()`, an `if: false` decoy, or a
  gate-only form fails); `expected_pre_names` gains the gate step under the
  effective display name `Actor write gate (issue` (the ` #428)` tail is a
  YAML comment inside the plain scalar, the same effective-name class as
  the existing truncations); `allowed_decision_lines` follows main's
  reworded verify comment (`# A gate-allowed Maintainer ALWAYS writes
  .maintainer/decision.json`); the `R26PRE` pre-handler manifest (504
  lines) and the `R26FULL` handler block (296 lines) were regenerated with
  the embedded extractor (`python3 -I - <workflow> <manifest-out>
  <pathdirs-out> <repo-root>`, paste argv[2] and stdout respectively).

## What changed

1. `.github/scripts/silent-stall-audit.sh`: empty-word skip in
   `issue_create_in`; letter-only `collapsed_create_form`; collapsed
   signature in `issue_create_detected`; the 11-fixture `_f40_red` plus
   its two direct self-tests and combined-loop membership; R26 pins for
   main's actor gate (`if:` form, `expected_pre_names`, decision-line
   allowlist); regenerated `R26PRE`/`R26FULL`; script comment and R26 PASS
   text synced (F40 and the gate form).
2. `AGENTS.md:76` and the LAB.md R26 paragraph: the actor-gate `if:` form,
   the collapsed letter form, F40 coverage, and the moved findings range
   (`F4-F40`).
3. This note (round-20 evidence).

## Verification ledger (this session)

- Baseline on the rebased tree:
  `bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml`
  -> `26 passed, 0 failed` before and after every edit; `bash -n` clean.
- Probe/mutation harness (`/tmp/opencode/rl670-verify.sh`, 17 checks run
  against a worktree whose `maintainer.yml` is md5-identical to the working
  tree): baseline 26/0; P1-P4 (the tester's empty-boundary, split-keyword,
  plus-folded, and alias probes) each red with
  `issue-create-outside-handler:maintainer:22`; the green control stays
  green; X1/X4/X5/X10/X21 (`* 1`, `+ " " * 1`, `"" * 1`, `* 1 + "new"`,
  `* (2 - 1)`) red after the letter-only fix; E1/E2 (brace-expansion and
  three-fragment constructions) red; the R1 `str(...)` runtime-wrapper
  residual stays green (documented). Mutations: empty-word skip removed ->
  `f40-word-selftest-missed:empty-literal-boundary`; collapsed clauses
  removed -> `f31-combined-selftest-missed`; alnum collapse restored ->
  `f40-collapsed-selftest-missed` on the `* 1` fixture. Summary:
  `17 expected, 0 unexpected`.
- R26 adaptation drift checks (isolated worktree copies, each restored):
  bare `always()` on the handler -> `handler-step-not-always-gated` (R26
  and R12 both red); a comment added inside the handler run block ->
  `handler-block-changed`; an inserted pre-handler step ->
  `handler-pre-step-sequence-changed`; the git-identity line changed ->
  `pre-handler-block-changed`; the actor gate step's run line changed ->
  `pre-handler-block-changed`; the gate step renamed ->
  `handler-pre-step-sequence-changed`.
- Rebase: 13/13 commits replayed with zero conflicts; the rebased tree is
  the tree verified above.
- Handler identity: whole file `a017b55323a9050f8a75e49f50a445c4`; run
  block (dedent 10 spaces plus trailing newline)
  `30824dca3dafad6bb4bcb405de471796`; `if:` exactly
  `always() && steps.actor_gate.outputs.run == 'true'`.
- Hygiene: zero U+2014 em dashes in the changed files; `git diff --check`
  clean; `yaml.safe_load` clean on `maintainer.yml` and `opencode.yml`.

## Delegation ledger

- **general subagent A (adversarial R26 hunt):** reproduced the baseline
  and the handler identity; verified the positive controls (P1-P5) and the
  E-family are caught; hunted the new collapse layer and surfaced the
  numeric constant-expression sibling (`* 1` family) before the commit,
  which was closed in-round (X1/X4/X5/X10/X21). All work under `/tmp`;
  workspace untouched.
- **general subagent B (independent verification):** `bash -n`, YAML
  loads, diff scope exactly the three intended files, handler md5s,
  em-dash-free files, verification of the code-claim line numbers
  (empty-word skip, `collapsed_create_form`, `_f40_red`, self-test loops,
  combined loop), and F39-to-F40 naming consistency with no stale `F39`
  outside the round-19 note.
- **Primary verified itself:** every edit, the extractor regeneration, the
  rebase, the drift checks, the full harness, the final tree state, the
  refreshed PR body, and this note.
- **Skills:** no skill fits (GitHub Actions lab infrastructure and audit
  engineering, not opencode workspace configuration).

## Known residual / gap boundary

- Runtime construction stays review-gated: `str(...)`/`int(...)`/`format`
  /`%` wrappers, f-strings with placeholders, variables and
  command-substitution indirection, shell expansion (`${IFS}` word
  splitting, brace expansion such as `cr{e,}ate`), `xargs`, shell-function
  wrappers, shell `alias`, glob-expanded paths such as `/usr/bin/g[h]`,
  repo-script/composite-action/reusable-workflow creates, and direct REST
  creates (`gh api --method POST .../issues`, `curl .../issues`).
- Emptying any fixture list remains diff-review territory: fixtures are
  data, not structurally pinned, the same boundary that applies to every
  edit of the audit script itself.

Refs #668.

- the Lab Engineer
