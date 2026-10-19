# R25 hardening round 12: F23 transitive-shadow and F24 audit-helper isolation closures

Round-11 review of PR #670 (issue #668) verified the F22 importable-spelling
closures and filed two blocking test-integrity findings (F23, F24). Both are
closed this round by isolating the two remaining non-isolated execution
points; the dedupe logic itself is untouched (the handler change is the
invocation line only).

## Findings addressed

- **F23 (blocking, test-integrity):** the R25 shadow watch list covers only
  the handler's direct imports, so a repo-root `selectors.py` (imported
  transitively by `subprocess`) gated on the repo's cwd shape could patch
  `json.loads` and disable the dedupe while the audit reported
  `25 passed, 0 failed`. The production handler step
  (`.github/workflows/maintainer.yml`, "Run /oc triggers as owner") invoked
  `python3 -` (non-isolated), and `sys.path[0]` was the workspace cwd, so any
  repo-root module of any name, spelling, or transitive-import depth could
  reach the handler process.
- **F24 (blocking, test-integrity):** the audit's own R18 YAML-consistency
  helper ran non-isolated Python (`python3 - <<'R18PY'`, cwd = repo root,
  importing `glob, os, re, sys, yaml`). A committed repo-root `glob.py` could
  execute during the audit and rewrite `.github/workflows/maintainer.yml`
  (repairing a deliberately weakened handler line, then unlinking itself), so
  R25 extracted a repaired file while the committed artifact stayed weakened;
  the audit reported `25 passed, 0 failed` and the demonstrated weakened
  handler (`if existing:` -> `if False:`) was live in HEAD.

## What changed

1. **Handler isolation (F23, class closure):** the handler step now invokes
   `python3 -I - <<'PY'`. With `-I`, cwd is never on `sys.path` (verified:
   `'' not in sys.path` on the runner's CPython 3.12), so no repo-root module
   can reach the handler process regardless of name, spelling, or
   transitive-import depth. The R25FULL expected text was updated in the same
   change (the exact-text block pin is intentionally coupled); removing or
   weakening the `-I` isolation now fails `maintainer.yml(handler-block-changed)`
   structurally.
2. **R18 helper isolation (F24, repair-vector closure):** the R18 helper now
   invokes `python3 -I - <<'R18PY'`, so it can never import a repo-root module
   that rewrites the workflow file under test. The optional `glob`/`yaml`
   watch-list addition was deliberately skipped: with the helper isolated its
   import set is no longer shadowable, and `R25_WATCH_MODULES` stays exactly
   the handler's import set plus the startup hooks.
3. **Contract text sync:** the audit-start snapshot comment (it is now
   defense in depth; the R18 helper, the demonstrated non-isolated consumer,
   runs isolated), R25 header property 8 (F20/F21/F23/F24; the execution
   layer now closes the shadow class and the static scan is belt and
   braces), the static-scan comment, the sandbox-mirror comment (mirrors
   remain defense in depth), the R25 PASS text (the handler step's own
   isolation and the R18 isolation named; `F4-F24` residual range), the
   `can conclude green` parenthetical (F20/F21/F22/F23/F24), `AGENTS.md`,
   and `LAB.md` (`F2/F4-F24` residual range).

## Verification ledger (this session)

- Control audit `25 passed, 0 failed` (16s) on
  `.github/workflows/opencode.yml` after every edit including the final
  tree; `bash -n` clean; `yaml.safe_load` clean on `maintainer.yml`,
  `opencode.yml`, `auditor.yml`; zero U+2014 em dashes across the four
  changed files; zero non-isolated `python3` invocations remain in
  `.github/scripts/silent-stall-audit.sh` (1768, 4805, 5509 all `-I`).
- R25FULL equality: a PyYAML extraction of the real run block plus the
  same `awk 'NF { print }'` transform the audit uses is byte-identical to
  the `R25FULL` heredoc (296 non-blank lines); the first line is exactly
  `python3 -I - <<'PY'` on both sides.
- Primary quick checks: with a hostile cwd `selectors.py` present,
  `python3 -c 'import subprocess'` imports it (crash proves import), while
  `python3 -I -` imports the real stdlib module; same for `glob.py`.
- Subagent A (general; F23 end-to-end, own extractor plus argv-strict mock
  `gh`, `env -i`, production-shaped env): fixed block -> 0 creations,
  exactly 1 triage on #665, the loud skip line, zero shadow-import markers;
  control block (only line 1 reverted to `python3 -`) -> 1 duplicate
  creation (#901), no skip line, triage on #901, both shadow markers
  present. The harness demonstrably catches F23 and the fix defeats it.
- Subagent B (general; F24 escape closure plus pin mutation, five tree
  copies): T0 baseline 25/0; T1/T1c old-shape escape reproduced (25/0 with
  the committed handler weakened and `glob.py` in HEAD; the helper repaired
  the working file and self-deleted; logs kept); T2 fixed shape -> `FAIL
  R25: ... maintainer.yml(no-skip-guard) ... maintainer.yml(handler-block-changed)`,
  `24 passed, 1 failed`, `glob.py` never imported and the file still
  weakened; T3 (only the handler invocation reverted to `python3 -`) ->
  `FAIL R25 ... maintainer.yml(handler-block-changed)`, so the exact-text
  pin catches isolation removal on its own.
- Subagent C (general; docs and consistency sweep): no stale text
  (the only `cwd`/`sys.path[0]` claims are past-tense history), zero
  backtick hazards in `check "..."` strings, zero non-isolated audit-script
  invocations, R25FULL byte-identity confirmed, no live stale `F4-F22` /
  `F2/F4-F22` ranges, all syntax checks clean.
- Primary verified itself: the two invocation edits and the R25FULL line
  read directly, the final control audit, the extraction equality, the
  em-dash scan, and the clean workspace (`git status --porcelain` shows
  exactly the four intended files).

## Delegation ledger

- **Subagent A** (general; F23 end-to-end isolation proof): built its own
  extractor, hostile `selectors.py`, and argv-strict mock `gh`; fixed block
  deduped correctly with zero shadow markers, control reproduced the
  duplicate; no discrepancy.
- **Subagent B** (general; F24 escape closure and pin mutation): reproduced
  the old-shape repair escape (including the committed-weak-file variant
  T1c), proved the fixed shape fails loudly without importing the hostile
  module, and proved the invocation-revert mutation is caught; one task
  wording inconsistency (repair-then-unlink leaves the working file
  repaired, not weakened) noted and reconciled.
- **Subagent C** (general; docs, ranges, syntax, and invocation sweep):
  clear on all six checks; flagged one present-tense historical sentence in
  the static-scan comment, which the primary corrected to past tense.
- **Primary (this session):** implemented both invocations, the R25FULL
  update, and every contract text; ran the control audit and the quick
  isolation checks; corrected the borderline comment; wrote this note and
  the handoff files.
- **Skills:** no skill fits (GitHub Actions lab infrastructure, not
  opencode workspace configuration).

## Known residual / gap boundary

- The other non-isolated `python3` invocations in `maintainer.yml` (the
  pre-handler comment step and the two step-level helpers at the current
  lines 404, 429, 631, 1222) share the shadow class but sit outside R25's
  dedupe scope; isolating them repo-wide remains an optional future pass,
  recorded here rather than silently omitted. The R25 static scan still
  watches the handler's import set plus startup hooks as belt and braces,
  so a committed shadow of a watched module fails the audit loudly even
  though the isolated handler can no longer import it.
- Deliberate identity fingerprinting (fixture token strings, sandbox paths,
  per-title charset gates), thresholds above the fixture envelope,
  prose-keyed predicates, and context values outside the seeded shapes
  remain the documented review-gated residual, unchanged by this round.
- The wholesale executing-step rewrite carrying none of the three handler
  needles with a canonical decoy left in place remains the review-gated
  diff-review boundary; this round does not narrow it.
- The round-11 self-unlink snapshot (R25_EARLY_SHADOWS) stays active as
  defense in depth even though both demonstrated non-isolated consumers are
  now isolated.

- the Lab Engineer
