# Decision: #800 R32 per-OS forwarder pin refresh, review-round evidence

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-01T07:18:31Z
- **Applies to:** PR #801 / issue #800
- **Status:** accepted

## What was decided

Review round 1 on PR #801 verified the three R32 pin updates and both new
mutation self-tests as correct and load-bearing, and raised exactly one
blocking finding (F1): the PR artifact carried no delegation ledger and no
skills note. This note is the committed run artifact that records the
evidence, as the reviewer's required correction allows ("add the missing
evidence to the PR description (or a committed decision note or a PR
comment)"). No production code, workflow, or audit code changes in this
round; the shipped pin refresh stands as committed in `22b04772`.

## Why the pin refresh was needed

R32 was added with the pre-#791 forwarder shape, and PR #794 shipped the
#791 stdin/CR form 41 minutes later. The stale tuples therefore false-failed
on every audit run (`control:peros-test-linux/macos/windows(body-not-exact)`)
while production behavior was correct. The refresh repins the exact shipped
normalized bodies and adds two mutants so the #791 contract cannot silently
regress.

## Verification (this round, independently reproduced)

- Pin parity: each of the three shipped forwarder `run` bodies normalizes to
  exactly 37 lines and matches its `PEROS_*_FORWARD_BODY` tuple line for
  line. Workflow ranges: Linux 456-506, macOS 999-1048, Windows 1536-1588;
  tuples at audit lines 21987-22025, 22027-22065, 22067-22105. The
  normalization dropped only comment lines (13/12/15) and no blank lines,
  and no semantic shell content was masked.
- Full audit: `env -u LAB_RUN_NONCE timeout 300 bash
  .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml` ->
  `32 passed, 0 failed`, rc 0. `bash -n .github/scripts/silent-stall-audit.sh`
  is clean.
- Mutants: each `old` string occurs exactly three times in
  `.github/workflows/opencode-peros-test.yml`, only in the three per-OS
  forwarders. Applying either mutation to a scratch full-tree copy makes R32
  fail with `control:peros-test-linux/macos/windows(body-not-exact)` on all
  three arms (R17 also fails independently for both mutations, which is
  defense in depth, not a substitute for the body pin). The real workflow is
  untouched (hash unchanged).
- Stale-shape hunt: all six per-OS decision reads (three verify, three
  forward) feed `jq` on stdin and strip CR; no path-argument decision read
  remains in the per-OS lane. Path-argument reads in other lanes are
  Ubuntu-only and outside issue #800's scope.
- Observation, not changed here: R32 whole-body pins only the three forward
  steps; the three verify steps ride on R17's canonical-line pins. A verify
  step could gain a decoy path-argument read beside the canonical line
  without tripping R17/R32. That is a pre-existing coverage boundary, wider
  than this evidence fix, and is recorded here as a candidate follow-up
  rather than expanded in this round.

## Delegation ledger

- `general` (pin parity verification): parsed the shipped workflow with a
  duplicate-key-rejecting YAML loader, applied the audit's own
  `norm_pinned_lines`, and returned exact 37-line parity for all three arms
  with no semantic content masked by normalization.
- `general` (audit and mutant verification): reproduced `32 passed, 0
  failed`, confirmed `bash -n` clean, confirmed each mutant's `old` occurs
  exactly three times in the forwarders only, and proved both mutants fail
  R32 with `body-not-exact` on all three arms in scratch full-tree copies.
- `general` (stale-shape hunt): enumerated all six per-OS decision reads,
  confirmed every one uses stdin plus CR normalization, and found no
  remaining path-argument decision read in the per-OS lane.
- Primary: read the lab prompt, the reviewer's full report, issue #800, and
  the full diff; ran the full audit (32/0, rc 0) and `bash -n` itself;
  confirmed the working tree is clean and no em dashes are present.
- Skills: no available skill fits an audit-pin evidence refresh (this is
  GitHub Actions audit-shell work, not opencode configuration); none loaded.

- the Lab Engineer
