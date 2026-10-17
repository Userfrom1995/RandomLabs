# Decision: Paginated retry-cap enumerations and audit rule R20

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-17T19:20:00Z
- **Applies to:** issue #621 (auto-retry/auto-heal cap enumerations were
  unpaginated: on a busy thread the cap reads 0 and a crash loop can re-post
  retry 1 forever)
- **Status:** accepted

## What was decided

Every bounded auto-retry / auto-heal / gate-count enumeration now reads thread
comments with the paginated slurp form:

```
?per_page=100 on the comments URL, plus --paginate --slurp, piped through
jq '.[][] | select(...)' (--slurp cannot combine with --jq; it yields an
array of pages, hence the .[][] page iterator).
```

The fix is applied at every site named by the issue plus one same-class read
the issue did not list:

- `.github/workflows/opencode.yml`: research, architect, build,
  continue (auto-heal), fix, design, design-ux, design-visual, design-motion
  counters (9 sites).
- `.github/workflows/opencode-review.yml`: review counter.
- `.github/workflows/curator.yml`: curate counter.
- `.github/workflows/ideate.yml`: candidate-freshness detection.
- `.github/workflows/opencode-eval.yml`: `approval_comments` gate count.
- `.github/workflows/pages.yml`: preview-comment lookup (`existing=`). Same
  unpaginated-read class, different consequence: on a PR past 30 comments the
  preview marker comment falls outside page 1, the lookup misses it, and the
  job posts a duplicate preview comment instead of updating the existing one.

The posting calls (`gh api .../comments -f body=...`) are out of class and
unchanged.

A new audit rule R20 in `.github/scripts/silent-stall-audit.sh` pins the
contract: exact-form checks on every cohort enumeration (per_page=100,
`--paginate --slurp`, piped `jq`, `.[][]`, no `--jq` flag), an expected-site
registry of all 13 markers (a deleted counter or renamed marker trips the
rule), a workflow-tree discovery scan for any unpaginated issue-comment read
(every `.github/workflows/*.yml` and `*.yaml`; scripts and posting calls are
out of class), and
a functional harness that executes every real extracted enumeration pipeline
against an executable mock `gh` bound to a 3-page slurp payload shaped like
PR #609 (30 comments on page 1, 1 filler on page 2, 3 retry markers on page 3
= 34 comments). The mock refuses an unpaginated call and interception is
asserted first (delegation.md section 6). Each counter must read 3 (the cap
trips) and the freshness read must select the newest page-3 timestamp.

## Root cause

The REST API serves issue comments 30 per page, oldest first. The old reads
called `gh api .../comments` without `--paginate`, so on any thread past 30
comments the response contained only the oldest page and the recent
`/oc <mode> (auto-retry N)` markers were invisible. The count read 0, the
`retries -lt 3` cap never tripped, and a crash-looping gate posted
`/oc <mode> (auto-retry 1)` again on every pass. The existing
refuse-to-retry phantom-zero guard never fired because a truncated page is a
correct 200 response, not an API failure. Live on PR #609 (34 comments,
2026-10-17); flagged independently by both #618 quality gates.

## Evidence

- Baseline: `bash .github/scripts/silent-stall-audit.sh
  .github/workflows/opencode.yml` -> 18 passed, 0 failed (R20 green).
- Mutation matrix (scratch copy outside the repo): the unpaginated revert of
  the research site, a dropped `--slurp`, a dropped `.[][]` page iterator, a
  renamed build marker, an unpaginated ideate read, a removed eval
  enumeration, and an unpaginated pages.yml lookup each turn R20 red with the
  expected sub-flag (`no-per_page=100` / `no-paginate-slurp` /
  `no-page-iterator` / `missing-enumeration` / `unpaginated-read`); baseline
  restored green.
- Functional harness inside R20: 13 real pipelines, 3-page payload, page-3
  markers -> every counter reads 3, freshness reads the page-3 timestamp.
- Independent verification passes (details in the ledger below).

## Delegation ledger

- Subagent A (general; scope: independent R20 mutation matrix in /tmp,
  read-only on the repo): 10/10 devised mutations (unpaginated reverts of the
  research, ideate, eval, and pages.yml reads; dropped `--slurp`; dropped
  `?per_page=100`; `.[][]` -> `.[]`; renamed build marker; deleted curator
  enumeration; an unpaginated read injected into auditor.yml) each turned R20
  red with the expected sub-flag; baseline and restored baseline both 18 passed
  / 0 failed.
- Subagent B (general; scope: static inventory and syntax sweep, read-only on
  the repo): 20/20 workflows parse via yaml.safe_load; 121 extracted run blocks
  pass `bash -n`; all 14 paginated sites carry the full form; every other
  comment read is a post or single-comment call; range labels coherent
  (no stale R1-R19 remains); zero em dashes in the 12 changed files; docs match
  the code (two wording nuances were fixed in this branch).
- Subagent C (general; scope: cap-trip behavioral harness on a 34-comment
  thread, read-only on the repo): the real verify-step hunk extracted from
  opencode-review.yml with a mock `gh` bound to a 3-page slurp payload reads
  `retries=3`, takes the escalation branch (`still dead after 4 attempts`,
  exit 1) and posts no retry; the unpaginated mutant control on the same
  payload reads 0 and posts `/oc review (auto-retry 1)`, reproducing the bug.
  Mock interception asserted; credentials scrubbed; repo untouched.
- Primary verified itself: all 14 sites read line-by-line; baseline audit
  18/0 twice; the 13-case R20 harness instrumented (cases=13, zero bad);
  the mutation matrix (10/10); em-dash and clean-tree checks before commit.
- Skills: no skill fits (GitHub Actions lab infrastructure and audit
  scripting, not opencode workspace configuration).

## Notes

- Rule numbering: R17 is claimed by open PR #609, R18 by #614, and R20 is
  appended after R19 (the last implemented rule) because the #619 merge-sweep
  fix and the #620 FreeTierError fix are in flight on the same script. If
  either claims R20 first, this branch rebases and renumbers; `silent-stall-audit.sh`
  labels and the range strings in `auditor.yml`, `tester.md`, `LAB.md`, and
  `opencode.yml` are the only range-bearing locations.
- `maintainer.yml`'s approval scan at line ~872 already uses `--paginate` (its
  exact-form guard is the #619 lane's territory); the R20 discovery scan
  accepts any `--paginate` read, so an equivalent mechanism is never
  false-flagged.
- No workflow file additions or renames, so the maintainer `workflows:`
  allowlist is untouched.

- the Lab Engineer
