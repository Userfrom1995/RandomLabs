# R26 hardening round 16: F30 escaped-quote spelling and normalized-layer self-tests

Round-16 review of PR #670 (issue #668) found that the R26 literal-create
scan's second, normalized layer stripped whitespace and quotes but not
backslashes, so a shell-escaped-quote Python one-liner executed a real
`gh issue create` while the audit reported `26 passed, 0 failed`. The same
layer had no self-test, so deleting it also left the audit green while the
plain single-quoted Python list form went undetected. The dedupe handler
itself remains untouched and correct: every change is audit-side and
contract text.

## Findings addressed

- **F30 (blocking, test-integrity):** the shell-escaped-quote one-liner
  `python3 -c "import subprocess; subprocess.run([\"gh\", \"issue\",
  \"create\", \"--title\", \"p\"])"` was a literal invocation (no
  variables, command substitution, or repo script, so outside the
  documented indirection residual) and passed at 26/0. The normalized form
  left `[\gh\,\issue\,\create\]`, so `issue,create` never appeared.
- **F30 self-test gap:** the `_f29_red` matrix exercised only
  `issue_create_in`; nothing tested the normalized predicate, so removing
  that layer was invisible to the audit.
- **F30 docs:** the R26 PASS text, `AGENTS.md`, `LAB.md`, and the round-15
  decision note overstated the closure and self-test coverage.

## What changed

1. **Normalized form folds backslashes:** `normalized_create_form(text)`
   in `.github/scripts/silent-stall-audit.sh` removes whitespace, both
   quote characters, and backslashes before the `issue,create` test. The
   escaped-quote spelling and the plain list form now normalize to the
   same canonical form.
2. **One combined detector:** `issue_create_detected(text)` returns
   `issue_create_in(text) or "issue,create" in normalized_create_form(text)`
   and is the exact predicate the workflow-wide scan invokes, so both
   layers are exercised by the same self-tests the scan depends on.
3. **Red/green self-tests:** `_f30_red` covers the plain list form, the
   multi-line list, and the shell-escaped-quote form; `_f30_green` covers
   `gh issue list` and an inert echo. A missed red case exits 21 with
   `f30-selftest-missed:`; a false-positive green case exits 21 with
   `f30-selftest-false-positive:`.
4. **Contract and docs sync:** the R26 block comment, the R26 PASS text,
   `AGENTS.md:76`, and `LAB.md` now state the backslash fold, the
   escaped-quote coverage, and the red/green self-tests over the combined
   detector, and cite F26/F29/F30. The residual range is F4-F30.
5. **Round-15 note corrected:** the earlier note now records that its
   normalized-layer claim was completed in this round rather than treating
   it as closed at round 15.

## Verification ledger (this session)

- Baseline on the working tree:
  `bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml`
  -> `26 passed, 0 failed`; `bash -n` clean; `yaml.safe_load` clean on
  `maintainer.yml`, `opencode.yml`, and `auditor.yml`.
- Escaped-quote one-liner appended to the last line of `maintainer.yml`
  (the `approve-held-runs.sh` line) in a throwaway copy -> `25 passed,
  1 failed` with `issue-create-outside-handler:maintainer:22`.
- Plain single-quoted list form `python3 -c "import subprocess;
  subprocess.run(['gh', 'issue', 'create'])"` -> `25 passed, 1 failed`
  with the same token.
- Removing `.replace("\\", "")` from `normalized_create_form` ->
  `FAIL R26` with `f30-selftest-missed` (the escaped case).
- Reducing `issue_create_detected` to `issue_create_in` only ->
  `FAIL R26` with `f30-selftest-missed` (the plain list form).
- Widening `_f30_green` with an `issue,create` string ->
  `FAIL R26` with `f30-selftest-false-positive`.
- Subagent escape hunt (five literal spellings: single-quoted outer,
  tab-separated list, heredoc list, escaped-quote single-quoted outer,
  backslash-continued list): all five red with
  `issue-create-outside-handler:maintainer:22`; no residual literal gap
  was found.
- Handler untouched: `git diff HEAD -- .github/workflows/maintainer.yml`
  empty; `python3 -I - <<'PY'` remains the single handler invocation.
- Zero U+2014 em dashes in the changed files; no stale live R25
  dedupe references (R25 is only main's #701 cap-headroom rule).

## Delegation ledger

- **general subagent A (adversarial F30 verification):** reproduced the
  baseline, the escaped-quote and plain-list payloads (both red), and a
  five-case literal escape hunt (all red); workspace untouched.
- **general subagent B (self-test integrity):** independently confirmed
  the backslash-fold removal and the normalized-layer removal both fail
  with `f30-selftest-missed`, the widened green case fails with
  `f30-selftest-false-positive`, the handler diff is empty, and syntax and
  YAML checks pass.
- **explore subagent C (docs and scope sweep):** confirmed the AGENTS.md
  and LAB.md mirrors, the corrected round-15 note, R26-only live
  inventories, zero em dashes, and exactly the intended changed-file
  scope. It flagged the round-16 note as not yet present, which this file
  resolves.
- **Primary verified itself:** the three predicate mutations above, the
  baseline audit, the exact diff, and the final clean-tree check; read
  every cited pin directly.
- **Skills:** no skill fits (GitHub Actions lab infrastructure and audit
  engineering, not opencode workspace configuration).

## Known residual / gap boundary

- Direct REST creates (`gh api --method POST .../issues` or
  `curl .../issues`), creates executed from inside a repo script,
  composite action, or reusable workflow, and creates reached through a
  variable or command-substitution indirection at the call site remain
  review-gated.
- The self-tests exercise the exact combined predicate the scan calls.
  Removing the scan's invocation of that predicate would be an edit to
  the audit script's own control flow, the same review-gated boundary
  that applies to every other rule in this script.
- Deliberate fingerprinting, call-site character-class transformations
  outside the tested digit/space-removal/truncation classes, and
  thresholds above the fixture envelope remain as previously documented.

## Round-17 correction: F31/F32

Round-17 review of PR #670 found that the round-16 "either layer" claim
was still stronger than the self-tests:

- **F31:** only `_f30_red` reached the combined detector; the combined
  predicate's shell leg had no test of its own, so replacing
  `issue_create_detected` with the normalized layer alone kept the audit
  green while `gh $'\x69ssue' create` executed.
- **F32:** seven literal spellings still escaped both layers: a
  single-element `shell=True` list, a comment-split list token, a
  comment-split adjacent token (`"iss"` + `"ue"`), Python `\xNN`,
  `\uNNNN`, and octal escapes, and bytes literals.

The correction in this round (see the round-17 decision note):
`decode_literal_escapes` folds the Python escape spellings;
`normalized_create_form` strips line comments before folding whitespace,
quotes, and backslashes; `issue_create_in` folds container punctuation
and `b`/`r`/`u`/`f` string prefixes; and the self-tests now test the word
scan over `_f29_red` directly, the normalized form over `_f30_red`
directly, and the exact combined predicate over `_f29_red + _f30_red +
_f31_red` (the seven F32 spellings). The contract text now states that
precise contract rather than claiming that the same matrix exercises both
layers. The round-16 note above is left intact as the historical record.

Refs #668.

- the Lab Engineer
