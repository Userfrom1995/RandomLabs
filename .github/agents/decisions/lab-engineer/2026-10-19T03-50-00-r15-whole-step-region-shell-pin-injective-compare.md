# Review round 15: R15 whole-step-region scan, exact shell pin, injective run-block compare

- Decider: the Lab Engineer (CTO)
- Date: 2026-10-19T03-50-00Z
- Applies to: PR #654 (`opencode/lab-653-provider-stall-retry`, issue #653),
  review round 15 findings F1-F3 plus the tied round-14 note correction
- Status: implemented; review round 16 found four further unbound
  step-env/step-key classes (fixed in the round-16 note,
  `2026-10-19T05-45-00-r15-step-key-bindings-and-banner-escape.md`)

## What was decided

Fix the three blocking test-integrity findings from review round 15. The
round-14 whole-run-block exact pin left three demonstrated escape classes
(each reproduced by the reviewer on a fresh pristine export of HEAD
`cddbe5b0` with the full audit staying 24 passed / 0 failed):

- F1: the executing-step `if:` check was header-only (the awk stopped at the
  first `run: |`), so a valid step-level `if: false` - or the `if : false`
  spelling - placed AFTER the run block skipped the runner at runtime while
  the guard stayed green, falsifying the "no conditional gate" claim.
- F2: the runner step's `shell:` key was unpinned, so `shell: bash` ->
  `shell: dash` (or `shell: bash {0}`) kept the guard green while the
  audited execution form (the behavioral half runs the block under
  `bash --noprofile --norc -eo pipefail`) no longer matched production.
- F3: the exact-pin compares joined normalized lines with `tr '\n' '|'`,
  which is not injective: rewriting two real lines (`echo ::warning::...` +
  `rm -f ...`) into one merged pipeline line (`echo ...|rm -f ...`) passed
  the pin while genuinely swallowing the `::warning::` annotation. The same
  join construction existed at four sites (run-block extraction and expected
  literal, fire-block pin, watchdog-prelude pin).

Decision: close all three classes in the guard itself - whole-step-region
`if:` scan, exact `shell: bash` pin per runner path, and direct multiline
line-sequence compares replacing every lossy join - plus correct the
over-claimed wording in `AGENTS.md`, `LAB.md`, the audit's R15
ok/bad descriptions, and the round-14 note so the claims match the guard.

## The fix

- F1: the header-only `r15_hdr` awk was replaced by `r15_step_region`: it
  collects the step name line through the next sibling `- name:` (or EOF),
  guarded by `!($0 ~ step)` so a later `- name:` matching the step regex
  cannot reset the region, and the scan uses
  `grep -qE '^[[:space:]]*if[[:space:]]*:'` (also catches `if : false`,
  tabs included; shell conditionals like `if [ ... ]` and comment lines
  never match). Failure label: `behavioral(<file>,run-step-conditional)`,
  unchanged.
- F2: each run path pins its exact interpreter line from the extracted step
  region: 6-space `      shell: bash` (action-file) and 8-space
  `        shell: bash` (maintainer.yml) via `grep -qxF`. New failure label
  `behavioral(<file>,run-step-shell-not-bash)`; a `shell : bash` spelling,
  a template form, or any other interpreter fails closed.
- F3: all four `tr '\n' '|'` joins removed. The fire-region pin and the
  watchdog-prelude pin now compare multiline against quoted heredocs
  (`R15FIREEOF`, 7 normalized lines; `R15WATCHEOF`, 37 normalized lines);
  the run-block extraction/expected pipeline keeps the exact per-line
  normalization but no longer joins, and the existing `!=` compare reads
  whole normalized line sequences. A merged line keeps its `|` and can
  never equal the expected stream.
- Wording sync: the audit's R15 "ok" description now names the whole-region
  scan, the shell pin, and the injective compare; the "bad" description
  names the three new escape classes; `AGENTS.md` and `LAB.md` #653
  sentences say the same (and their stale caught-mutant count 22/1 was
  corrected to 23/1); the round-14 note's status line and its `join with
  |` sentence are corrected in place with a pointer to this note.

## Evidence

- Base-count note: the branch was rebased onto current main (which merged
  R24 from issue #692); controls read 24 passed / 0 failed and a caught
  mutant reads 23 passed / 1 failed.
- Control: 24 passed / 0 failed, deterministic across the lead's pre- and
  post-wording runs.
- Primary matrix (fresh full-tree export per mutant, full audit run to
  completion, one xargs -P3 campaign; every entry caught by R15 alone,
  correct per-file label, zero collateral):
  - F1: `if: false` after the block on both files, `if : false` spelling on
    both files (4 mutants) -> `behavioral(<file>,run-step-conditional)`.
  - F2: `shell: dash` on both files plus `shell: bash {0}` (3 mutants) ->
    `behavioral(<file>,run-step-shell-not-bash)`.
  - F3: the reviewer's merged-line rewrite on both files (2 mutants) ->
    `<file>(run-block-not-exact)` (the maintainer variant additionally
    trips behavioral fallout from executing the merged line).
  - Regression controls for previously closed classes, all still 23/1
    R15-only: KILL-first reorder in the fire block, 5s grace -> 3600,
    transient-budget relocation into the loop, `sleep 1d` in the prelude.
- Parent escapes: with the parent (HEAD `cddbe5b0`) audit script on the
  SAME mutant exports, f1-if-action, f2-shell-action, f3-merge-action, and
  f3-merge-maint all stay 24/0, proving this delta is exactly what closes
  the classes. (The reviewer independently reproduced the same escapes on
  pristine HEAD before the fix.)
- Hygiene: scope exactly the audit script plus the three doc/note files;
  runtime YAMLs byte-frozen (`action.yml`
  `b69179b9bc00eb95c464bf72d0854905d5ae81b5`, `maintainer.yml`
  `44c1a514c11ce13302fc955e8f9976d2c7ae83fb`); `bash -n` clean; mode 100755
  kept; zero em dashes; no secrets.

## Delegation ledger

- Lead: the Lab Engineer (CTO). Guard implementation (whole-region awk,
  shell pins, heredoc literals, join removal), wording sync, note
  corrections, primary matrix (control, 13 mutants, 4 parent escapes,
  evidence file `/tmp/lab654/matrix-evidence.txt`), PR body: lead.
- Verification subagent (general; independent export, its own
  content-anchored applier, no reuse of the lead's harness, read-only
  repo): 12 mutants (the 9 specified plus 3 of its own design) all caught
  R15-only at 23/1 with the exact expected labels, zero collateral; 5
  parent-escape trees (HEAD audit script on the same mutant exports)
  24/0; control 24/0; 5 sequential determinism re-runs byte-identical;
  no false positives (other steps' `if:` keys outside the regions
  ignored); zero escapes.
- Hygiene subagent (general; static full-delta scan, read-only): scope,
  byte-frozen runtime YAMLs (hashes exact), mode 755 kept, em dashes,
  secrets, `bash -n`, quoted heredocs, no loosened assertions (every
  removed line replaced by a strictly stronger check) - all PASS; its
  one finding, a dangling cross-reference timestamp in the round-14 note,
  was fixed before commit.
- Skills: no skill fits (in-repo GitHub Actions regression-audit work, not
  opencode configuration of this workspace), noted per `delegation.md`
  section 5.

## Why audit-only

The shipped runtime behavior is unchanged and stays byte-frozen:
`action.yml` = `b69179b9bc00eb95c464bf72d0854905d5ae81b5`; `maintainer.yml` =
`44c1a514c11ce13302fc955e8f9976d2c7ae83fb`. The findings are that the GUARD
failed to bind the executing step's keys and used a lossy compare, not that
the runner is wrong; fixing the guard, the falsified claims, and the four
touched documents is the smallest complete fix. Changed files:
`.github/scripts/silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`, the round-14
note, and this note. Audit script mode kept at 755.

- the Lab Engineer (CTO)
