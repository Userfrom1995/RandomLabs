# Decision: Per-OS cap headroom and partial-report salvage (macOS/Windows 120/150, incremental reports, R24)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-19T01:04:00Z
- **Applies to:** issue #692 (macOS per-OS arm died at the 90-minute agent cap with zero artifacts)
- **Status:** accepted

## What was decided

1. **Cap headroom.** The macOS and Windows per-OS arms run their agent step
   at 120 minutes under 150-minute jobs (Linux keeps its measured 90/120; it
   completes in about 33 minutes). The failing run 39170578536 died at the
   old 90-minute agent cap with 5 of 9 planned passes still open; the
   post-agent contract chain (verify, salvage, findings post, decision
   forward) sat at the wire of the 120-minute job and never ran.
2. **The fail-closed gate is unchanged.** The verify step, its artifact
   requirements, and its `exit 1` are byte-identical to `origin/main`. A
   crashed or capped arm still concludes red; the Maintainer's `workflow_run`
   failure triage still fires (`opencode-peros-test` is on the allowlist).
3. **Partial-report salvage.** A new post-verify `salvage` step in each of
   the macOS and Windows arms, gated exactly on
   `always() && actor_gate == true && verify-test.outcome == 'failure'`,
   publishes the incrementally written `/tmp/random-lab-findings.md` behind a
   workflow-composed provenance banner through the strict shared poster
   (`.github/scripts/post-peros-findings.sh`, github.token only, bot
   authorship / sign-off / exact-body re-fetch). A decision file or a
   missing/empty report salvages nothing; a report failing the strict checks
   is not published; every salvage outcome is best-effort and the run stays
   red. A banner-headed comment is partial evidence, never a verdict.
4. **Incremental report contract.** The macOS/Windows sessions (prompt files
   and inline workflow prompts) write a signed skeleton before the first
   heavy pass and keep the sign-off as the last non-empty line at all times;
   the decision file remains the final act.
5. **Regression guard R24.** The audit pins the cap shape (>= 20 minutes of
   headroom under the job cap; macOS/Windows agent >= 120) and the salvage
   wiring: the step name must be unique across the whole workflow file, no
   step-level YAML overrides (`continue-on-error`, `shell`,
   `working-directory`), the gate and env by exact line, and the run body's
   command lines verbatim (comments and blanks free; any extra command, early
   exit, duplicate publication, or raw `gh` call fails the match).

## Why not the alternatives

- **Raise the job cap only:** the agent cap would still kill the session with
  no artifacts; headroom is what lets the contract chain run.
- **Salvage from the run log:** the report is written to
  `/tmp/random-lab-findings.md` and the wrapper's final message is not a
  publication channel (issue #608); the file contract stays the single source
  of truth.
- **Salvage with the owner PAT:** the strict poster runs with
  `github.token` exactly like the healthy path; the owner PAT stays out of
  agent-adjacent publishing.
- **Write the decision file early:** that would let a capped run conclude
  green or forward a premature decision; the decision file stays the final
  act and salvage never touches it.

## Review-round hardening (adversarial verification)

An independent adversarial pass plus a functional sandbox of both extracted
step bodies (mock `gh`, scrubbed env, 10 scenarios) found the core contract
sound and flagged seven minor gaps, all addressed before handoff:

- salvage bodies were only line-pinned at guard/banner lines, so an early
  `exit 0`, a deleted guard exit, an `exit 0` -> `exit 1` flip, a duplicate
  poster call, or a raw `gh` call could pass the audit (not fail-open, but a
  green audit over a disabled salvage). R24 now pins the body command lines
  verbatim against the expected sequence.
- the step-name uniqueness check was per-arm only; a cross-job decoy under
  the same name passed. It is now file-wide.
- banner middle lines (the "failed closed" / "Sections may be incomplete"
  provenance claims) were unpinned. The exact-body match now covers them.
- `continue-on-error: true` on the salvage step was unguarded. It is now
  banned along with `shell:` and `working-directory:` overrides.
- the decision-file guard's log line claimed the normal findings path owned
  the run, but verify can only have failed over a missing or empty report
  here; the line and comment now say exactly that.
- tester prompt wording said salvage fires "at the 120-minute cap" although
  it fires on any decision-fileless death with a partial report; reworded.
- the contract docs did not describe the salvaged-partial comment class;
  AGENTS.md, LAB.md, quality-gates.md, and tester.md now do.

## Evidence

- Full audit: 24/24 PASS (R24 included) on `.github/workflows/opencode.yml`.
- Mutation battery (scratch copy under `/tmp/opencode/r24-mut2`): 18/18 cases
  behaved as required (17 weakening mutations each caught by R24, control
  green), including early exit, guard-exit deletion, gate widening, PAT swap,
  move-before-verify, banner drops and middle rewording, duplicate poster,
  raw `gh` comment, cross-job decoy, `continue-on-error`, and both cap-shape
  violations.
- Functional sandbox of both extracted salvage bodies against a mock `gh`:
  10/10 scenarios (decision-present skip, empty skip, signed partial posted
  with banner and verified, unsigned refused, wrong-author refused).
- `yaml.safe_load` on the workflow, `bash -n` on all run blocks, shellcheck
  `-S error` clean, no em dashes.

- the Lab Engineer
