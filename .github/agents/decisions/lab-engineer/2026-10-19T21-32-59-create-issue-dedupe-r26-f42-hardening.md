# R26 evidence-ledger correction (round 22): F42 handler hash and F43 precision cleanup

Round-22: the Reviewer's verdict on PR #670 (head `d321f1e0`) found
F42: the round-20/21 decision notes identified the production handler by a
double-dedented extraction, so their recorded run-block hash and byte count
did not correspond to the step that executes. The handler itself was
verified correct and untouched. F43 asked for three precision cleanups in
the R26 contract comments. This round changes no behavior: two decision
notes and three comment strings only.

## Findings addressed

- **F42 (blocking, reviewer):** the F40 note
  (`2026-10-19T20-28-34-create-issue-dedupe-r26-f40-hardening.md:17-18`
  and `:109-111`) and the F41 note
  (`2026-10-19T21-17-09-create-issue-dedupe-r26-f41-hardening.md:15-16`
  and `:104-105`) now report the actual executing step run block:
  14,624 bytes / md5 `5c52d8239c31e16e97483d70f4470091`, extracted as the
  PyYAML `run` value of the unique `Run /oc triggers as owner` step. The
  audit's canonical pinned rendering (blank lines dropped) is recorded as
  14,606 bytes / md5 `6df27e3fbcfdbef18b154f8c76ef415d`. The old
  `30824dca...` / 13,725-byte figure is named as the wrong artifact, with
  its root cause: the "(dedent 10 spaces plus trailing newline)"
  parenthetical was applied on top of the already-unindented YAML value,
  deleting 10 characters from every indented Python line.
- **F43 (advisory, precision):** in `.github/scripts/silent-stall-audit.sh`
  the effective-env comment now states the pinned step env key set as
  `{GH_TOKEN, BOT_TOKEN, PATH}` (it had listed only the two tokens while
  the F41 pin also requires PATH); the two stale "pathoutside" mentions at
  the contract comment and the extractor handoff comment now name the
  executed `outside` scenario; and the R26 PASS-text residual range now
  reads "F2/F4-F41 plus the F16 print fix", matching `AGENTS.md:76` and
  `LAB.md:499`.

## Verification

- Extracted the handler step run block from the YAML value and reproduced
  the Reviewer's figures exactly: raw 14,624 bytes /
  `5c52d8239c31e16e97483d70f4470091`; blank-line-dropped canonical
  14,606 bytes / `6df27e3fbcfdbef18b154f8c76ef415d`.
- Whole-file `maintainer.yml` md5 `535bf74533e12288c095654a793d24e5`
  (unchanged; the branch delta for the workflow is still only the F41 env
  line), so the handler remains byte-identical.
- Full audit on the changed tree:
  `bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml`
  -> `26 passed, 0 failed`, rc 0. `bash -n` on the audit script OK.
- Grep sweep: no remaining `30824dca`, `13,725`, `pathoutside`, or
  "F4-F40 plus" reference outside the explicit corrections.
- `git status --porcelain` shows only the three intended files (two notes
  and the audit script); no untracked files.

## Delegation ledger

The fix was fully prescribed by the review, spans three files with no
independent research, no behavior change, and a single verification
command, so the delegation threshold was not met; everything below was
executed directly by the primary: handler extraction and hash
reproduction, note edits, comment edits, `bash -n`, the full 26-rule
audit, the stale-reference grep sweep, and the clean-tree check.

## Skills

No skill fits: this is GitHub Actions lab infrastructure review follow-up,
not opencode workspace configuration.

## Residual

Unchanged from round 21: the R26 residual list remains the
fingerprinting and above-envelope classes named in the PASS text, and the
one-level indirection limits named there. No handler behavior changed in
this round.
