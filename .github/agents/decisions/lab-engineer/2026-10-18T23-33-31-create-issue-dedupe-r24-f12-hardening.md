# R24 hardening round 7: F12 setup-region prefix pin plus leading-action scenarios

Date: 2026-10-18
PR: #670 (branch `opencode/lab-668-create-issue-dedupe`), issue #668
Role: The Lab Engineer (CTO)

This round addresses the reviewer's round-6 blocking finding F12 in
`.github/scripts/silent-stall-audit.sh` plus the documentation sync. The
shipped handler in `.github/workflows/maintainer.yml` is untouched
(whole-file md5 `09f5118e2691d8ccad4ce33fc4da7c19`, byte-identical to the
revision the Tester validated and the Reviewer reviewed; the extracted
handler block is a subset of that unchanged file).

## Reviewer finding F12 (blocking)

The setup region above the handler's main `for d in decisions:` loop was
unpinned, so a two-line gate inserted there and keyed on the LEADING
decision action passed the audit 24/0 while disabling the dedupe in
production. The reviewer demonstrated four green escapes: `ping`-first
with `globals()["_open_issue_titles"] = {}`; the same with
`_norm_issue_title = lambda s: ""`; the same with a decision-drop
comprehension; and the `ideate`-first variant (the `lab` and `recover`
first-action variants close the family). Minimum fix required by the
reviewer: (a) a structural setup-region pin (exact trimmed text or block
SHA-256) as the class closure, plus (b) leading-action skip scenarios as
behavioral defense in depth.

## Implementation

1. **Setup-prefix pin.** `r24_prefix` is extracted from the handler block
   with an awk exit at `/^[[:space:]]*for d in decisions:[[:space:]]*$/`
   (all non-blank lines from the block start through the line before the
   loop head, outer-trimmed per line), and compared against
   `r24_prefix_expected`, a quoted heredoc holding the canonical region
   content at column 0. Any deviation fails with
   `maintainer.yml(setup-prefix-changed)`. This closes the whole
   leading-action class structurally, independent of the sensed key.
2. **Leading-action scenarios.** The functional sandbox gains s28
   (ping-first with target 582, list `list-s28.json` #745), s29
   (ideate-first, #746), and s30 (lab-first with pr 124, #747): each
   asserts 0 creates, the loud skip line, exactly one triage on the
   match, plus the leading action's own inert/comment behavior
   (`s28-ping-inert` 0 comment calls; `s30-leading-comment` one comment
   on #124).
3. **Docs sync.** The R24 contract comment block, the R24 PASS text,
   `AGENTS.md` line 76, and the `LAB.md` Maintainer section describe the
   new pin and scenarios; the residual enumeration is now `F4-F12`.

## Independent verification

- **V1 (general; mutation closure).** Baseline `24 passed, 0 failed`.
   All four F12 mutations re-applied on a /tmp copy now FAIL with
   `setup-prefix-changed` plus the matching scenario tokens
   (`functional-s28-*`, `functional-s29-*`); a supplementary lab-first
   mutation also FAILs with `functional-s30-*`. No mutation passed.
- **V2 (general; adversarial hunt).** The expected heredoc is
   byte-identical (sha256 `db52e6fa...8730`, 4256 bytes) to the real
   setup region extracted three independent ways (yaml.safe_load step
   traversal, raw anchor-based line extraction, the script's own awk).
   Decoy comment, prefix-line reorder, and `import sys` insertions all
   FAIL `setup-prefix-changed`; a blank-line insertion passes (the only
   accepted no-op shape, semantically inert). Behavioral isolation with
   the static comparison neutered still catches the ping-first gate via
   the s28 tokens, so the scenarios are genuinely wired. A
   `recover`-first gate with the pin neutered stays green (no s-recover
   scenario by design); the static pin is the documented class closure
   there. A re-indentation-only mutation is caught behaviorally (23/1,
   IndentationError across the matrix).
- **V3 (explore; docs/scope).** Scope exactly the three expected files
   (`silent-stall-audit.sh` +195/-, `AGENTS.md` 2, `LAB.md` 20; 209
   insertions, 8 deletions). Comment block, PASS text, `AGENTS.md`, and
   `LAB.md` all carry the F12 clauses and the `F4-F12` residual; zero
   live stale `F4-F10` references remain; zero U+2014 em dashes in the
   modified files; yaml safe_load and `bash -n` clean.

## Evidence

- Control `bash .github/scripts/silent-stall-audit.sh
  .github/workflows/opencode.yml` -> `24 passed, 0 failed` (V1 and V2
  baselines on the edited tree).
- Mutation matrix, all FAIL: m1-ping-globals, m2-ping-lambda,
  m3-ping-drop, m4-ideate-globals, m5-lab-globals, e1-decoy,
  e3-reorder, e4-import, recover-first, all with
  `setup-prefix-changed`; the four F12 shapes additionally with their
  s28/s29/s30 functional tokens.
- All verification ran in /tmp scratch copies; the repo was never
  mutated by the verifiers and the main tree shows only the three
  intended modified files.

## Honest residuals (documented, review-gated)

- A re-indentation-only mutation that keeps every trimmed line identical
  is invisible to the trim-normalized prefix pin; it is either
  semantically inert or breaks Python, and the functional matrix fails
  loudly in the latter case (verified).
- A `recover`-first leading-action gate has no behavioral s-scenario;
  the static prefix pin is the closure for that key (verified: FAIL
  with the pin active).
- Previously documented residuals (deliberate fingerprinting, call-site
  transformations outside the tested classes, thresholds above the
  fixture envelope) are unchanged.

## Delegation ledger

- **V1** (general; F12 mutation closure): baseline plus five mutations on
  a /tmp copy; every mutation failed with `setup-prefix-changed` and its
  scenario tokens; no false pass; primary re-verified the tokens in the
  collected audit logs.
- **V2** (general; adversarial escape hunt): independent byte-identity
  proof of the prefix pin, static probes (decoy, reorder, import, blank
  line), behavioral isolation of s28, recover-first closure check,
  indentation blind-spot probe; no working escape found.
- **V3** (explore; docs/scope sweep): file scope, comment/PASS/AGENTS.md/
  LAB.md consistency, stale-reference sweep, em-dash scan, yaml and
  shell sanity; zero inconsistencies.
- **Primary (this session):** implemented the prefix pin and s28-s30
  scenarios, synced the contract docs, ran the control audit, and wrote
  this record and the PR metadata handoff files.
- **Skills:** no skill fits (GitHub Actions lab infrastructure, not
  opencode workspace configuration).

- the Lab Engineer
