# Decision: Create-issue dedupe round-5 R24 hardening (review finding F8 plus the independent escape hunt closed)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T21:31:09Z
- **Applies to:** PR #670 / issue #668 (create-issue dedupe; review round-4 finding F8 and its escape-hunt family)
- **Status:** accepted; handed to the Reviewer

## What was decided

The Reviewer's round-4 report on PR #670 filed F8 as blocking: R24's
sandbox matrix stayed green (`24 passed, 0 failed`) while loader-internal
gates on run-state dimensions that no fixture varied silently disabled the
dedupe for ordinary production inputs. Two reproductions were demonstrated:
`if len(decisions) == 2: return {}` and
`if body_text.count("\n") < 2: return {}` inserted before `return index` in
`_load_open_issue_titles`. The shipped handler itself was independently
verified correct and stays untouched (the whole `maintainer.yml` is
byte-identical to the revision the Tester validated and the Reviewer
reviewed, whole-file md5 `09f5118e2691d8ccad4ce33fc4da7c19`, so the
extracted handler block is a subset of that unchanged file; round-6
correction, review finding F11). This round hardens R24 in
`.github/scripts/silent-stall-audit.sh` only, plus the documentation sync.

1. **Decision-count sweep 1-4 with the matching create LAST (review
   requirement).** New s18 (2 decisions: 1 create, then the match-skip;
   asserts exactly 1 create and 2 dispatches) and s19 (4 decisions: 3
   creates, then the match-skip; asserts exactly 3 creates and 4 dispatches
   with triages on #900/#901/#902 now asserted directly), joining the
   existing 3-decision s15 (2 creates + match-skip, 3 dispatches). Every
   `== k`, `<=`, and `>=` decision-count or created-count gate inside 1-4
   fires on at least one scenario and breaks its exact-count assertions.
2. **Body-shape envelope extended down to absent-body (review
   requirement).** New s24 (the matching decision carries NO body key, so
   `body_text` defaults to "" and `if not body_text: return {}` plus every
   `len(body_text) < N` with N >= 1 fires); s21 shortened to a 23-char
   single-line body ("Short single-line body."), closing `len(body_text) <
   N` for N up to 23 and equality gates on short bodies; s22 keeps the
   two-line shape. Every other scenario decision keeps the production-shaped
   multi-line >200-char body. Newline-presence, line-count, and short-length
   predicates all fire inside the envelope; thresholds above the >200-char
   long body remain the documented residual.
3. **Mixed action context carrying ALL handler action keywords (review
   requirement plus escape hunt).** s20 rebuilt as a mega fixture: review,
   test, test-linux, test-macos, test-windows, eval, continue, build,
   auditor, curate, architect, research, design, design-ux, design-visual,
   design-motion, lab, recover, fix, and create_pr, then the matching create
   LAST. Assertions: 0 issue creates; 18 comment posts on #200 (one per
   comment-posting action); the skipped-fix `gh api .../pulls/200` probe; a
   `gh pr create` attempt for the create_pr sibling; the loud skip plus a
   single triage on #720. Any action-keyword gate, including on `create_pr`,
   breaks the skip assertion.
4. **Matching create NOT last (escape hunt).** New s25 (match FIRST,
   trailing `lab` action): a last-position predicate
   (`decisions[-1].get("action") != "create_issue"`) now fires and breaks
   the skip assertion; every other fixture ended on a create_issue.
5. **Long-title envelope lifted (escape hunt).** New s26: a 147-char
   identical title pair (above s9's 97-char and s12's 98-char pairs), so
   per-entry title-length predicates up to 146 fire.
6. **Event-shape variant (round-4 non-blocking observation, closed while the
   runner is touched).** `r24_run` gained an optional fifth argument for
   `GITHUB_EVENT_NAME` (default `schedule`); s23 runs the same skip under
   `workflow_dispatch`, so the demonstrated event-name gate fires.
7. **Documentation sync (review requirement).** The R24 property text, the
   PASS description, `AGENTS.md`, and `LAB.md` now describe the new
   scenarios and the widened residual (exact decision-count gates outside
   the exercised counts: 1-4 were swept and the mixed-action scenario
   carried 23 decisions, so gates on 5-22 escaped at round-5 and were
   closed by the round-6 count sweep,
   created counts of four or more before a match (closed up to 22 by the
   round-6 sweep), body-content predicates
   keyed on prose absent from every fixture body, non-credential context
   values outside the exercised shapes, including event names beyond the
   schedule/workflow_dispatch pair and actor values); the round-4 note's
   "five decisions" correction was extended to the full round-5 envelope;
   the round-3b note's "~95-char" approximations were corrected to the
   actual 97 characters.

## Evidence

- Pristine control: `bash .github/scripts/silent-stall-audit.sh
  .github/workflows/opencode.yml` -> `24 passed, 0 failed`; `bash -n`
  clean; the whole `maintainer.yml` byte-identical to the reviewed head
  (whole-file md5 `09f5118e2691d8ccad4ce33fc4da7c19`; round-6 correction,
  review finding F11); the change set is the five modified
  files plus this new decision note (six paths).
- Primary negative-mutation matrix (harness `/tmp/opencode/r24_mutate.py`,
  log `/tmp/opencode/r24-matrix-round5-final.log`): control 24/0, m01-m17
  CAUGHT with the intended scenario tokens (m01 via s18 and s25, m02 via
  s19, m03 via s15/s17, m04 via s2/s6, m05 via s21/s22, m06 via s21/s24,
  m07 via s20/every long-body scenario, m08 via s20, m09 via s23, m10 via
  the static loader pins plus functional s1, m11 via the skip scenarios,
  m12/m13 via the skip scenarios, m14 via s20, m15 via s25, m16 via s24,
  m17 via s21/s24), and exactly the documented-residual shapes escape:
  m18 (gate keyed on an actor value other than the sandbox's production-
  shaped `github-actions[bot]`), m19 (content predicate keyed on prose
  absent from every fixture body), m20 (event name beyond the exercised
  schedule/workflow_dispatch pair). A follow-up run of the same harness
  shows m21 (the same created-count gate placed in the loader chain) is
  CAUGHT statically by the five-line adjacency pin regardless of the
  dimension it gates on, while m22 (a created-count gate at four or more
  before a match, placed inside the skip branch; s19 tops out at 3 creates
  before the match) ESCAPES as the documented created-count residual. Net:
  18 of 22 mutations caught; all four escapes match a documented residual
  class, not an accidental gap: each would require fingerprinting a value
  that an in-band mock cannot exercise without knowing the production
  value (R23 precedent).
- Independent escape hunt (subagent A, its own tree copies, authored none
  of the guard code): reproduced the F8 family and found, pre-fix, the
  body-length escape (`len(body_text) < 50`), a prose-token content
  predicate, a `create_pr` action gate, a last-decision action gate, and
  the actor/event/created-count fingerprint gates. The four closeable
  classes were closed (s21/s24, s20, s25) and verified CAUGHT on re-run;
  the fingerprint classes are the documented residual above.
- Independent verification (subagent B, own extraction): the production
  handler is byte-identical to `2aa0bf66`; the s18-s26 claims and counts
  were re-verified against the sandbox; it found and this round fixed the
  missing direct s19 triage asserts and two wording imprecisions
  ("97-char longest" was actually the s12 98-char pair; the match-required
  envelope is now stated as 147 chars).
- Docs/reference sweep: zero U+2014 em dashes across all six changed
  paths; `grep` sweep for stale "~95"/"95-char" claims is clean; the
  audit's R24 comment, PASS description, `AGENTS.md`, and `LAB.md`
  consistently state the 147-char match-required envelope and the widened
  residual.

## Honest residuals (documented, review-gated)

- Deliberate fingerprinting of unavoidable sandbox identity (fixture token
  strings, sandbox paths, per-title charset gates); the fixed
  `GITHUB_RUN_ID`/`GITHUB_ACTOR` and production-shaped non-credential
  context. With `env -i` the ambient class is closed; in-band
  fingerprinting of the explicit fixture values remains inherent to an
  in-band mock (R23 precedent). Verified escaping by m18-m20 and m22.
- Call-site character-class transformations outside the tested digit
  (full-run and zero-favored), space-removal, and truncation classes.
- Thresholds above the fixture envelope as built by this round (eight list
  entries, the 147-char longest match-required title, the absent-body to
  long-three-line body shapes, decision counts 1-4 plus the 23-decision
  mixed-action scenario (exact count gates on 5-22 escaped at round-5;
  closed by the round-6 count sweep),
  created counts up to 3
  before a match, the schedule/workflow_dispatch event pair): a finite
  fixture set cannot defeat arbitrary tuning to its envelope; the guard's
  claim is limited to the demonstrated classes. Verified escaping by m22
  (created counts of four or more before a match; the same gate in the
  loader chain is caught statically by the adjacency pin).
- Body-content predicates keyed on prose absent from every fixture body
  (m19): enumerating prose is not a finite fixture problem; the guard
  cannot distinguish a deliberate dodge from a genuinely distinct finding.

## Delegation ledger

- **Subagent A** (general; independent R24 escape hunt against its own
  trees, authored none of the guard code): found the pre-fix escapes m06
  (body length), the prose-token predicate, e05 (`create_pr` action gate),
  e07 (last-decision action gate), and the actor/event/created-count
  fingerprint classes; all closeable classes were closed this round and
  re-verified CAUGHT.
- **Subagent B** (general; independent verification of the round-5 diff:
  handler extraction, scenario semantics, docs consistency): whole-file
  `maintainer.yml` md5 identical to the reviewed head; all new scenario
  claims verified; found
  the missing s19 triage asserts and two wording imprecisions, all fixed
  here.
- **Primary (this session):** authored the F8 fixtures and scenarios
  (s18-s26, mega s20), the event-argument runner change, the mutation
  harness and its residual matrix, and the documentation sync; ran the
  full audit and the 22-mutation matrix to green; reproduced the
  reviewer's F8 reproductions first-hand; will write the PR metadata
  handoff files and this record.
- **Skills:** no skill fits (GitHub Actions lab infrastructure, not
  opencode workspace configuration).

- the Lab Engineer
