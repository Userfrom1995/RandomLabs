# Decision: retire the postformer-cpu-train workflow

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T15:59:33Z
- **Applies to:** issue #665 (every `postformer-cpu-train` dispatch died on pre-archive paths after the PostFormer project was archived)
- **Status:** accepted

## What was decided

`.github/workflows/postformer-cpu-train.yml` is **retired (deleted)**, not
repointed at `archive/postformer/harness/`. The retirement moves in one change
with every claim that referenced the workflow:

1. The workflow file is removed. It was manual `workflow_dispatch` only and
   its entire purpose was the S-tiny gate matrix of issue #294 (closed
   2026-09-10 when PostFormer was archived).
2. `maintainer.yml` loses the `postformer-cpu-train` entry from the
   `workflow_run` `workflows:` failure-triage allowlist.
3. `maintainer.yml` loses the `"postformer-cpu-train"` entry from
   `SWEEP_ALLOWLIST`, so the Maintainer can no longer dispatch a sweep that is
   guaranteed to die before its first step.
4. `AGENTS.md` (Queued Execution) drops `postformer-cpu-train.yml` from the
   non-cancelling project CI cohort.
5. `LAB.md` drops it from the project CI list and records the retirement, so
   no doc claims infrastructure for a workflow that no longer exists.

## Why retirement, not repointing

Repointing is the dishonest call here:

- PostFormer is archived (`archive/README.md`, `archive/postformer/`); there
  is no live consumer of training runs. Issue #294's gate matrix results are
  settled.
- The migration was only partial: `archive/postformer/` contains
  `harness/` (`gate_matrix.json`, `train_chunk.py`) but no
  `requirements.txt`, and the workflow's checkpoint ledger
  (`postformer/ledger/checkpoints/...`) has no successor anywhere. A repoint
  would require reconstructing a runnable training environment and an output
  contract for an archived experiment.
- Keeping a dispatchable 340-minute CPU-torch matrix for an archived project
  is dead infrastructure that burns runner hours producing settled results.
- A retired workflow also removes the maintenance surface: the failure-triage
  allowlist and `SWEEP_ALLOWLIST` entries, which would otherwise keep routing
  the Maintainer toward a permanently broken dispatch.

## Evidence

- Baseline before the change: `bash .github/scripts/silent-stall-audit.sh
  .github/workflows/opencode.yml` -> 23 PASS / 0 FAIL.
- Post-change: same audit -> 23 PASS / 0 FAIL (R14's comment-triggered cohort
  is unaffected: `postformer-cpu-train.yml` had no `issue_comment` arm, and
  the project CI cohort is documentation, not an audited rule list).
- YAML validation: `maintainer.yml` parses cleanly after both allowlist edits.
- Leftover-reference sweep: no non-archive reference to
  `postformer-cpu-train` remains outside this decision note, the retired
  workflow's git history, and historical idea/progress documents that
  describe the pattern as it existed at the time.
- The pre-archive paths that made every dispatch fail
  (`postformer/harness/gate_matrix.json`,
  `python3 -m postformer.harness.train_chunk`, `postformer/requirements.txt`,
  `postformer/ledger/checkpoints/...`) are gone from the tree together with
  the file, so the defect cannot recur.

- the Lab Engineer
