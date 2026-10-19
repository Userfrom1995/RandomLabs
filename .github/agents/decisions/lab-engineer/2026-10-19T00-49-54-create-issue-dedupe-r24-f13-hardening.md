# R24 hardening round 8: whole-handler-block pin (F13/F14/F15) plus the F16 print fix

Round-7 review of PR #670 (issue #668) filed three blocking test-integrity
escapes against audit rule R24 plus one minor print bug and two docs nits.
This round closes all six. The shipped handler is byte-identical to HEAD
(md5 `09f5118e2691d8ccad4ce33fc4da7c19`, `git diff HEAD` empty).

## Findings addressed

- **F13 (blocking):** the create path (`r = subprocess.run(["gh", "issue",
  "create", ...]`) was unpinned; a blank-line-keyed gate inserted before it
  silently dropped every create whose body carried a paragraph break.
- **F14 (blocking):** a decoy two-line `for d in decisions:` loop inserted
  before the real loop head truncated the old setup-prefix extraction at
  the decoy, evading the eleven-line preamble window; a `recover`-first
  tick then filed duplicates with zero queries.
- **F15 (blocking):** an alias of the run-local index cleared by a
  conditional in the post-create-branch region defeated every lexical
  structural pin (bare assignments, dotted attribute uses,
  subscript/delete forms) and re-created an in-run duplicate.
- **F16 (minor):** backticked fragments in the R24 check description
  executed as command substitution, printing two `syntax error: unexpected
  end of file` lines on every audit run.
- **Docs nits:** `maintainer.md` said "punctuation to spaces" (the real
  normalization collapses non-alphanumerics) and lacked the R24 label.

## What changed

1. **Whole-block exact-text pin** (`.github/scripts/silent-stall-audit.sh`,
   token `maintainer.yml(handler-block-changed)`): the entire extracted
   handler block (the unique "Run /oc triggers as owner" step's run block,
   which is exactly the Python heredoc from `python3 - <<'PY'` through the
   trailing `PY`) is compared against a canonical 296-line blank-line-free
   expected text held in a `R24FULL` heredoc. Deviation from the review
   prescription, stated deliberately: the comparison is RAW (indentation
   compared too), not trimmed. Raw with only blank lines dropped is
   strictly stronger: it also rejects indentation-only mutations, which
   the trimmed sub-region pins structurally cannot see, and the F12
   precedent already accepted this audit coupling for the loader body and
   the preamble window. The old setup-prefix machinery
   (`setup-prefix-changed`, the trimmed prefix comparison) is superseded
   and removed; the sub-region pins stay for diagnostics.
2. **Loop-head count pin** (`maintainer.yml(loop-head-count:N)`, exactly
   1): an exact-form `for d in decisions:` line must occur exactly once in
   the block, rejected by name so the F14 shape cannot hide behind a decoy.
3. **Behavioral defense-in-depth scenarios s31-s36** (with decision
   fixtures, list fixtures 748-753, and per-scenario assertions): s31
   recover-first leading skip; s32/s33/s34 create-path paragraph-break,
   absent, and short bodies against unmatched lists (the create must
   happen); s35 a posted comment before a fresh create (the `posted` gate
   at the create path, stronger than the prescribed matching-create
   placement); s36 `[create, lab, create-identical]` asserting exactly one
   create, one triage, and the in-run skip print.
4. **F16 fix:** the two backticked fragments were replaced with
   single-quoted forms. Before: 2 `syntax error` lines in the audit
   output. After: 0 (control audit rc 0, 24/0).
5. **Contract text sync:** the R24 comment block (whole-block rationale),
   the R24 PASS text (whole-block pin, loop-head count, s31-s36, F16 fix),
   and the residual (F2/F4-F15 plus the F16 print fix, the 283-char
   create-path body envelope, recover-first listed).
6. **Docs sync:** `AGENTS.md` create-issue dedupe bullet, `LAB.md` R24
   Maintainer section, `.github/agents/maintainer.md` wording plus the
   R24 label.

## Verification ledger (this session, after all edits)

- `bash -n` on the audit script: OK. Control audit:
  `24 passed, 0 failed`, rc 0, zero `syntax error` lines (the F16
  before/after witness).
- Mutation harness `/tmp/opencode/r24-mut-harness.sh` (final tree, 8/8
  expected outcomes): pristine PASS; f13/f14/f15 structural FAIL
  (`handler-block-changed` plus `functional-s32`, `loop-head-count:2` plus
  `functional-s31`, `functional-s36` respectively); f13/f14/f15 with the
  block-comparison line neutered (`: # pin-neutered`) still FAIL via the
  functional tokens, proving the behavioral layer is independent; an
  indentation-only mutation FAILs `handler-block-changed`.
- Handler byte-identity independently re-verified (see V2): md5 and
  `git diff HEAD` empty, extracted block sha256 (blank lines dropped)
  `906956fcf9a8bfa009cf6e54556e88f74d5e01c5160164fbe38734694cbc249f`,
  equal to the `R24FULL` expected text both directions.
- Diff scope: exactly `AGENTS.md`, `LAB.md`, `.github/agents/maintainer.md`,
  `.github/scripts/silent-stall-audit.sh`; zero untracked files; zero
  em dashes in the diff.

## Delegation ledger

- **V1** (general; adversarial escape hunt, 27 copies under
  `/tmp/opencode/subA`): 14+ mutation families; every non-blank edit inside
  the pinned block fails structurally (insertions, replacements,
  indentation, reorder, NBSP), the loop-head pin is independent
  (`loop-head-count:2` with the block pin neutered), and the F13/F14/F15
  behavioral layers are independent of the block pin. Blank and
  whitespace-only added lines stay invisible by design (awk `NF`) and are
  behaviorally inert in Python. No in-block escape found. Out-of-block gap
  hypotheses recorded below.
- **V2** (general; independent test-integrity, `/tmp/opencode/subB`):
  handler byte-identity (md5 at HEAD, working tree, and `git show`),
  diff-scope check, fully independent extraction and NF equality (sha256
  above, both directions), token reality (functional tokens absent in a
  pristine run), scenario sensitivity matrix (six per-target mutations,
  each firing its scenario tokens; no weak scenario), YAML/bash sanity.
  All PASS.
- **V3** (general; docs/hygiene sweep, `/tmp/opencode/subC`): em-dash scan
  (0), F16 proof (4 backticks removed, 0 `syntax error` lines), docs
  consistency matrix over AGENTS.md/LAB.md/maintainer.md plus the audit
  comment block and PASS text (all PASS; the pre-existing F4-F15 vs
  F2/F4-F15 residual-range label variance was noted and left as-is to
  match the established convention), `setup-prefix-changed` confined to
  the historical round-7 decision note, docs proven outside the R24 pins,
  workflow YAML sanity. PASS.
- **Primary (this session):** implemented the whole-block pin, the
  loop-head count, and s31-s36; fixed F16; synced the contract docs; ran
  the control audit and the mutation harness; wrote this record and the PR
  metadata handoff files.
- **Skills:** no skill fits (GitHub Actions lab infrastructure, not
  opencode workspace configuration).

## Known residual / gap hypotheses (out of scope this round)

- R24 pins the handler step's run block only. The step's own metadata
  (`if:`, `env:`) and newly added neighboring steps are outside every
  rule: V1 demonstrated `if: always()` -> `if: success()` (the handler
  would be skipped exactly when its crash-parity purpose matters), a
  `BOT_TOKEN` swap to the owner PAT, and a pre-seeding step all staying
  24/0. Each is a one-line/one-step, maximally review-visible workflow
  diff; extending the pin to the whole step (metadata included) is a
  candidate for a future round if the Reviewer wants it.
- The expected text lives in the audit script beside the checker, so a PR
  editing both handler and audit passes the in-tree audit; unchanged from
  prior rounds, and exactly what the review gate exists for.

- the Lab Engineer
