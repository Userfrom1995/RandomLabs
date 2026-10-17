# Decision: MSYS argv-conversion guard for the Windows per-OS handoff and audit rule R18

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-17T17:00:00Z
- **Applies to:** issue #612 (the Windows per-OS arm posts its `/oc` handoff body as the mangled path `C:/Program Files/Git/oc maintainer`)
- **Status:** accepted

## What was decided

The three "Forward ... tester decision" steps in
`.github/workflows/opencode-peros-test.yml` no longer pass the handoff body
through argv at all. Each step now carries `MSYS_NO_PATHCONV: "1"` and posts
via `post_trigger()`, which pipes the body through stdin:

```bash
printf '%s' "$1" | gh issue comment "$target" --repo "${{ github.repository }}" --body-file - || true
```

Since no slash-leading argument ever reaches the native `gh` child, Git
Bash's MSYS2 path conversion has nothing to rewrite even without the opt-out,
and the opt-out is the second belt for any future argv addition. The
maintainer-requested budget raise lands with it: the `lab.yml` job cap is
120 minutes and its agent step 90 minutes (a 90-minute step under the old
75-minute job cap would still have died at the wire).

A new audit rule R18 (`silent-stall-audit.sh`) regression-guards the class:
it scans every Windows-runner bash-effective step in the whole workflow tree,
every composite action bash run step, and the three canonical forwarders, and
fails red on any slash-leading body value that can reach argv without a real
MSYS env opt-out (or on any forwarder that loses the opt-out, the stdin
transport, or the no-raw-argv contract).

## Root cause

Under Git Bash on `windows-latest`, MSYS2 rewrites any argv element that
looks like a POSIX absolute path before the native child process sees it.
`gh issue comment ... --body "/oc maintainer"` therefore delivered
`C:/Program Files/Git/oc maintainer` to the GitHub API (comment on #582 at
2026-10-17T15:08:55Z, run 39036859435). A strict-prefix `/oc` consumer (the
comment-triggered workflows, the maintainer handoff) could never parse that
body: the native Windows handoff was silently lost even though the step
exited green. The Linux and macOS arms were never affected.

## Evidence

- Pre-fix reproduction: a stub-`gh` harness extracted the pre-fix step block
  from `origin/main`, ran it byte-identical, and proved argv carried the raw
  slash body (`[--body] [/oc maintainer]`), the exact string MSYS rewrites
  (6/6 proof cases: three forwarders, issue-context fallback, fix-decision
  paths).
- Post-fix proof: the same harness against the fixed branch shows the body
  travels through stdin byte-exact (no trailing newline, exact `/oc
  maintainer`, `/oc fix: ...`, `/oc lab`), with zero body bytes in argv, for
  all forwarder paths (6/6).
- Adversarial mutation matrix (54 cases, `/tmp` copies, credentials
  scrubbed): baseline fixed tree PASS; every unsafe mutation FAILs red with
  the expected sub-flag (removed opt-out, argv `--body "$1"`, renamed or
  deleted forwarder, dead-text spoofs, `--body=`, `-b`, list/alias/space-colon
  runs-on, workflow-level `defaults.run.shell`, OR-composed `if`, comment and
  parameter-expansion hiding, `$( )` and backtick substitution, quoted
  command words, `${IFS}` splitting, bogus `MSYS2_ARG_CONV_EXCL: "/octal"`,
  the defaced-forwarder `-b "$1"` + dead stdin helper, composite actions);
  every safe form PASSes (pwsh steps, real opt-outs, `--body-file -`
  transports, Windows-excluded steps).
- Independent verification: three rounds with a separate adversarial agent
  (fresh `/tmp` copies, stub interception proven, `env -u` scrubbing,
  worktree byte-identical). Round 1 defeated a first text-only draft with a
  winning defacement counterexample; round 2 found 10 fresh evasions plus 1
  transport false positive on the first structural version; round 3 found
  the backtick-substitution gap and one composite-`if` false positive. All
  were fixed and re-verified; final bounded verdict PASS with the residual
  limitation stated honestly (bash is undecidable; deliberate non-literal
  obfuscation such as `${IFS:0:1}`, `eval`, or variable-built argv is out of
  scope for a static tripwire, with the canonical forwarder contract and
  human review as the semantic gate).

## Why the rule is structural, not a text scan

A raw-text grep was defeated by dead comment/echo/heredoc text inside a run
block (round-1 counterexample: a defaced forwarder with spoofed
`--body-file -` and `MSYS_NO_PATHCONV` strings as dead prose still passed).
R18 therefore parses the workflow YAML with python3 + PyYAML: job discovery
across static/list/matrix `runs-on`, effective shell resolution (step > job
defaults > workflow defaults > platform default), step/job env maps, logical
lines with backslash continuations, shell-aware comment stripping, and a
small quote state machine (single/double quotes, `$( )`, backticks) so only
real top-level token positions count.

## Notes

- Only `opencode-peros-test.yml` runs `gh --body` on a Windows runner;
  `pet-release.yml`'s Windows job and `tor-cli.yml`'s Windows matrix have no
  `gh` invocations. The remaining `/oc` body sites all run on non-Windows
  runners and are untouched.
- R17 is claimed by the in-flight #608 findings-report work; per the
  maintainer's triage this guard is R18, and the shared files
  (`silent-stall-audit.sh`, `opencode-peros-test.yml`, `tester.md`,
  `opencode.yml`, `LAB.md`, `AGENTS.md`) will need a rebase by whichever PR
  merges second.
- No workflow file additions or renames, so the maintainer `workflows:`
  allowlist is untouched.
- Native Windows confirmation of the fixed forwarder is expected from the
  per-OS Windows arm run on this PR itself (the arm's handoff comment must be
  byte-exact `/oc maintainer`).

## Round 2: the Tester's guard findings and the hardening that followed

The Tester's read-only infrastructure round (`/oc test`, verdict
`{"action":"lab"}`) confirmed the handoff fix end to end and found one
blocking false negative in R18's opt-out validation plus non-blocking
conservatism:

- Blocking: `MSYS2_ARG_CONV_EXCL` was split on `[,;]` with per-token
  trimming, but the runtime splits on `;` only and never trims
  (spawn.cc:292-299) and prefix-matches whole argv words (path.cc:4208-4212),
  so `"foo,/oc"` and `" /oc"` were green-lit while MSYS would still mangle
  the body.
- Non-blocking: `MSYS_NO_PATHCONV` values `"0"`, `"false"`, `"yes"` and
  workflow-level `env:` were red although runtime-safe.

Round-2 fixes (commit 50ec847e):

- `presence_optout` / `arg_conv_excl_optout` mirror the runtime exactly:
  presence semantics for `MSYS_NO_PATHCONV` (any non-empty value, any level),
  semicolon-only split with no trimming for `MSYS2_ARG_CONV_EXCL`, and the
  env override chain (step > job > workflow) so an ineffective step value is
  never rescued by a broader effective one. Workflow-level env is honored.
  An empty `MSYS_NO_PATHCONV` stays red (documented conservative reading).
- An exact `"/oc"` token counts only when the detected body travels in its
  own argv word and starts with `/oc`.
- Attached transports (`--body=/oc`, `-b/oc`, `-b"/oc`) are detected and can
  never be covered by a `/oc` token, and a `/oc` token no longer covers a
  different slash body (`/review ...`).
- The canonical forwarder contract is now job-bound and duplicate-proof: a
  decoy step named "Forward Windows tester decision" outside `test-windows`
  (or a second same-named step anywhere) is red, and the raw-body detection
  catches the attached `-b"$1"` defacement even behind a dead stdin helper.
- `sh` and `sh -e {0}` shells on Windows are scanned as MSYS-effective, and
  every slash-body hit in a step is evaluated (a passing first hit no longer
  masks an unguarded sibling); any top-level `gh` on a line enables the scan
  so a quoted `gh` cannot suppress a later real invocation.

Additional adversarial rounds (independent subagent, fresh `/tmp` copies,
carried context across rounds) re-ran every previously found counterexample
after each change and hunted new ones. The rounds found these additional
literal false negatives, all closed in this round: attached-flag bodies under
a `/oc` token (a single-token `--body=/oc ...` is not prefix-excluded by MSYS
but was green-lit), the attached `-b/oc` detection gap, the duplicate/relocated
forwarder decoy, and first-hit masking across multiple hits in one step. Final
verdicts: all previously reported literal gaps closed; remaining
disagreements are the documented conservatism (inline per-command
assignments, `export`, `unset` / `$GITHUB_ENV` mutation, variable-built argv,
`bash -c '...'` payloads, non-literal obfuscation) plus fail-closed
over-approximations (an unrelated same-line `--body` token; bodies containing
`:` that the runtime would copy as-is; `/oc ` and `/` token prefixes that are
runtime-effective but rejected in favor of the exact `*` / `/oc` tokens).

Evidence: a 58-case mutation matrix on isolated copies under `/tmp` with
credential scrubbing, covering every Tester counterexample (now red), every
adversarial disagreement, all supported opt-out forms (green), the structural
discovery dimensions (list/matrix/alias runners, workflow and job shell
defaults, OR-composed `if`, composite actions, `sh` shells), and the
canonical forwarder contract mutations (duplicate, relocated, attached
defacement, transport removal); full audit 17 passed / 0 failed on the
rebased tree; `bash -n` clean; zero em dashes.

## Round 3: rebase onto main's R17/R19 and the reviewer's spelling-gap closure

The PR went CONFLICTING when R17 (#608) and R19 (#616) landed on main while
this PR was under review. Rebased onto `8ccab113` per the maintainer's
lean-rebase directive: main's R17 (per-OS findings report) and R19 (review
publication evidence) are preserved, R18 sits in its numbered position between
them, and every range string and label reads R1-R19 (script header, PASS/FAIL
lines, auditor step label, AGENTS.md, LAB.md, tester.md, opencode.yml rule
comment). Full audit on the rebased tree: 19 passed / 0 failed.

The round-3 review (`/oc lab fix review findings`, comment 6239689248) marked
the conflict blocking (resolved by the rebase) and recorded one non-blocking
R18 false negative: `--body $'/oc ...'`, `--body $"/oc ..."`,
`--body ${x:-/oc ...}`, and the attached `--body=$'/oc ...'` spelling all
expand under bash to a slash-leading body but passed the lexical tripwire.
Closed in this round by extending `BODY_VALUE_PREFIX` in the four slash-body
regexes to accept an optional ANSI-C/locale `$` quote and a default-value
parameter expansion, including under an enclosing quote. Probe on an isolated
worktree (probe-msys.yml): the four spellings now red as
`unguarded-slash-body-argv`; the `--body "$VAR"` control stays green; a
guarded `MSYS_NO_PATHCONV: "1"` ANSI-C form stays green; the full audit is
19 passed / 0 failed before and after the fix.

## Delegation ledger

- Subagent 1 (general; adversarial verification, three rounds, read-only on
  the real repo, all artifacts in `/tmp`): found the round-1 winning
  defacement against the text-only draft; found 10 evasions + 1 false
  positive against the first structural version (closing opt-out token
  semantics, workflow defaults, `||` conditions, comment word-start rules,
  command substitution, quoted command words, `${IFS}`, composite actions,
  transport redirection); found the round-3 backtick gap and the
  composite-`if` false positive; final bounded verdict PASS, zero side
  effects, worktree byte-identical.
- Primary verified itself: ran `bash -n`, the full audit (17 passed / 0
  failed) after every R18 change, the 54-case mutation matrix, the
  6-case forwarder proof under `env -u` scrubbing with stub-interception
  assertion, the em-dash sweep over every changed file, and the final
  `git status`/diff review before committing.
- Subagent 2 (general; R18 round-2/3 verification with carried context, three
  adversarial rounds on fresh `/tmp` copies): confirmed the Tester's comma and
  padded-token counterexamples fixed; found the attached-transport `/oc` token
  false negative, the attached `-b/oc` detection gap, the duplicate/relocated
  forwarder decoy, and the first-hit masking hole; re-ran every prior
  counterexample after each fix and confirmed each closed, with the only new
  behavior a documented fail-closed over-approximation (an unrelated
  same-line `--body` token).
- Subagent 3 (general; structural regression suite, fresh `/tmp` copies):
  re-verified static/list/matrix/alias runner discovery, workflow and job
  shell defaults, OR-composed `if` handling, composite scanning, the
  three-forwarder contract, whole-tree `gh` body absence, YAML and bash
  syntax, and the changed-file inventory (audit script byte-identical to the
  working tree).
- Primary verified itself in round 2: the full 58-case matrix after every
  change, the full audit and `bash -n` after every edit, the audit against
  the rebased tree (17 passed / 0 failed), and the diff/em-dash review before
  committing. `sh -e {0}` handling and the quoted-`gh` suppression fix were
  driven by the subagent findings and re-verified in the primary matrix.
- Round 3: a single primary probe run on an isolated worktree
  (probe-msys.yml positive/negative matrix, then removed) plus an in-process
  regex matrix; the rebase reconciliation was verified with a merge-base
  assertion, whole-tree range sweeps, and the full audit. No subagents were
  warranted for this bounded fix.
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompts,
  not opencode configuration of this workspace).

- the Lab Engineer
