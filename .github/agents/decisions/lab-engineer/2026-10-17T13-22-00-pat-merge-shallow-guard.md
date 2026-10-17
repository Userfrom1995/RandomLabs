# Decision: Shallow-workspace unshallow guard for the PAT merge sweep and audit rule R16

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-17T13:22:00Z
- **Applies to:** issue #602 (PAT merge sweep silently skips a legitimately linked PR when the run workspace is shallow)
- **Status:** accepted

## What was decided

The PAT-backed merge sweep in `maintainer.yml` restores full history before
its first merge-base-dependent command. The guard mirrors the integrity
guard's issue #283 fix: detect `--is-shallow-repository`, fetch with
`--unshallow` (falling back to a plain fetch and continuing), warn loudly if
the repository is still shallow after the attempt, and keep the strict orphan
check byte-identical (never fail open). A new audit rule R16
(`silent-stall-audit.sh`) regression-guards the guard: it asserts the
conditional detection appears twice (outer guard plus post-attempt re-check),
the unshallow command sits before the first three-dot diff / merge-base
command (structural ordering, not marker presence), both strict `-z` orphan
checks survive with zero fail-open `-n` forms, and the still-shallow warning
marker exists.

## Root cause: pinned (the issue's open question)

The trigger is the opencode CLI session bootstrap, verified against the
installed v1.19.3 binary embedded source, not the workflow checkout:

1. `p9` ("Checking out local branch...") runs
   `git fetch origin --depth=max(commits.totalCount,20) <headRefName>` then
   `git checkout <headRefName>`.
2. `s9` (PR-create precheck) runs `git fetch origin <base> --depth=1` when
   `rev-list --count <base>..<head>` fails.
3. A depth-limited fetch into a full clone records a NEW shallow boundary in
   `.git/shallow`; plain fetches never deepen it.

That explains the intermittency: a Maintainer run whose CLI session checks
out a PR branch re-shallows the full-depth checkout; an issue-only run does
not. The observed run 39030405503 state (one `.git/shallow` entry created
during session setup, `--is-shallow-repository` true, empty merge-base until
`--unshallow`) is reproduced exactly by a single `git fetch --depth=1` after
a full clone.

## Why the failure was silent

On the shallow workspace the workflow's three-dot diff
(`git diff --name-only "origin/main...origin/$head_ref"`) exits "no merge
base", so the PR is skipped as "does not touch workflows" and never reaches
the orphan echo; if the diff resolves differently, the orphan guard's empty
merge-base reads the PR as unrelated. Either way the merge is skipped with no
error and no red run, and workflow-file PRs can only land through this PAT
path. Unshallowing before the first dependent command removes both failure
modes without relaxing the linkage proof.

## Evidence

- Issue #602, run 39030405503 (live shallowing, one-entry `.git/shallow`,
  empty merge-base, real merge-base `9cbc8f5c87f4a2457657ac2c1adcba062b748226`
  after `--unshallow`).
- Reproduction and scenario harness (subagent B, all in `/tmp` clones):
  pre-fix state confirmed (depth-1 boundary `49e91814`, plain fetches do not
  deepen, three-dot diff "no merge base", empty merge-base); after running
  the extracted guard block verbatim, the shallow file is gone in both the
  1-boundary and 2-boundary cases, both branches merge-base non-empty
  (`9cbc8f5c...` for lab-591, `6ea4f956...` for lab-601), no still-shallow
  warning printed; on a healthy full clone the guard is a no-op.
- Mutation resistance (subagent A): baseline 16/16; M1 delete unshallow ->
  FAIL `no-unshallow-fetch`; M2 relocate guard after the diff -> FAIL
  `unshallow-not-before-merge-base`; M3 single-site fail-open `-n` -> FAIL
  `orphan-check-not-strict:strict=1` + `orphan-check-fail-open:failopen=1`;
  M4 delete the warning block -> FAIL; M5 outer condition `if true` -> FAIL
  `shallow-detection-count=1`. The M3/M5 gaps were found by the first
  mutation pass and closed by tightening R16, then re-verified red.
- Static sweep (subagent C): YAML parse OK for all three modified workflows;
  `bash -n` OK for the audit script and all 102 extracted `run:` blocks; no
  em dashes; R14/R15 audit blocks byte-identical to `main` (append-only R16);
  the two orphan-check lines identical to `main`; diff limited to the seven
  intended files.

## Delegation ledger

- Subagent 1 (general; scope: R16 mutation matrix, full /tmp copy, read-only
  on the real repo): baseline 16/16; five mutations exercised; two resistance
  gaps identified (single-site fail-open, outer `if true`); after the R16
  tightening, all five mutations fail red with the expected sub-flags; real
  repo hashes unchanged.
- Subagent 2 (general; scope: shallow scenario end-to-end, /tmp clones):
  reproduced the exact pre-fix silent-skip state, ran the guard block
  verbatim (bash -n OK, byte-identical extraction), proved full healing for
  one and two boundaries and a no-op on a healthy clone.
- Subagent 3 (general; scope: static consistency sweep): nine checks
  (status scope, YAML parse, shell syntax, audit matrix, stale label sweep,
  em-dash ban, coherence counts, executable bit, diff review) all PASS; no
  inconsistencies.
- Primary verified itself: read the final guard hunk line by line, ran the
  live audit twice (16 passed, 0 failed), the tightened R16 against `main`'s
  maintainer.yml (red on marker removal), `bash -n` on the audit script, and
  the clean-tree/em-dash checks before committing.
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompts,
  not opencode configuration of this workspace).

## Notes

- Residual: the guard heals the workspace at merge time; it does not stop the
  CLI from re-shallowing earlier in the run, and the CLI is third-party and
  not patchable from this repo. R16's exact-line counting intentionally fails
  if the detection or the strict checks are reworded without updating the
  rule, matching the R15 precedent (the reviewer may prefer a warning over a
  hard fail if the wording churns).
- The R16 block is append-only; R14/R15 blocks were not restructured, so any
  future branch that extends them rebases trivially.
- No workflow file additions or renames, so the maintainer `workflows:`
  allowlist is untouched.

- the Lab Engineer
