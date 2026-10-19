# Decision: Lab and fix agent cap headroom (lab 150/180, fix 120/180, R25)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-19T09:16:48Z
- **Applies to:** issue #701 (near-complete lab and fix sessions killed at the
  wire, no decision file, nothing pushed)
- **Status:** accepted

## What was decided

1. **Lab cap headroom.** `lab.yml` runs its agent step at 150 minutes under a
   180-minute job (30 minutes of post-agent headroom). The old 90/120 shape
   killed lab round 18 on #654 (run 39208513680, 90m12s) and round 14 on
   #670 (run 39212805887, 90m13s) at the cap with the decision file
   unwritten.
2. **Fix cap headroom.** `opencode.yml`'s fix job runs its agent step at 120
   minutes under a 180-minute job (60 minutes of headroom). The old 60/120
   shape killed three consecutive fix sessions on #693 (runs 39203327749,
   39203442325, 39208619311) with the edits nearly complete and unpushed.
3. **The fail-closed contracts are unchanged.** The decision-file gate, the
   PAT-backed push, the fix push verification, and every auto-retry bound
   are byte-identical to `origin/main`; the cap deaths still conclude red
   and route through the existing Maintainer failure triage.
4. **Only these two arms changed.** Review 120/90, test 120/90, eval
   120/105, build 120/105, the 75/60 utility arms, and the per-OS arms
   (Linux 90/120, macOS/Windows 120/150) keep their measured caps.
5. **Regression guard R25.** The audit pins lab agent >= 150 under job >=
   180 and fix agent >= 120 under job >= 180, each with >= 20 minutes of
   headroom, extracted from the real job block and the canonical step block
   (never a whole-file substring match).

## Why not the alternatives

- **Raise the job cap only:** the agent cap still kills the session before
  the decision file is written; headroom is what lets the post-agent chain
  run.
- **Extend the agent cap with no job change:** a 150-minute step under a
  120-minute job would still die at the wire, just at the job boundary.
- **Add salvage to the lab/fix arms (issue #692 pattern):** unlike the per-OS
  arms there is no incremental report contract to salvage from; the lab/fix
  work product is the branch itself, and salvage without a decision file
  would publish partial state that the R11 gate exists to prevent. Raising
  the cap keeps the contract intact.
- **Raise every arm:** no evidence of the same class elsewhere; unnecessary
  runner-budget growth.

## Adversarial verification (independent subagent, then hardening)

An independent verifier subagent attacked the first cut in an isolated
scratch tree (repo untouched) with 20+ mutations. The cap edits and R1-R25
label sync held, but it found three genuine hardening gaps in the R25
implementation, all closed before handoff:

- **Decoy-step bypass (genuine escape):** R25 matched only the canonical
  step name and its cap, so renaming the real agent step (lowered cap) and
  planting a dummy canonical-named step with a compliant timeout passed
  25/25. R25 now requires the canonical step to be the job's unique
  `uses: ./.github/actions/opencode-run` invocation, matched as the whole
  YAML value (a switched action reference such as `opencode-run-v2` cannot
  count), and counts that invocation in the job.
- **Leading-zero literals:** `^[0-9]+$` accepted `0150`/`0120`, which YAML
  1.1 can read as octal while bash reads decimal, so the audited value could
  differ from the runner's. R25 now accepts only `^[1-9][0-9]{0,3}$`
  (canonical decimal, no leading zeros, no overflow-size integers).
- **Job-block terminator set:** `[a-z0-9-]` missed uppercase/underscore job
  ids, so a following decoy job could be swallowed into the block. The
  terminator now matches the full Actions job-id charset, and the job key
  must be unique in its file.

False-positive fragilities the verifier flagged (quoted values, anchors,
CRLF, re-indented job keys) all fail closed (audit red), which is the safe
direction and consistent with the R24 extraction style. A trailing YAML
comment after the digits is now tolerated.

## Evidence

- Full audit on the final tree: 25/25 PASS (R25 included) on
  `.github/workflows/opencode.yml`, and R25 PASS with the audit pointed at
  `.github/workflows/lab.yml` (the R1-R6 scoping fails there are the
  documented argument-scoping behavior, unrelated to #701).
- Original mutation battery: 12/12 (control green; lowered lab job/lab
  agent, headroom violations both arms, lowered fix job/fix agent,
  renamed/removed/duplicated agent steps, decoy + lowered cap all red).
- Hardened battery against the escape classes: 12/12 (decoy-step bypass both
  arms, leading-zero literals both arms, uppercase decoy job, duplicate job
  key, oversized integer, lowered cap with trailing comment, compliant cap
  with trailing comment, removed job cap, shadow runner invocation).
- `yaml.safe_load` clean on `lab.yml`, `opencode.yml`, `auditor.yml`;
  `bash -n` and shellcheck `-S error` clean on the audit script; no em
  dashes.
- `git diff` confirms the only non-comment workflow changes are the four
  timeout lines.

## Delegation ledger

- Independent verifier subagent (general; scope: read-only repo tree,
  adversarial mutation matrix and contract diff in `/tmp/opencode/r25-verify`):
  baseline 25/25 confirmed; 20+ mutations run; three hardening gaps reported
  (decoy-step bypass, leading-zero literals, job-id terminator set), all
  closed; fail-closed contract diff and unchanged-arm inventory verified.
- Primary context verified itself: the full audit, both mutation batteries,
  YAML/bash/shellcheck gates, and the four-line workflow diff.

## Review-round note

The R25 hardening (canonical step = unique runner invocation, strict decimal
literals, full job-id terminator, unique job key) is implemented inside the
existing rule; the rule description and the audit summary text document it
so a future reviewer can re-run the batteries above.

- the Lab Engineer
