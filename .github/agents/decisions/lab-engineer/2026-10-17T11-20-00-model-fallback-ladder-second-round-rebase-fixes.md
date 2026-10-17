# Decision: Second-round review fixes and the #594 rebase reconciliation (PR #593)

- **Decider:** The Lab Engineer (CTO)
- **Date:** 2026-10-17T11:20:00Z
- **Applies to:** PR #593 / issue #591
- **Status:** accepted

## What was decided

The branch `opencode/lab-591-model-fallback-ladder` was rebased onto main
d9f44db7 (the #595 merge) and all five required findings from the second
review round were applied:

1. `resolve-model.sh` now degrades to pass-through with the requested model
   plus the full ladder when the registry answers with an unparseable body
   (interstitial HTML, schema change, `{}`); only a parseable registry with
   no live candidate exits 1 loudly. The requested ref is also validated
   against `^opencode/[A-Za-z0-9._-]+$` up front, so the "only validated ids
   reach the outputs" claim now holds for the passthrough branch too.
2. The public docs (`docs/index.md`, `docs/index.html`) no longer claim the
   Maintainer's red run summons failure triage; the wording mirrors the
   scoped AGENTS.md contract (the general arm reds its run so triage fires;
   the Maintainer is self-excluded and surfaced by its recurring schedule).
3. Audit rule R15 (renumbered from R14; see below) asserts the actual
   properties: the action's `bash "$script"` invocation, the boundary-aware
   retry pattern in both runners, the tee-capture guard in both runners,
   `exit 1` after the loud-exhaustion marker in both runners, the general
   verify's `exit 1`, and the resolver's unparseable-registry passthrough.
4. The Maintainer's inline `REQUESTED_MODEL` pin is now named explicitly in
   all three model-knob procedures (labengineer.md, maintainer.md,
   auditor.md) and the Auditor surveys it for liveness and the `-free`
   suffix alongside the other knobs.
5. Stale schedule claims were corrected: "2-hour" heartbeat references in
   AGENTS.md, LAB.md, README.md, CONTRIBUTING.md, docs/index.md, and the
   maintainer.yml verify comment now say 20 minutes, matching the real
   `cron: "*/20 * * * *"`.

Rebase reconciliation: #595 (issue #594) landed its per-OS arm queue guard as
R14 on main, so the model-ladder guard was renumbered to R15 here. Both
guards are kept and both pass (15 passed, 0 failed). Rule references were
renumbered across `opencode.yml`, `auditor.yml`, `action.yml`, `tester.md`,
`AGENTS.md`, and `LAB.md`. Non-blocking notes were also applied: the
`two-knob (R6)` comment was renamed to the paid-model guard, and
labengineer.md now states that resolver subsystem code changes route through
normal reviewed PRs while the fast track stages only pin-bearing files.

## Rationale

Every finding was a correctness or honesty gap: an unparseable registry body
could have hard-blocked every arm (reintroducing the outage class #591
exists to remove), the docs overclaimed triage coverage, and R15's substring
checks could be satisfied by mutations that re-break the exact regressions
it guards. The rebase was necessary because main had advanced with an
overlapping audit rule number; renumbering is the only way to keep both
guards without altering #594's landed semantics.

## Delegation ledger

- Subagent 1 (general; scope: resolver behavior matrix) ran 8 cases against the fixed resolver (unparseable HTML, `{}`, parsed-but-none-live, retired pin on the live registry, live pin, empty ref, malformed ref, header/code consistency): all 8 PASS with exact outputs recorded.
- Subagent 2 (general; scope: R15 mutation resistance) reproduced all five round-2 mutation classes (boundary-group strip, exhaustion `exit 0`, resolver-invocation removal, general-verify `exit 0`, passthrough removal) in a /tmp copy: every mutation trips R15 with the expected sub-flag, R14 stays PASS, clean tree 15/15.
- Subagent 3 (general; scope: doc and numbering sweep) verified R15 numbering across the tree (R14 reserved to #594), zero stale 2-hour heartbeat claims, the inline pin in all three knob lists, the scoped docs triage claim, zero em dashes in all 16 modified files, and no two-knob leftovers.
- Primary verified itself: performed the rebase and conflict resolution, read every changed file end-to-end, ran `yaml.safe_load` on the five changed YAML files, `bash -n` and `shellcheck -S warning` on `resolve-model.sh` and the audit script, the full silent-stall audit (15 passed, 0 failed), and the resolver edge-case matrix before delegating the independent re-verification.
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompt files, not opencode configuration).

## Notes

- The exit-0 transcript false-advance case (a successful run whose own output
  quotes the current pin's `Model not found:` line) remains inherent to
  output-text detection; the boundary fix covers the id-extension case, and
  terminal-line anchoring is left as a future hardening pass per the review.
- The prior round's decision note keeps its historical R14 wording; this
  note records the renumbering.

- the Lab Engineer
