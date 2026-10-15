# STATE - Random factory checkpoint
 - **Updated: 2026-10-15 run 38761341259 - #572 fixed head in second review round, stood down (review arm pending)**

## PRs & Issues
 - **PRs:** Open: #572 (Builder remediation for #552: ghost movement, frame clearing, centered layout; head 56eb4d4a after Fixer 3-commit push + rebase on main, MERGEABLE, mergeStateStatus CLEAN, base main; body Refs #552). MERGED: #571 (Curator docs nav hrefs, head 7fdc22f6, merged 03:51:16Z via --rebase, branch kept; Fixes #570), #569, #567, #566, #565, #564, #563, #562, #560, #559, #558, #557, #556, #553, plus earlier. CLOSED (not merged): #555 (superseded), #547.
 - **Issues:** Open: #552 REOPENED by owner 2026-10-15T14:59:57Z (Pac-Man real-terminal defects; remediation PR #572 in gate, Refs only, stays open until approve-eval + merge), #70 lab-health, #42 brainstorm standing. Closed: #570 (via Fixes #570 on merge of #571), #568, #561, plus earlier.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match verified this run, no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - #572 REMEDIATION IN SECOND REVIEW ROUND: owner `/oc review` 15:26:55Z -> Reviewer `/oc fix` findings (binding slow-frame degrade replay + decided staleness + ledger, run 38760410536) -> owner `/oc fix` 15:30:08Z -> Fixer applied all three (3 focused commits, rebased, 304 passed) 15:32:51Z -> owner `/oc review` 15:32:54Z -> opencode-review run 38761341253 pending (per-PR concurrency settles). Decision this run: `[]` (stand down, no duplicate dispatch). Next: Reviewer verdict on head 56eb4d4a -> Tester (+ per-OS runners for size/OS/variant matrix) -> Evaluator (MANDATORY product gate) -> merge only on approve-eval. #552 stays open until then. Rebase-gate note: Fixer rewrote the head (1a8b7557 -> 56eb4d4a), so prior-round signals do not carry; fresh verdict required.
 - Write-permission denial note (watch, not a finding): a `github-actions[bot]` comment on #572 at 15:27:18Z reads "User github-actions[bot] does not have write permissions" linking run 38760362323 (maintainer pull_request-event run, concluded success). Reads as a clean actor-gate/CLI-assert skip on a bot-triggered arm, not a failure (zero failure/timed_out in recent runs). If a second consecutive trigger/comment-step failure of this shape appears, route lab.
 - LAB OVERHAUL SUBSTANTIALLY COMPLETE: Phase 6 instructed run 38463786451 stood down with evidence; verified live in run 38463966490; NO third lab dispatch per anti-loop bar. Future infra needs a fresh scoped order, not a repeat Phase 6.
 - Pages: main tip 89a7e12e (merge of #571); no merges pending. Preview-refs-only wart holds; main deploys are the binding signal.
 - Pages preview wart (watch): PR-branch `pull_request` pages runs keep failing on lab PR refs; if a main deploy fails the same way, route lab immediately.
 - Reviewer non-blocking note (carried, not a finding): PRs #564/#565 say "tracked on #42" but #42 is titled Brainstorm Board; precedent accepts the linkage, no diff impact.
 - Reviewer advisory (carried, from #567): 9-file/3-dir shape sits above the literal delegation section-2 file/dir count, so a future run of this shape may want a 3-line ledger; not blocking.
 - Reviewer advisory (carried, from #571): 2-dir touch literally meets the delegation-ledger threshold but no ledger present; trivial 2-line href swap, not a finding.
 - Infra routing guard stays active: any `.github/agents/` follow-up routes to Lab Engineer via `lab`, never `fix`/`continue`.
 - Main tip: 89a7e12e (merge of #571).
 - Orphan-main protection holds: merge-base with main verified non-empty before merging #571 (common ancestor present, HAS-BASE), as before #569 (acede055).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent.
 - Eval-gate calibration note: surgical infra/docs/test-hardening fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables. #552 remediation is a product deliverable: Evaluator gate is MANDATORY before merge.
 - Eval-crash rule (amended): eval run dying inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown 30 min same-signature). Second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths do not count; one exception per cooldown window max.
 - Duplicate-review note: maintainer + owner near-simultaneous review dispatches settle via per-PR concurrency; stand down when a review arm is pending/in_progress.
 - IP hold (standing): God of War Kratos vs Zeus commission declined twice on binding IP grounds (Sony copyright; waiver does not transfer liability); original mythic-duel alternative (Thor vs Zeus original designs) stands awaiting owner confirmation.
 - Error-dump wart status: 13th recurrence logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction.
 - Comment-post flakiness wart: a `github-actions[bot]` comment on #553 at 12:23:43Z contains a raw GitHub Unicorn error HTML page - single occurrence so far, watch for recurrence, route lab on second consecutive trigger/comment-step failure.
 - Evaluator follow-up VERIFIED live on main: `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path depth bug. Queued as future Builder/test-hardening vehicle.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only. (#42 same: Refs only.)
 - Evaluator non-blocking notes (do not gate, carried): DEC2026 SYNC vs ansi.py DCS form, cumulative event-log growth, PACMAN_RENDERER env unreachable from CLI, `--renderer auto` rejected, combined `--maze-check --self-check` drops self-check, progress tracker duplicated `## Next steps` heading, Kitty X/Y cell convention, unlabeled maze excerpt caption. Plus Phase 2 notes: Elroy stage-2 speed stacking (ghosts.py:264), notify_dots overflow drop (ghosts.py:151), clear-clobbers-dying race (game.py:149), Elroy-2 clock spin (ghosts.py:204). Plus Phase 4 notes: bare `level-clear` falls through while `level:N` plays the jingle at spawn (shell/app.py), `raw is None` EOF branch unreachable, per-frame preview Game on TITLE. Plus Phase 5 notes: `--levels 0` shows help exit 0, score/config writes lack tmp-file plus rename atomicity, `--modes` one-liners and `--levels` header lean jargony. Plus Final Phase advisory nits: non-clickable code-span cross-links, one `--fps up to 240` unit, footer lab voice; plus re-review nit: duplicate ShellState import (verify.py:144 and :172 as _ShellState).

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists; watch for new workflow drift).
2. #572 in second review round on head 56eb4d4a (Refs #552): on Reviewer `/oc approve`, route Tester immediately + per-OS runners for the size/OS/variant matrix; on `/oc approve-test` with no newer `/oc fix`, route Evaluator (mandatory); merge only on `approve-eval`. NEVER close #552 on intermediate Refs PRs. On `/oc fix` findings, route Fixer.
3. Future lab work needs a fresh scoped owner order; do NOT re-dispatch Phase 6 or the overhaul mandate without one.
4. Error-dump wart: overhaul substantially complete; do NOT auto-queue a separate 8th lab mandate without owner direction.
5. Evaluator follow-up (archived bench helper sys.path depth + weak assertion) queued for a future hardening vehicle.
6. Council calibration: advisory Desktop Pet audit still pending.
7. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
8. Watch: comment-post flakiness (Unicorn-HTML wart) plus the 15:27:18Z write-permission denial on #572 - second consecutive occurrence of either routes lab.
9. Watch: main Pages deploys - failure routes lab immediately.
10. Standing rule: standby on all other fronts (no auto-ideate).
11. IP: any new Kratos/God of War order stays declined on binding grounds; original-duel path on confirmation only.

## OPEN QUESTIONS
 - Will #572 pass the Reviewer gate on the fixed head, and will the Tester + per-OS runners confirm the real-terminal fixes (no trails, moving ghosts, centered layout) across sizes/OS/variants?
 - What further defects will the hostile sweep surface beyond the three remediations, and will the Evaluator demand another iteration?
 - After Phase 6 acceptance, is there any residual overhaul scope the owner still wants (or is the mandate closed)?
 - Are the PR-preview pages failures a systematic defect on PR refs or platform blips?
 - Should the lab prompt be hardened so a bare `/oc lab` on an open mandate defaults to executing the mandate instead of standing by?
 - Where does the overhaul epic actually live - should a dedicated vision issue be split off #42?
 - Will the Owner ask for the dormant poolduel sweep workflows to be retired or repointed at archive/poolduel?
 - Was the Pages 500 a one-off platform blip, or the start of an outage window? (Single occurrence 17:14:52Z on 2026-09-29; all deploys since success.)
 - Owner direction on the error-dump wart (escalation posted 2026-10-07; 8th mandate withheld)?
 - Evaluator follow-up hardening vehicle (archived bench helper sys.path depth + weak assertion)?
 - What caused the ~50-min agent-step death in eval run 37362541465?
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping?
 - Opencode verify-step warts: (1) auto-retry counter per-attempt-window vs all-time? (2) branch pattern accepting `opencode/<issue>-*`?
 - What shape will the release pipeline take at publish time going forward?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor)?

 - Hephaestus, the Maintainer