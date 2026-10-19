# R25 hardening round 11: F22 importable-spelling closure and the audit-start self-unlink snapshot

Round-10 review of PR #670 (issue #668) verified the F19-F21 closures and
filed one blocking test-integrity finding (F22). This round closes F22 and
the one timing escape found while adversarially verifying its closure. The
shipped handler is byte-identical to the handler confirmed in every prior
round (md5 `09f5118e2691d8ccad4ce33fc4da7c19`; untouched this session).

## Findings addressed

- **F22 (blocking, test-integrity):** the R25 repo-root shadow scan checked
  only `<mod>.py` and `<mod>/__init__.py`, and the sandbox mirror copied
  only top-level `*.py` files and `__init__.py` packages. Every other
  importable spelling was invisible: a repo-root `json.pyc` (PEP 3147
  legacy sourceless layout), a bare or version-tagged extension module
  (`json.so`, `json.pyd`, `json.cpython-311-x86_64-linux-gnu.so`,
  `json.cp311-win_amd64.pyd`), or a package directory carrying only an
  `__init__.*` artifact (for example `json/__init__.pyc`) passed
  `25 passed, 0 failed` while the dedupe was dead in production: the
  extractor and fixture isolation cannot help because production runs the
  handler with cwd set to the workspace root.
- **Self-unlink TOCTOU (found while verifying F22; closed, not
  documented):** the R25 static scan reads the repo root AFTER earlier
  rules have run, and the R18 helper executes non-isolated Python
  (`python3 -`) with cwd set to the repo root, importing
  `glob, os, re, sys, yaml`. A self-deleting sourceless `re.pyc` (present
  at checkout, unlinked during R18's `import re`) left the live scan
  nothing to see. Counterfactually verified: with the snapshot neutered,
  the audit reported `25 passed, 0 failed` with the file already gone,
  falsifying the rule's claim that any such shadow fails loudly.
  Production exposure for the maintainer arm is empty: the earlier
  always-run `Post Maintainer comment` step (`maintainer.yml:625-632`,
  `if: always()`) executes `python3 -` importing `json, os, subprocess`
  (json transitively imports re) with cwd set to the workspace root
  BEFORE the handler step, so a self-deleting shim for any watched
  non-builtin module is consumed and removed in that earlier process
  (where no `_load_open_issue_titles` caller exists, so a
  caller-special-casing shim delegates harmlessly), and the handler
  process then imports the real stdlib module. The audit's soundness is
  nonetheless fixed independently of that reasoning.

## What changed

1. **Static scan covers every importable spelling** (`.github/scripts/silent-stall-audit.sh`):
   the per-module predicate was extracted into a shared
   `r25_shadow_present <root> <mod>` helper (defined at the top of the
   script) and the watched list into a shared `R25_WATCH_MODULES`
   (`json os re subprocess time sys sitecustomize usercustomize`), used by
   both the audit-start snapshot and the R25 scan. The predicate matches
   `<mod>.py`, `<mod>.pyc`, `<mod>.so`, `<mod>.pyd`, version-tagged
   `<mod>.*.so` / `<mod>.*.pyd`, and a package directory carrying any
   `<mod>/__init__.*` artifact. Failures keep the established loud token
   `repo-root(<mod> shadows stdlib)`.
2. **Audit-start checkout snapshot:** before any rule executes, the script
   snapshots which watched modules were present at checkout
   (`R25_EARLY_SHADOWS`, resolved root `R25_EARLY_ROOT` using the same
   `dirname "$0"/../..` formula as `R25_REPO_ROOT`) and the R25 scan ORs
   snapshot membership into the live present-now predicate, so a shadow
   that unlinks itself on import is still caught. A module present at
   audit start but gone at scan time cannot silently disappear from the
   rule's view.
3. **Sandbox mirror covers every spelling** (`r25_run`): the repo-root
   mirror now links top-level `*.py`, `*.pyc`, `*.so`, `*.pyd` files and
   any package directory carrying an importable `__init__.*` artifact into
   the sandbox work dir, so a shadow is imported there exactly as in
   production and also breaks the functional assertions (defense in
   depth).
4. **Contract text sync:** R25 header property 8, the static-scan comment
   block, the R25 PASS text (which now states the snapshot clause and
   keeps the F20/F22 tags), `AGENTS.md`, and `LAB.md` (shadow clause plus
   residual range updated to F2/F4-F22).

## Verification ledger (this session)

- Control audit `25 passed, 0 failed` on `.github/workflows/opencode.yml`
  in the primary tree after the F22 edits, after the comment-accuracy
  passes, and on the final tree (17s per run); final script md5
  `c02298a6d9fdb22a2f406f2c8aef88e7`; `bash -n` clean; zero em dashes in
  `git diff`; `git status` shows exactly the three intended modified files.
- Full spelling matrix in an isolated copy of the tree with the final
  script (16 cases, one full audit per case): baseline 25/0; each of the
  12 negative spellings fails with `repo-root(<mod> shadows stdlib)`
  (`json.pyc`, `json.so`, `json.pyd`, `json.cpython-311-x86_64-linux-gnu.so`,
  `json.cp311-win_amd64.pyd`, `json/__init__.py`, `json/__init__.pyc`,
  `json/__init__.cpython-312-x86_64-linux-gnu.so`, `os.pyc`,
  `sitecustomize.pyc`, `usercustomize.pyc`, `time/__init__.pyc`); the
  `json.pyc` and `json/__init__.*` cases additionally fail with the
  sandbox functional tokens (`maintainer.yml(functional-s1-lists-once)`,
  `maintainer.yml(functional-s1-rc)`), proving the extended mirror imports
  the shadow exactly as production would; an empty `json/` namespace
  directory stays green (PEP 420 namespace portions do not shadow the
  stdlib module, so it is correctly not flagged) and so do the
  false-positive controls (`test.py`, `json.txt`); final baseline 25/0.
- Self-unlink proof: a valid sourceless self-deleting `re.pyc` (compiled
  shim that unlinks itself and delegates to the real module) yields
  `24 passed, 1 failed` with `repo-root(re shadows stdlib)` while R18
  still passes and the file is gone after the run, so the snapshot is the
  only thing that could have detected it; the same run with the snapshot
  recording neutered yields `25 passed, 0 failed` with the file gone
  (the demonstrated escape), and the workspace baseline stays 25/0 with
  the snapshot active and no shadows present.
- Handler md5 `09f5118e2691d8ccad4ce33fc4da7c19` unchanged before and
  after every step; `.github/workflows/maintainer.yml` not touched.

## Delegation ledger

- **Subagent A** (general; adversarial closure matrix in an isolated copy
  at `/tmp/opencode/f22-verifyA`): built and ran the 12-spelling negative
  matrix plus false-positive and regression controls against the F22-era
  script, confirmed each negative fails with the intended token and the
  controls stay green, and behaviorally proved the sandbox mirror catches
  a shadow even when the static scan is neutered.
- **Subagent B** (general; adversarial escape hunt): probed the F22
  closure for ways to pass while the dedupe is weakened; found the
  self-unlink TOCTOU on `re.pyc` through the R18 helper's non-isolated
  Python, classified the contextlib-style unlisted-module shape as the
  documented fingerprinting residual, and confirmed that an unconditional
  unlisted shadow is caught (control run).
- **Subagent C** (general; docs and consistency sweep): verified the
  header property 8, static-scan comment, PASS text, `AGENTS.md`, and
  `LAB.md` all state the F20/F22 spelling contract, with no stale
  F20-only wording, no backticks in the PASS text, no em dashes,
  `bash -n` clean, and `maintainer.yml` untouched.
- **V1/V2/V3 roles above (#668 round 11):** independent verification and
  escape hunting as described; each ran in its own copy, never touching
  the primary tree.
- **Primary (this session):** finished the F22 closure implementation,
  designed and implemented the audit-start snapshot, fact-corrected the
  comments (the proven trigger example is `re.pyc`; `sitecustomize.pyc`
  is not imported from cwd at startup on this CPython 3.12 environment
  because the stdlib `sitecustomize` wins, so the note does not claim it
  as an observed trigger even though the scan covers the startup-hook
  spellings), reran the full matrix and the snapshot proofs against the
  final script, and updated every contract text location.
- **Skills:** no skill fits (GitHub Actions lab infrastructure, not
  opencode workspace configuration).

## Known residual / gap boundary

- Unlisted-module fingerprinting (a shadow for a module the handler never
  imports, for example a `.git`-gated `contextlib.pyc`) remains the
  documented residual: the watch list is exactly the handler's import
  set plus the startup hooks, as the reviewer's own non-blocking
  observation accepted.
- The snapshot covers the watched set as it exists at audit start; a
  committed shadow that is created DURING the audit run by tampering with
  the audit script itself stays out of scope (active tampering, unchanged
  from prior rounds).
- The wholesale executing-step rewrite carrying none of the three handler
  needles with a canonical decoy left in place remains the review-gated
  boundary; the F22 closure does not narrow it.
- `R25_REPO_ROOT` (and the snapshot's root) resolve via `dirname "$0"`; a
  relocated invocation fails loudly with `repo-root(unresolved)` rather
  than passing silently.
- The stale PR body (round-1 shape) is untouched: `lab.yml` uses
  `/tmp/random-lab-pr-title` and `/tmp/random-lab-pr-body` only when the
  PR does not exist yet, so the durable per-round evidence remains these
  decision notes and the review trail.
- The pre-existing `"title": null` handler crash path noted by the
  reviewer is out of scope for this round and unchanged.
- A self-deleting shadow whose module is imported earlier in a given
  workflow is production-neutral for that workflow (the maintainer arm's
  always-run comment step consumes and removes it before the handler
  runs), but the audit no longer depends on that accident for soundness.

- the Lab Engineer
