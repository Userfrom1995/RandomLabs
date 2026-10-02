# STATE - Random factory checkpoint
 - **Updated: 2026-10-02T13:18Z (maintainer run 37012025806, /oc maintainer on PR #514, Builder in flight, STAND DOWN)**

## PRs & Issues
 - **PRs:** Open: #514 (Architect release-track blueprint, docs-only, head e3776d74, MERGEABLE/CLEAN, body Closes #504 treated as Refs; Builder run pending). Closed/merged: #513 service-switch fix, #512 Final Phase, #511 Phase 5, #510 Phase 4, #509 Phase 3, #506 Phase 2, #508 Curator sync, #505 Phase 1, #503 Final, #502 Phase 4, #501 Phase 3, #500 Phase 2, #499 Phase 1.
 - **Issues:** Open: #504 Desktop Pet Platform (triaged, all 6 phases + #513 fix merged as 9a9cb487, Linux native PASS on fixed code, Windows retry due after ~13:21Z cooldown, release-track blueprint #514 in build; close only on clean Windows pass PLUS published-artifact track shipped/tested/evaluated), #70 lab-health, #42 brainstorm standing. Closed: #507, #498.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing PASS (18-entry allowlist in maintainer.yml `workflows:` vs 18 live non-self workflow `name:` fields, exact match this run; no drift).
 - **Desktop Pet Platform record:** Phase 1 merged as #505 head 3b55fcf5. Phase 2 merged as #506 head be349195. Phase 3 merged as #509 head efcf9d39. Phase 4 merged as #510 head 8d8dd1b3 (approve-eval 9.9/10). Phase 5 merged as #511 head 0b6f2184 -> main 1a0d1ecb (approve-eval 9.8/10; 523 selftest green). Final Phase merged as #512 -> main b51b5d9e (approve-eval 9.84/10; 546 green). Service-switch fix merged as #513 -> main 9a9cb487 (review approve + Tester approve-test 551 green + Evaluator approve-eval 9.9/10). Remaining: Windows native pass against fixed code, plus the NEW published-release track (#514 blueprint -> Builder implementation in flight).
 - **Curator 2026-10-02:** schedule successes 04:37Z + 12:04Z, no new issues opened. Pages green on main (Deploy successes 12:46:28Z covering 9a9cb487, 13:17:34Z; preview live for #514).
 - **Per-OS status (this run):** Linux PASS on 9a9cb487 stands (run 37008721908). Windows run 37008723510 FAILED 12:51:00Z at setup (`Failed to fetch version information` in opencode install; agent never started; no verdict) - retry due only after ~13:21Z cooldown, NOT this run. Triage arms 37009204014 (success) + 37009205189 (skipped) completed without re-dispatching - no duplicates outstanding. Pre-fix Windows run 37005424980 CANCELLED with no verdict (cause undetermined). Run 37011991292 (`pull_request` maintainer on #514) is the expected actor-write-gate clean skip on a bot-authored PR, not a crash.
 - **Published-packages track (in flight):** Architect blueprint landed as PR #514 (Refs #504): single-source version from `pet/__init__.py`, Linux rpm recipe, native `pet-release.yml` pipeline, per-OS smoke scripts, hub Downloads section with checksums plus honest unsigned-binary notes. Builder session pending on the #514 branch (owner `/oc build this` 13:17:18Z).

## IN FLIGHT
 - #514 Builder track: release implementation on branch opencode/issue504-20261002131504 (release CI, rpm recipe, smoke scripts, hub matrix). After landing -> review -> test (3 OS) -> eval, all with Refs #504.
 - #504 Windows verification: retry test-windows on #504 only after ~13:21Z cooldown (dedupe first - no runs in flight, triage arms done). Clean Windows pass is necessary but NO LONGER sufficient alone to close #504; genuine product findings route to fix (app) or lab (infra).
 - #504 stays OPEN: PR #513 and PR #514 bodies say Closes #504 - treated as Refs #504 throughout; close only on clean Windows native pass PLUS published-artifact track shipped through review + test + eval.
 - Main tip 9a9cb487 (PR branches kept intact per no-delete-branch rule).
 - Pages health: green (13:17:34Z Deploy success post-#514-preview); standing watch only, plus hub download-matrix extension expected from the release track.
 - Carried non-blocking notes for the platform: Evaluator service.py:466-468 dead load_notice branch nit on #513 (follow-up cleanup); Evaluator visual nits on #512 (pre-existing stray `</main>` at pet/index.html:691 outside the diff, docs page prose detail instead of matrix table, fixed-pixel canvas without max-width:100%, no focus-visible style; Mochi 150s antic undocumented but not misclaimed); Evaluator visual nits (empty no-JS caption, issue-number links on hub, docs-page responsive parity); residual GUI-only window.launch persist and enshrined service-fallback divergence; re-reviewer service.switch_character fallback semantics note (intentional, test-enshrined); reviewer one Phase 4 nit (run_loop `tick_sec` param holding a Hz value - behavior correct, 10 Hz); Evaluator non-blocking notes from #509 (unused LifeEvents._rng field, shared single-key deflection bag vs per-character docstring claim, one comment overstates hunger/mood ordering); Evaluator inf-phase isfinite-guard follow-up from #506; pet/index.html:219 stale-498 follow-up curator pass; plus earlier #498 lineage (docs/index.html missing top lede, card h4 heading skip, no sprite showcase on hub, theoretical unguarded float() on toolkit-sourced paths, .bak sidecar under --no-save; fragile seed-3 assertion; Phase 1 table mobile scroll wrapper, README/hub matrix row drift; Phase 3 progress-file bold-marker nit; Phase 3 Evaluator visual nit pet/docs/index.html missing Play-layer bullet; Phase 4 settings dialog no transient()/Escape guard, display-only settings after corruption prints notice but does not persist repair; Final controller.py:437-438 comment wording). #505 Phase 1 Evaluator repair nits carried (README count drift after tester additions, hub quickstart omits characters line, no noscript fallback).
 - **WATCH ITEM (carried):** branch `opencode/tor-cli-fixes` @ 43d37b5 (bot Builder commit, #436 CLOSED). No open PR, no open tracker, no re-push this run. Age accrues toward the 3-day bot-work evaluation trigger.
 - UNTRIAGED sweep: clear (#504 triaged with #514 in build + Windows retry pending; only standing #70 + #42 otherwise).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (d905397) still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run.
2. After ~13:21Z: retry test-windows on #504 (dedupe first - confirm no run in flight, triage arms already done). Clean means one gate down; findings route to fix (app) or lab (infra); a further consecutive install-fetch flake retries once more, then routes to lab (runner/install mitigation), not endless retries.
3. Check Builder landing on #514 -> review -> test (3 OS) -> eval, all Refs #504 (workflows belong to Lab Engineer; Builder routes the split if infra is needed).
4. Close #504 only after clean Windows native pass PLUS published-artifact track shipped through review + test (3 OS) + eval.
5. Re-check `opencode/tor-cli-fixes`: PR opened? CI green on re-push? Age since 43d37b5.
6. Standing rule unchanged: standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Will the Builder land the release implementation on #514 in one round (release workflow, rpm, smoke scripts, hub matrix)?
 - What shape will the release pipeline take at implementation time (tag-triggered vs manual, signing/notarization stance, Releases vs Pages hosting)?
 - Will the Windows native pass clear on retry (post-fix code 9a9cb487)?
 - What cancelled pre-fix Windows run 37005424980 (owner-cancel, runner preemption, or infra flake)?
 - Will `opencode/tor-cli-fixes` gain a PR, or is it owner-local WIP? Who owns the pushing session (committer Userfrom1995, author The Builder)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

 - Hephaestus, the Maintainer
