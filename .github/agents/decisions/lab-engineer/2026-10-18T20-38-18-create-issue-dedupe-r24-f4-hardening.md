# Decision: Create-issue dedupe round-4 R24 hardening (review findings F4-F7 and the hermeticity observation)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T20:38:18Z
- **Applies to:** PR #670 / issue #668 (create-issue dedupe; review round-3 findings F4/F5/F6/F7)
- **Status:** accepted; handed to the Reviewer

## What was decided

The Reviewer's round-3 report on PR #670 filed four findings against audit
rule R24 (three blocking, one minor); all are test-integrity defects: the
shipped handler itself was independently verified correct and is untouched
(md5 09f5118e, byte-identical to the revision the Tester validated). This
round hardens R24 in `.github/scripts/silent-stall-audit.sh` only, plus the
documentation sync.

1. **F4 (blocking: run-state/input-shape gates between the lookup and the
   skip guard passed 24/0 while disabling the dedupe for ordinary production
   inputs).** Two complementary fixes:
   - Five-consecutive-code-line adjacency pin (`r24_ln_trim`, exact-trim
     equality) over the loader chain `if _open_issue_titles is None:` ->
     `loaded = _load_open_issue_titles()` ->
     `_open_issue_titles = loaded if loaded is not None else {}` ->
     `existing = _open_issue_titles.get(ntitle) if ntitle else None` ->
     `if existing:`, so no gate can be interposed at that site regardless of
     the dimension it gates on. A `#`-prefixed comment decoy cannot satisfy
     the trim matcher; a genuine decoy chain would add a third
     assignment-shaped line and trip the structural pin.
   - Fixture dimensions varied so the inserted-gate family is caught
     behaviorally even when a decoy satisfies the static pin: realistic
     multi-line >200-char bodies in EVERY scenario decision (body-length
     gates), a new three-decision scenario with the matching create LAST
     after two successful creates asserting exactly 2 creates and 3
     dispatches (`len(decisions)` and `len(_created_issue_numbers)` gates), a
     new matching decision carrying `"target": "main"` (target/extra-key
     gates), and a new mixed scenario with a failed sweep first and a
     successfully posted comment second before the matching create
     (`sweep_failed` and `posted` gates; the failed sweep also drives the
     handler's loud SystemExit(1), asserted as rc 1).
2. **F5 (blocking: subscript write/delete sabotage of the run-local index).**
   The structural block now rejects `_open_issue_titles[...] = ...` and
   `del _open_issue_titles[...]` (they evaded the bare-assignment and
   attribute-use pins), and the in-run duplicate scenario was extended from
   two to three identical decisions so the sabotage is caught behaviorally on
   the third decision (one create, one dispatch, two in-run skip prints).
3. **F6 (blocking: mock fidelity, missing trailing newline).** The mock `gh`
   now emits the trailing newline every real `gh ... --json` list output
   carries on every path (argv-mismatch, fixture serve, empty), so a loader
   gate on `r.stdout.endswith("\n")` fails the skip assertions instead of
   passing 24/0 while disabling the dedupe in production.
4. **F7 (minor: fixture extractor tested only the first definition).** The
   block now requires EXACTLY ONE `def _norm_issue_title`
   (`norm-def-count`), so a shadowing second definition cannot leave the
   fixture matrix testing dead code.
5. **Hermeticity observation (non-blocking, fixed anyway).** The sandbox now
   builds the handler environment from scratch with `env -i` (only the
   explicit production-shaped set: PATH/HOME/TMPDIR/GITHUB_*/GH_TOKEN/
   BOT_TOKEN), so NO ambient runner variable reaches the handler and detection
   of env-keyed gates is independent of the ambient CI environment, not just
   of the six previously unset credentials. The claim wording was tightened
   accordingly.
6. **Documentation sync:** the R24 property text, the PASS description,
   `AGENTS.md`, and `LAB.md` now describe the adjacency pin, the
   subscript/delete rejection, the single-definition requirement, the
   newline-faithful mock, the new scenarios, and the hermetic env; the
   review-findings reference moves to F2/F4-F7, B1-B3.

## Evidence

- Pristine control: `bash .github/scripts/silent-stall-audit.sh
  .github/workflows/opencode.yml` -> `24 passed, 0 failed`, deterministic on
  repeat (~14s); `bash -n` clean; embedded handler unchanged (md5 09f5118e
  vs reviewed head 4669d5bf, checked by the primary and re-checked
  independently by subagent B).
- Primary negative-mutation matrix (`/tmp/opencode/r24-mut.py`, log
  `/tmp/opencode/r24-matrix-round4.log`): 21 mutations, 21 CAUGHT, 0
  escaped. Every mutation is caught by its intended mechanism(s):
  - m01-m06 (the six reviewer gates: body/decisions/target/created-count/
    posted/sweep_failed before `if existing:`) -> adjacency pin plus the
    matching new/extended scenario (s2/s3/s15/s16/s17) fires;
  - m07/m08 (`_open_issue_titles[ntitle] = None`, `del ...`) ->
    `index-subscript-or-delete` plus s3 behavior;
  - m09 (loader gate on `r.stdout.endswith("\n")`) -> newline-faithful mock,
    s2/s6 functional failures;
  - m10 (shadowing `_norm_issue_title`) -> `norm-def-count:2` plus functional;
  - m11-m15 (the same gates INSIDE `_load_open_issue_titles`) -> s15/s16/s17
    functional failures;
  - m16 (comment-decoy chain + posted gate) -> `loader-chain-not-adjacent`
    plus s17; m17 (triple-quoted-string decoy chain + posted gate) ->
    `index-assignments:3` plus s17;
  - m18-m21 (round-1/2 escapes: `loaded = {}`, `if False:`, removed skip
    `continue`, inserted `_open_issue_titles = {}`) -> their original pins
    plus functional failures, still caught.
- Independent adversarial verification (subagent A, own tree copies under
  /tmp/opencode/subA, 15 prescribed mutations from the reviewer's F4-F7
  reproductions plus decoy variants): 15/15 FAIL R24 with the expected
  tokens, 0 escaped, control 24/0. It authored none of the guard code.
- Independent behavioral verification (subagent B, own extraction and own
  mock `gh`): production handler hashes identical; pristine traces match the
  documented semantics exactly (s3: 1 create / 1 dispatch / 2 in-run prints;
  s15: 2 creates (#900/#901) / 3 dispatches (900, 901, 715); s16: 0 creates /
  dispatch 716; s17: 0 creates / dispatch 717 / 1 api comment / rc 1); and
  all five discriminating mutations (created-count gate vs s15, target gate
  vs s16, posted gate vs s17, sweep_failed gate vs s17, subscript write vs
  s3) flip an exact-count/target signal, proving each scenario genuinely
  pins its invariant.
- Docs/reference sweep (subagent C, read-only, plus primary): 8/8 checks
  PASS - zero U+2014 em dashes across the four changed files, every claimed
  mechanism present in the audit script at a pinned line, the five-line
  adjacency chain matches maintainer.yml 811-815 exactly (trimmed), the
  matrix log reads 21 CAUGHT / 0 ESCAPED with control 24/0, the handler md5
  claim verified against both the worktree and the reviewed head,
  `yaml.safe_load` and `bash -n` clean, and the change set confined to the
  four declared files with the local tip equal to the upstream tip.

## Honest residuals (documented, review-gated)

- Deliberate fingerprinting of unavoidable sandbox identity (fixture token
  strings, sandbox paths, per-title charset gates); the fixed `GITHUB_RUN_ID`
  and production-shaped non-credential context. With `env -i` the ambient
  class is closed; in-band fingerprinting of the explicit fixture values
  remains inherent to an in-band mock (R23 precedent).
- Call-site character-class transformations outside the tested digit
  (full-run and zero-favored), space-removal, and truncation classes.
- Thresholds above the fixture envelope as built by this round (eight list
  entries, 97-char longest title, the single ~230-char three-line body
  shape, decision counts of 1 and 3): a finite fixture set cannot defeat
  arbitrary tuning to its envelope; the guard's claim is limited to the
  demonstrated classes. Correction (round 5): this line's original "five
  decisions" was inconsistent with the built fixtures, which topped out at
  three; the round-5 hardening note (independent escape hunt closed) extends
  the built envelope to decision counts 1-4, the absent-body to
  long-three-line body shapes, the 147-char longest match-required title, a
  mixed action context carrying ALL handler action keywords (include
  `create_pr` and the skipped `fix` probe) plus a matching create that is
  NOT last with a trailing `lab` action, the schedule plus
  workflow_dispatch event shapes, and created counts up to 3 before a
  match, with counts of five or more and created counts of four or more
  kept as the documented residual.

## Delegation ledger

- **Subagent A** (general; R24 escape matrix, 15 prescribed mutations and decoy
  variants, own copies under /tmp/opencode/subA): 15/15 FAIL R24 with the
  expected tokens, control 24/0, zero escapes. Authored none of the guard
  code.
- **Subagent B** (general; independent handler extraction and own mock `gh`;
  scope: scenario semantics and discrimination): pristine scenario traces all
  match the documented expectations, production handler hash identical to the
  reviewed head, and all five gate-vs-scenario discriminations flip exact
  counters. No defects found.
- **Subagent C** (general; read-only docs/reference consistency sweep over the
  worktree, audit script, matrix log, and decision note): 8/8 PASS, no
  inconsistency found. Its per-mechanism line pins are cited in the evidence
  section.
- **Primary (this session):** authored the F4-F7 fixes and the hermetic-env
  change, the new scenarios and fixtures, the mutation-matrix harness, and the
  documentation sync; ran the full audit and the 21-mutation matrix to green;
  reproduced the reviewer's reproductions first-hand; wrote the PR metadata
  handoff files and this record.
- **Skills:** no skill fits (GitHub Actions lab infrastructure, not opencode
  workspace configuration).

- the Lab Engineer
