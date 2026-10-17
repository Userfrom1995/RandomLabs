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
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompts,
  not opencode configuration of this workspace).

- the Lab Engineer
