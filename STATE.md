# STATE - Random factory checkpoint
 - **Updated: 2026-10-01T22:30Z (maintainer issue_comment run 36935234979, owner /oc review + /oc maintainer on PR #506, standby - re-review already queued)**

## PRs & Issues
 - **PRs:** Open: #506 Phase 2 Procedural Cast (head 0f9a2fe1 on `opencode/issue504-20261001220609`, Refs #504, re-review pending run 36935234823 after Fixer landed all 7 blocks), #508 Curator sync (head 54202cdb on `opencode/issue507-curate-sync-pet-platform-refs`, Fixes #507, review queued run 36935318859). Closed/merged: #505 Phase 1 Platform (merged 22:04:19Z with Refs #504, approve-eval 9.86/10 on head 3b55fcf5), #503 Final Phase (merged 20:23:21Z with Closes #498, approve-eval 9.96/10), #502 Phase 4, #501 Phase 3, #500 Phase 2, #499 Phase 1.
 - **Issues:** Open: #504 Desktop Pet Platform (triaged, Architect epic LANDED in progress/504-desktop-pet-platform.md, Phase 1 merged as #505 Refs, Phase 2 PR #506 in re-review flight), #507 Curator stale-refs tracker (triaged, linked PR #508 in review flight), #70 lab-health, #42 brainstorm standing. Closed: #498 Desktop Pet (closed 20:23:34Z on #503 merge - full 5-phase epic shipped).
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing PASS (18-entry allowlist vs 19 live workflow `name:` fields excl self `maintainer`, exact match; no drift - verified this run).
 - **Desktop Pet final record:** Phase 1 (core+brain) + Phase 2 (window+animation) + Phase 3 (interaction+play) + Phase 4 (settings+platform) + Final (hub showcase, packaging, end-to-end audit) all merged. Final head 6a752e7e cleared re-review approve + re-approve-test + Evaluator approve-eval 9.96/10. 249 tests green, fail-closed packaging, 7-activity hub.
 - **Desktop Pet Platform record:** Phase 1 (Catalog Core and Character Engine) merged as #505 head 3b55fcf5 (six originals Pip/Bramble/Mochi/Kiki/Rusty/Luna, trait tables, schema v2 with v1 migration, trait-parameterised brain, per-character voices, characters CLI, 298-test suite). Remaining: Phase 2 Procedural Cast (PR #506 in re-review after Fixer repair), Phase 3 Living Behaviors, Phase 4 Tray/Service Shell, Phase 5 Packs/Picker/Installers, Final Hub plus Native Matrix (Closes #504 only after 3-OS native plus eval gates).

## IN FLIGHT
 - Phase 2 re-review on PR #506 fixed head 0f9a2fe1 (owner /oc review summoned opencode-review run 36935234823, pending at survey; maintainer stands down per duplicate-trigger rule).
 - Curator review on PR #508 (owner /oc review summoned opencode-review run 36935318859, queued at survey, plus curator pending 36935318666).
 - Main tip 6055f54f (post-#505 merge; prior 9e1bf241).
 - Carried non-blocking notes for future docs/UI passes: Evaluator visual nits from #498 Phase 1/2 (docs/index.html missing top lede, card h4 heading skip, no sprite showcase on hub, theoretical unguarded float() on toolkit-sourced paths, .bak sidecar under --no-save); fragile seed-3 assertion (`9999.0 dt` expecting `[]`, suggest `len <= 1`); Phase 1 visual nits (table mobile scroll wrapper, README/hub matrix row drift); Phase 3 progress-file bold-marker nit (doubled `\*\*\*\*` in Phase 4 header); Phase 3 Evaluator visual nit (pet/docs/index.html missing the Play-layer bullet that index.md has); Phase 4 Reviewer nit (Linux `Exec=` unquoted if python path has spaces); Phase 4 Evaluator nits (docs HTML missing top lede pet/docs/index.html:32-34, 150-word wall paragraph docs/index.html:44, stackable settings dialog no transient()/Escape guard window.py:329, display-only settings after corruption prints notice but does not persist repair settings.py:265-288); Phase 4 re-review nits (OverflowError gap on giant JSON ints in _clean_hour/_clock_parts float() guards, Linux Exec= quoting, settings-corrupt notice print-only vs save-corrupt bubble); Phase 4 final-eval polish (docs HTML lede/merged paragraphs/stale bullet, settings dialog non-modal/no-Escape/multi-instance, format_clock non-numeric raise unreachable via validated paths); Phase 4 Final first-review non-blocking note (controller.py:437-438 comment says "opens the dialog first" while window.py:306-309 returns after open_settings_dialog without emitting summary - comment wording only, behavior real on both paths). All resolved or superseded by the Final approve-eval except where carried above for opportunistic future passes. #505 Phase 1 Evaluator repair nits carried for Phase 2 (README count 290 vs 298 after tester added 8, hub quickstart omits characters line, no noscript fallback).
 - **WATCH ITEM (carried):** branch `opencode/tor-cli-fixes` @ 43d37b5 (bot Builder commit, #436 CLOSED). No open PR, no open tracker, no re-push this run. Age accrues toward the 3-day bot-work evaluation trigger.
 - No new failure/timed_out runs to triage (sweep: zero failure/timed_out; only pending/queued reviews + skipped/cancelled maintainer workflow_run arms + expected skips + successes).
 - UNTRIAGED sweep: clear after this run (#504 triaged with linked PR #506 in re-review flight; #507 triaged with linked PR #508 in review flight; only standing #70 + #42 otherwise).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (d905397) still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run.
2. Check Reviewer re-review verdict on #506 head 0f9a2fe1 (approved -> Tester with 3-OS per-OS coverage; findings -> Fixer, dedupe on `/oc review (head <sha>)` comments) and Reviewer verdict on #508.
3. Verify pages.yml deploy health for the #505 merge (post-merge deploy watch; push-trigger gap history).
4. Re-check `opencode/tor-cli-fixes`: PR opened? CI green on re-push? Age since 43d37b5.
5. Standing rule unchanged: standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Will the Reviewer approve Phase 2 fixed head 0f9a2fe1 (hot-swap morph repair, sprite robustness, docs + picker CSS)?
 - Will the Reviewer approve Curator PR #508 (stale #498 refs to #504)?
 - Will the `Refs #504` trailer hold until the final verified phase?
 - Will pages.yml deploy fire for bot-merged main pushes (push-trigger gap history)?
 - Will `opencode/tor-cli-fixes` gain a PR, or is it owner-local WIP? Who owns the pushing session (committer Userfrom1995, author The Builder)?
 - Which step emits the write-permissions note (repeats on #506/#508 PR-open runs, same as #505/#503/#502/#501/#500/#499 lineage), and does it need a lab fix? Zero production impact observed; watch next PR-open run. No lab escalation.
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

 - Hephaestus, the Maintainer