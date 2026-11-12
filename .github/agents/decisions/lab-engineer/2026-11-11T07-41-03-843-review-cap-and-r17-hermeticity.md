# Decision: Review cap headroom (150/180) and hermetic R17 nonce fixtures

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-11T07:41:03Z
- **Applies to:** issue #843, PR #845 (review cap regression and R17 fixture hermeticity)
- **Status:** accepted

## What was decided

1. **Review cap headroom.** `opencode-review.yml` runs the reviewer agent
   step at 150 minutes under a 180-minute job. The old 90/120 shape killed
   review run 42749823343 on #837 after 11 audit invocations with no report
   and only a wrong-nonce decision file, so the publish step failed and the
   stale decision was discarded with no auto-retry.
2. **R25 covers the review arm.** The audit pins review agent >= 150 under
   job >= 180 with the same >= 20-minute headroom rule as lab, fix, and
   curator, and its mutation self-tests run on every arm.
3. **R25 binds the executing step from the YAML parse.** The whole file must
   parse with duplicate keys rejected; the canonical step must be unique
   file-wide and must be the job's unique
   `uses: ./.github/actions/opencode-run` step, so `name :`, flow-mapping,
   multiline plain-scalar, and explicit-key spellings cannot hide a real step
   behind a skipped canonical-named decoy. Caps must be plain decimal
   integers, a trivially disabled canonical step fails, and anchors/tags on a
   uses value are rejected. Mutation self-tests cover the decoy, multiline,
   flow, explicit-key, quoted-cap, disabled-step, and anchor shapes on every
   arm.
4. **R17 nonce fixtures are hermetic.** The CR and MSYS fixtures write only a
   sandboxed decision file and path-substitute the extracted shipped reads
   (the R22 pattern). The abort probe observes only a sandbox stand-in, a
   load-bearing mutant proves the probe detects a helper that writes the
   observed path, and a fail-closed read-only endpoint snapshot (cksum plus
   inode, size, and mtime; an unreadable live path fails the rule) detects
   any change to `/tmp/random-lab-decision.json` across the fixture window.
   A transient write-and-restore between the two samples remains a
   review-gated boundary, not a hermetic proof. The MSYS path-rejection
   control must fail for the path-argument reason, not any nonzero exit.
5. **This record supersedes the review line of item 4 in the 2026-10-19
   lab/fix cap-headroom decision.** That decision said review kept a 90/120
   agent/job shape for lack of evidence; issue #843 supplies the evidence and
   the review arm now matches the lab arm's 150/180 shape. The other arms in that item (test,
   eval, build, utility, per-OS) stand.

## Why not the alternatives

- **Reviewer report skeleton (issue #843 solution 3):** deferred. The review
  lane's report publisher is `always()`-gated and has no partial-report
  provenance banner, so a cap-death skeleton would publish as if it were the
  verdict. The cap raise plus the unchanged fail-closed nonce and report
  gates is the safer fix; the per-OS salvage pattern can be ported later with
  its banner contract.
- **Dispatch fresh reviews on #837 and #804 (issue #843 solution 4):**
  Maintainer work after merge. This PR keeps the nonce gate, report gate, and
  auto-retry semantics unchanged.
- **Text-only runner counting:** rejected as the sole guard after review F2
  and the issue #843 evaluation proved valid decoy, quoted, multiline,
  flow-mapping, and explicit-key workflow spellings could still lower the
  real cap while the audit stayed green.

## Evidence

- Review run 42749823343 died at the 90-minute cap under the 120-minute job;
  the #837 report never existed and the wrong-nonce decision file was
  discarded.
- Full audit on the PR head: 34 passed, 0 failed with `LAB_RUN_NONCE` and
  `LAB_OWNER_PAT_PUBLISHES` unset. With the review lane's exported
  `LAB_RUN_NONCE`, R17 and R19 fail on the ambient-nonce leak tracked by open
  issue #815; that leak is not in this PR's scope.
- The live `/tmp/random-lab-decision.json` is absent before and after the
  full audit, and the fixture nonce `a1b2c3d4` appears nowhere in the audit
  log.
- The issue #843 evaluation bypass (a skipped 150-minute canonical decoy plus
  a 90-minute real runner spelled `name :` with a multiline plain-scalar
  `uses`) is reproduced in a detached scratch worktree and fails as
  `review(agent-uses-count=2,want=1)`; flow-mapping, explicit-key,
  anchored-uses, quoted-cap, disabled-step, and non-canonical hidden-runner
  fixtures also red, and the pristine tree stays 34/0.

## Notes

Delegation ledger for this round is in the PR body. The review F1 through F4
findings are addressed on the same branch; F5 and the F6 minor nits are
addressed in the PR body, the docs, and the R17/R25 code. The issue #843
evaluation round's R25 multiline/flow/explicit-key bypass, R17 unreadable
snapshot fail-open, notation, and decision-record findings are addressed on
the same branch.

- the Lab Engineer
