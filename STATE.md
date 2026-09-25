# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T00:52Z (maintainer run 36079484469, PR #413 19065d0 review dispatched + PR #419 54854 review dispatched + PR #412 e3486 fix dispatched, Lab in_progress 36078419561, main f1412e9 LIVE Deploy 36079482789 success)**
 - **PR #413 TRUNCATED:** branch `opencode/issue387-20260924212038` head is `19065d0b` (7 commits behind pushed `d7b66be3` which is preserved as tag `recover/413`). `19065d0` is ancestor of `d7b66be` (git log 19065..d7b66 = 7 commits: ledger, README/man integration, G3/G4 tests, bounded wait, help termination, black-box contract, platform tests). `git merge-base origin/main 19065d0 == 90a24916` non-orphan. tor-cli 36079264599 at 19065 is now 6/6 SUCCESS (windows SUCCESS, vs d7b66be 36073895504 windows FAILURE). Research blocking from 36066468588 still open (GUI H1-H6 absent, M2/M3/M4 bare codes at research.md:18/247, 15.x cross-refs). Phase 1 at 19065 is partial (diag/probe/doctor/platform_compat present, but ledger/G3/G4/phase-close at d7b66 missing).
 - **INFRA HAZARD:** `opencode-review.yml:145-158` revert of PR #412 (`9842ba14` -> `e3486e26`) still pending hardening via Lab `36078419561` in_progress on #70 (compare local HEAD before/after, never push on remote drift). `9842ba14` fetchable, 28 ahead / 1 behind f1412e9 (merge_base d25e1e70), tag `recover/413` for PR413 exists. No `workflows permission` rejection, no CreditsError.
 - **Deploy STILL GREEN:** `origin/main` = `f1412e9bc71c6aab7dace85da51b488728e8d6bc` verified via `git ls-remote origin/main` == f1412e9 and `gh api refs/heads/main` == f1412e9. `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, 16 workflow `model:` pins `mimo-v2.6-flash-free`. Deploy 36079482789 success on f1412e9, PR-preview branch successes confirm staging.

## STANDING OWNER DIRECTIVES (active)
 - **GUI HANG DIRECTIVE (2026-09-24T21:34:25Z, via #387):** Owner reports GUI hang, requires robust GUI support. Must investigate, keep Linux parity. Still missing from research doc at 19065.
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00Z, via #387):** Research Tor/proxy CLI improvements - landed as PR #413 Parts II (423 lines at 2eb8f98) + Architect six phases, Phase 1 truncated.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387):** Every project must have browsable site at `/<project>/index.html`. Curator PR #412 Fixes #411 at 9842ba14 (reverted, fix dispatched).
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70):** RESOLVED at f1412e9. Two-knob switch verified.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397):** Enforce Unified Documentation Invariant - codified.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** M1-M5 MERGED Refs #387, Lab CI+repairs MERGED, v2+GUI research+architect in PR #413.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live.

## CRITICAL INFRASTRUCTURE STATE
 - **Main f1412e9 LIVE:** `git ls-remote` == f1412e9, `gh api refs/heads/main` == f1412e9, `maintainer.yml` workflows 18/18 PASS, `opencode.json` two-knob free, `pages.yml` Prune dangling live + escaping strip on branch 54854 pending review.
 - **Review workflow hazard:** `opencode-review.yml` restore step equates remote-head drift with reviewer dirtiness; hardened via Lab on #70 (compare `git rev-parse HEAD` before/after or fail loudly, never push back on drift alone). No `workflows permission` rejection, no CreditsError. Lab 36078419561 in_progress.
 - **Trigger-list 18/18 PASS:** maintainer.yml workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli] - live 20 (18 relevant + maintainer + Dependency Graph).
 - **Architect branch:** `opencode/issue387-20260924215528-architect` at 68250386 2 commits, `progress/387-tor-cli.md` six phases.
 - **PR413 truncated:** tag `recover/413` == d7b66be3 preserves 7 Phase-1 commits lost from branch; current head 19065 is green CI but incomplete research + partial Phase 1.

## IN FLIGHT
 - **Research+Phase1 PR #413 OPEN head 19065d0b MERGEABLE CLEAN review dispatched this run 36079484469:** `opencode/issue387-20260924212038` 7 commits (vs d7b66 14 commits). Review dispatched at 19065d0 to gate GUI/M2/cross-ref + truncated scope before Builder continues. tor-cli 36079264599 SUCCESS 6/6 on 19065, Deploy success on head. Lab 36078419561 still in_progress for review.yml, no duplicate. Next after review: Fixer/Builder to add GUI addendum + M2/cross-ref + re-apply ledger/G3/G4 from d7b66.
 - **Curator PR #412 REVERTED e3486e26 fix dispatched this run:** `opencode/issue411-curate-tor-cli-site` remote head `e3486e2694366ab6a28a65b2795bfba896eb7b99` (reverted from `9842ba14` by review run 36072452033). `9842ba14` fetchable. Fix dispatched to re-apply 3 blocking +1 major + minors on live head with Refs #411 (not infra, so fix allowed). Lab 36078419561 in_progress for review.yml hazard, recover attempts declined on OPEN.
 - **Lab pages hardening PR #419 OPEN head 54854770 MERGEABLE CLEAN review dispatched this run:** `opencode/lab-417-pages-symlink-boundary` (41+ lines pages.yml escaping strip + idempotent second pass for directory cycles). Review dispatched; if approved will be tested hostile fixture then merged Closes #417. No `fix`/`continue` ever on infra PRs; review is read-only gate.
 - **Lab infra hardening for review.yml:** `{"action":"lab","issue":70}` in_progress 36078419561 to fix `opencode-review.yml:145-158`. No duplicate this run per cooldown.
 - **Deploy on main f1412e9 VERIFIED GREEN:** 36079482789 success 00:52:00Z. Prior dangling outage resolved.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED Refs #387 -> Lab prompt-alignment MERGED d25e1e70 -> PR #416 MERGED f1412e9 Closes #415 Deploy green -> PR #412 at 9842ba14 reverted to e3486 by review workflow hazard -> Fix dispatched this run + Lab hardening in_progress 36078419561 -> PR #419 review dispatched this run -> PR #413 truncated to 19065 (green CI) review dispatched this run -> after review, Builder must restore Phase1 completeness from d7b66 tag + fix research GUI/M2/cross-ref, then Tester/Evaluator -> merges.

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #413 at 19065d0: on `/oc approve` -> chain Builder `continue` to restore Phase1 ledger from d7b66 tag + fix GUI/M2/cross-ref; on `/oc fix`/`continue` -> route to Builder/Fixer immediately. Verify `git ls-remote origin opencode/issue387-20260924212038` == 19065d0, `gh api compare 90a24916...19065d0` non-orphan, `gh api contents/progress/387-tor-cli.md?ref=19065d0` Phase1 in_progress.
 2. Watch Reviewer on PR #419 at 54854770: on `/oc approve` -> dispatch Tester hostile fixture (escaping symlink to .git/config + dangling + loop), on `/oc fix` -> route to Lab (infra). Cooldown 30m holds; verify `gh api contents/.github/workflows/pages.yml?ref=54854` has escaping strip step, trigger-list 18/18.
 3. Watch Fixer on PR #412 at e3486e2: verify `gh pr view 412 --json headRefOid` advances beyond e3486, `git ls-remote origin opencode/issue411-curate-tor-cli-site` != e3486, then dispatch Reviewer on new head. Fix must clear 3 blocking (fuzz corruption prism:599, bench-x PATH prism:701, bench_vs_codecs Pillow/dangling prism:702, Windows $SHELL tor-cli:624/778) with Refs #411.
 4. Watch Lab 36078419561 on #70: verify diff touches `opencode-review.yml:145-158` restore step now compares local HEAD before/after or drops force-push; no `workflows permission` rejection; trigger-list stays 18/18. No duplicate lab this run.
 5. Cooldown: no second dispatch for same workflow+branch within 30m while in_progress/pending.

## ISSUES
 - **#413** - OPEN PR Phase 1 Diagnostics (Refs #387, head 19065d0b review dispatched 00:52Z, truncated from d7b66be recover/413 tag, tor-cli SUCCESS, GUI/M2/cross-ref still blocking)
 - **#412** - OPEN PR curate: tor-cli + Prism sites (Fixes #411, head e3486e26 REVERTED, fix dispatched 00:52Z to re-apply 9842ba14 fixes, 3 blocking +1 major pending)
 - **#411** - OPEN [Curator] Build tor-cli and Prism sites + every-project-site rule (PR #412 Fixes, fix in_progress)
 - **#419** - OPEN PR lab: strip escaping symlinks (Closes #417, head 54854770 MERGEABLE CLEAN review dispatched 00:52Z)
 - **#417** - OPEN [Infra] Harden Pages staging against escaping symlink exfiltration (PR #419)
 - **#70** - OPEN lab-health (Deploy green 36079482789, review.yml hazard Lab in_progress 36078419561)
 - **#42** - OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer at 19065d0 re-issue the 3 blocking research findings (GUI H1-H6, M2 codes, 15.x cross-refs) plus flag the 7-commit truncation (ledger/G3/G4/phase-close missing) so Builder knows to restore from recover/413?
 - Will Fixer on e3486e2 correctly re-apply the 3 blocking +1 major fixes originally at 9842ba14 without re-introducing the revert, and will review.yml hazard fix prevent a second revert?
 - Will Lab's opencode-review.yml fix (local HEAD compare vs remote drift) land without breaking trigger-list 18/18 or re-triggering the 9842 revert?

   - Hephaestus, the Maintainer
