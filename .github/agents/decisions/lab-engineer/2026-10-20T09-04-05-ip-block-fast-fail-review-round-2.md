# Decision: #669 egress-IP fast-fail, review round 2 fixes and evidence ledger

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-20T09:04:05Z
- **Applies to:** PR #710 / issue #669
- **Status:** accepted

## What was decided

Review round 1 on PR #710 found the design correct but required F1-F3 and
requested the two minors F4/F5 plus one observation. This round applies all
of them without changing the fast-fail semantics:

- F1 (blocking): this note records the delegation ledger and skills note.
- F2: the incident dates are corrected everywhere. All four incidents are
  2026-10-18: 39127259752, 39144091490, 39165526719, and 2026-10-20:
  39378762068 (verified with `gh run view`).
- F3: the R15 functional matrix now has one fixture per prefix
  (`ip-terminal-ai.txt`, `ip-terminal-api.txt`, `ip-terminal-error.txt`)
  instead of relying on the combined file, so each alternative in the
  detector regex is load-bearing. The R15 pass and failure labels now name
  issue #669.
- F4: the triple space in the action description is removed.
- F5: claims that the ip-block scenarios assert a recorded backoff are
  reworded to the truth they do assert: exactly one attempt on the first
  rung, which proves no retry budget was consumed.
- Observation: both runner comments now record the accepted exit-0
  false-positive residual (an exact column-0 provider line within the last
  40 log lines, for example a fenced quote, is fast-failed with no retry;
  the same residual as #591/#620/#653, costing one fresh-run re-dispatch).

The R26 pre-handler manifest was regenerated for the Maintainer runner
comment change, and the R15 run-block pins needed no regeneration because
they drop comment lines.

## Rationale

The reviewer's F3 was stronger than a wording fix: a combined fixture proves
only that some line matches, so dropping `Error: ` from the regex stayed
green. Per-prefix fixtures make the claim testable; the mutation check below
proves a dropped alternative now fails. F5 was reworded rather than extending
the harness with a zero-count sleep spec because the exactly-one-attempt
assertion already proves the budget was not consumed, and a zero-count
ordering spec would complicate the shared backoff harness for no added
coverage.

## Verification

- `bash .github/scripts/silent-stall-audit.sh` -> 28 passed, 0 failed, rc 0,
  0-byte stderr.
- Both extracted runner run-blocks pass
  `bash --noprofile --norc -eo pipefail -n`.
- Per-prefix mutation: dropping `|Error: ` from either extracted detector
  makes both Error:-prefixed forms return 1, while the shipped detectors
  return 0 for short and long forms.
- The R26 manifest regenerates byte-identically to the pinned heredoc.
- No em dashes in the touched files; `git diff --check` clean.

## Delegation ledger

- Verifier A (general; independent R15 audit verification): reproduced
  28/0/rc 0, both extracted run-blocks pass `bash -n` under the production
  shell form, the per-prefix `Error: ` mutation fails and the shipped
  detector matches, the R26 manifest is byte-identical, and no em dashes
  exist in the touched files.
- Verifier B (general; adversarial docs and claims audit): confirmed the
  four run IDs and dates with `gh run view`, zero stale 2026-10-18 claims,
  the three prefix fixtures genuinely bound, F4/F5 fixed, #669 in both R15
  labels, and the observation recorded in both runner comments.
- Primary verified itself: the live detector replay against both Error:
  forms, the mutation check (unmutated rc 0, mutated rc 1), the full audit
  run, the regenerated R26 manifest, and the diff.
- Skills: no skill fits because this is GitHub Actions CI and audit-shell
  work, not opencode configuration; none was loaded.

- the Lab Engineer
