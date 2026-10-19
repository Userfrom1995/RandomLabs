# R24 hardening round 6: F9/F10 min fixes plus escape-hunt closures

Date: 2026-10-18
PR: #670 (branch `opencode/lab-668-create-issue-dedupe`), issue #668
Role: The Lab Engineer (CTO)

This round addresses the reviewer's round-5 findings in
`.github/scripts/silent-stall-audit.sh` plus the documentation sync. The
shipped handler in `.github/workflows/maintainer.yml` is untouched
(whole-file md5 `09f5118e2691d8ccad4ce33fc4da7c19`, byte-identical to the
revision the Tester validated and the Reviewer reviewed; the extracted
handler block is a subset of that unchanged file).

## Reviewer findings

1. **F9 (loader conjunction escape).** The guard now pins the whole
   `_load_open_issue_titles()` body, from its def line through
   `return index`, as exact trimmed text with exactly one def occurrence
   and exactly two loader-name occurrences in the block, and the 2- and
   4-decision scenarios run against five-entry lists. The demonstrated
   `if len(items) >= 5 and len(decisions) == 2: return {}` now fails with
   `loader-body-changed` plus the s18 functional tokens, as do the
   no-added-line substitution and conditional def-shadowing variants.
2. **F10 (skip-branch conditional continue).** The skip branch is pinned
   as a six-consecutive-line shape (skip print, in-run check, in-run
   print, `else:`, triage dispatch, terminating `continue`), s20 carries
   `ping` (with target) and `ideate` alongside every action keyword, and
   s27 carries a paragraph-break body. Both demonstrated escapes now fail
   with `skip-branch-not-adjacent` plus the s20/s27 functional tokens.
3. **F11 (note precision).** The round-5 note's md5 label now says
   whole-file, and its count claims are historically accurate and point at
   the round-6 closures.

## Independent verification: escape hunt and closures

Subagent A (hostile mutation hunt on a scratch copy) reproduced three
escapes against the pre-round-6 guard, each green at 24/0 while defeating
the dedupe in production, plus two near-misses. All are now closed with
before/after evidence:

- **M1 `gh search issues` probe** inserted between the ntitle computation
  and the lazy-load chain: inert under the mock (an unmodeled subcommand
  exits 64) but rc-0 against real gh, blanking ntitle in production.
  Closed by the exact eleven-line call-site preamble window pin AND the
  whole-matrix unknown-gh-command allowlist check (issue/workflow/api/pr).
  Before: 24/0. After: `preamble-window-changed` +
  `functional-unknown-gh-command:search`.
- **M6 `len(decisions) == 20` gate.** The mixed-action scenario carries 23
  decisions, not 20, so the round-5 "20 is exercised" claim was false and
  an exact gate on 20 passed. Closed by a count sweep of decision counts
  5-23 (each k a five-entry list with the match at a middle index and k-1
  leading fresh creates before the matching create LAST, asserting exact
  create count k-1 and dispatch count k), which also closes the
  created-count sibling `len(_created_issue_numbers) >= 4` that was
  residual. Every decision count 1-23 and every created count 0-22 before
  a match is now exercised. Before: 24/0. After: `functional-count20-*`
  (and `count5-*` for the created gate).
- **M7 conditional sentinel replacement**
  (`_open_issue_titles = {} if os.environ.get("GITHUB_WORKFLOW_REF") else
  None`): kept the assignment-count pin's count and was sandbox-inert.
  Closed by an exact-text pin on `_open_issue_titles = None`. Before:
  24/0. After: `index-init-changed`.
- **M5 SHA-presence gate** (`if os.environ.get("GITHUB_SHA"): ntitle = ""`):
  the sandbox seeded only 14 variables. Closed by seeding the standard
  production-shaped Actions context (SHA, ref, ref name/type, server/API/
  GraphQL URLs, workspace, RUNNER_OS/ARCH, CI) so the gate fires under
  audit. Before: 24/0. After: behavioral FAIL.
- **Norm-body class (own hunt).** An inserted
  `if os.environ.get(...): return ""` before the real return and a
  conditional-expression return replacement were verified caught even by
  the old guard (the fixture namespace exposes only `re`, so an `os`
  reference raises NameError: 23 passed, 1 failed on the pre-round
  script); the new exact function-body pin additionally rejects the whole
  class structurally as `norm-body-changed` with a precise diagnosis.
- **Near-misses kept caught behaviorally.** M2 (re-indented `return index`
  into the loop body) and M3 (conditional continue via re-indentation into
  `else:`) are invisible to trim-normalized static pins; both fail the
  functional matrix (s2/s6-s8/s18/s19/n-sweep and s3 respectively).

## Evidence

- Control `bash .github/scripts/silent-stall-audit.sh
  .github/workflows/opencode.yml` -> `24 passed, 0 failed` on the pristine
  tree (wall time about 18s including the sweep); the same on every
  mutation run's freshly re-copied baseline.
- Mutation matrix, all FAIL with the intended tokens: f9-conjunction,
  f10-conditional-continue, f10-blankline-continue, f9-substitution,
  f9-shadow-def, f10-elif-five, m1-search-probe, m5-env-sha, m6-count20,
  m6b-created4, m7-init-conditional, m8/m8b norm variants.
- The hunt ran entirely in /tmp scratch copies; the repo was never
  mutated, and every mutation ran against a fresh pristine maintainer.yml.

## Documentation sync

- Script comment block and PASS description: the new pins (preamble
  window, sentinel exact text, norm body, unknown-gh allowlist, count
  sweep), the seeded-context narration, and the corrected residual
  (decision counts 1-23 and created counts 0-22 before a match are every
  one exercised; residual is counts above the envelope and context
  variables outside the seeded set).
- `AGENTS.md` R24 bullet and the `LAB.md` Maintainer section updated in
  step; the round-5 note corrections point at the round-6 closures.

## Honest residuals (documented, review-gated)

- Deliberate fingerprinting of unavoidable sandbox identity (fixture token
  strings, sandbox paths, per-title charset gates).
- Call-site character-class transformations outside the tested digit
  (full-run and zero-favored), space-removal, and truncation classes.
- Thresholds above the fixture envelope: more than eight list entries,
  titles longer than 147 chars, exact decision counts 24 and above, exact
  created counts 23 and above before a match, context variables outside
  the seeded set, event names beyond the schedule/workflow_dispatch pair,
  actor values, and body-content predicates keyed on prose absent from
  every fixture body.

## Delegation ledger

- **Subagent A** (general; adversarial R24 escape hunt): 9 mutation
  attempts on a /tmp scratch copy; control 24/0; returned three escapes
  with exact patches, production-capable mock proofs, and two near-misses
  (M1 mock-fidelity gap, M6 count-20 coverage/doc error, M5 SHA-presence;
  M2/M3 static-blind but behaviorally caught).
- **Subagent B** (general; docs/scope audit): verified the whole-file
  maintainer.yml md5 and scope (4 files), pin-vs-comment consistency,
  stale-claim sweep, zero em dashes, cross-file R24 references, and yaml
  sanity; found the false "20 is exercised" claim (closed by the count
  sweep) plus two historical note nits (labeled in the round-5 note).
- **Primary (this session):** implemented the F9/F10 min fixes and every
  closure (preamble window, sentinel pin, norm-body pin, unknown-gh
  allowlist, count sweep, context seeding), extended the mutation harness,
  ran the full before/after matrix, corrected the docs and the round-5
  note, and will write the PR metadata handoff files and this record.
- **Skills:** no skill fits (GitHub Actions lab infrastructure, not
  opencode workspace configuration).

- the Lab Engineer
