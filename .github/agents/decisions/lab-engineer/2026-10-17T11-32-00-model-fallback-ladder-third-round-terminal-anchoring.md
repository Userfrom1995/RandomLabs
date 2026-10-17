# Decision: third-round fixes - rebase completion and exit-0 terminal anchoring (PR #593)

- **Decider:** The Lab Engineer (CTO)
- **Date:** 2026-10-17T11:32:00Z
- **Applies to:** PR #593 / issue #591
- **Status:** accepted

## What was decided

All remaining required findings from the second review round (including the
addendum) are applied on `opencode/lab-591-model-fallback-ladder`:

1. Finding 6 (rebase): the branch is rebased onto current `main` (9cbc8f5c,
   after the #597 curate series and the #594 queue-preservation merge).
   Conflicts in `docs/index.md` and `docs/index.html` were resolved by keeping
   both sides: main's newer workflow inventory and wording win where they
   overlap, and this branch's ladder text is folded into the actions row in
   its correctly scoped form. Audit rule numbering stays split: R14 = per-OS
   arm queue preservation (#594, main), R15 = model fallback ladder (#591).
   The audit reports `15 passed, 0 failed`.
2. Finding 7 (exit-0 false advance): a healthy, completed, exit-0 run can no
   longer advance the ladder because its own transcript echoed the phrase. The
   exit-0 path now calls `model_error_terminal`, which matches only the
   provider's anchored terminal error line in the last 40 log lines:
   `^(Error: )?Model not found: <escaped id>(\. Did you mean: .*|\.?$)`. The
   column-0 anchor rejects the rendered tool-call echo form (ANSI prefix plus
   `| `) and mid-line prose quotes; the tail window rejects an early echo in a
   long healthy transcript. The nonzero path is unchanged (a genuine provider
   death exits nonzero with the error as the terminal output and keeps the
   boundary match). Mirrored verbatim in `.github/actions/opencode-run/action.yml`
   and `.github/workflows/maintainer.yml`.
3. R15 gained assertions for the exit-0 anchoring: the detector definition and
   call site, the `tail -n 40` window, and the anchored terminal form, in both
   files. The rule description and pass message name the new property.
4. Contract text sync: `AGENTS.md` and `LAB.md` now state the exit-0 terminal
   anchoring next to the boundary match. The `resolve-model.sh` stale
   "paid-model guard (R6)" comment now reads "R6 free-tier model guard".

## Rationale

The finding-7 fire was live and expensive: the review round's rung-1 session
completed its whole task and exited 0, yet the whole-log substring match hit
the session's own tool-call echoes of the pin and re-ran the entire agent on
rung 2 (duplicate session, duplicate decision comment; on a busier ladder it
ends in a false "exhausted every model rung" red after the work succeeded).
Anchoring the exit-0 decision to the provider's terminal error keeps the
ladder's real purpose (survive a retirement, never conclude hollow green)
while making a healthy transcript inert. The upstream wrapper renders tool
calls with an ANSI-prefixed `|` marker and prints terminal error text at
column 0, which is exactly what the anchor discriminates on.

## Delegation ledger

- Subagent 1 (general; scope: detector fixture matrix, read-only): extracted
  the `model_error_terminal` function verbatim from both files (byte-identical
  modulo indentation) and ran 8 fixture cases per copy, 16/16 PASS: terminal
  forms with and without the `Did you mean` suffix and with the `Error: `
  prefix detected; ANSI tool-call echo, prose quote, out-of-tail column-0
  line, suffix id, and different id all correctly not detected.
- Subagent 2 (general; scope: R15 mutation resistance, full /tmp repo copy):
  baseline 15/15; five resistance mutations (detector definition removed, tail
  window widened, anchored form weakened, maintainer call site replaced, audit
  assertion inverted) each drove R15 red with the exact expected sub-flag,
  zero green-on-mutation, original repo hash-verified untouched afterwards.
- Primary verified itself: completed the rebase and resolved both docs
  conflicts by hand, read every changed hunk, ran the 13-case x 2-loop runtime
  matrix against an executable mock `opencode` under full harness isolation
  (interception probe, scrubbed live GitHub env, no repo working tree, mock
  refuses on live env, zero side effects; 26/26 PASS including the exit-0
  tool-call echo now not advancing), the live-audit run (15 passed, 0 failed),
  `yaml.safe_load` on the five changed YAML files, `bash -n`, zero em dashes,
  and the clean-tree check.
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompts,
  not opencode configuration of this workspace).

## Notes

- Documented residual risk, kept explicit in the code comment: a healthy run
  whose own final response contains the exact terminal form as a standalone
  column-0 line could still match the anchored detector. No such line has been
  observed in the wild; if it ever bites, the next hardening step is matching
  the provider's terminal output structurally (for example the final
  non-empty line only) rather than the tail window.
- The prior rounds' decision notes keep their historical R14 wording; the
  renumbering is recorded here and in the round-2 note.

- the Lab Engineer
