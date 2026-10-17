# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39026435299 - [Post-merge tick] #595 MERGED (d9f44db7) at 10:50:33Z; queue: max live on main and R14 passes 14/14; Pages green; #594 proof mid-flight (macOS arm running, Windows arm pending); every other lane in flight**

## PRs & Issues
 - **PRs:** Open: #599 (Builder docs sweep for #596, head 5551e856, body `Closes #596`; build 39025589665 SUCCESS 10:54:55Z; review lane triggered 10:54:35Z, review run 39026683574 in progress; a peros no-op run for #599 completed all-skipped, harmless), #598 (Curator sync, head 95485bb0, CLEAN; fixer applied all 4 findings and rebased 10:50:22Z; re-review 39026424981 in progress + 39026433492 pending), #593 (lab ladder + loud failure, head c9c3ea14, CONFLICTING with main; second-round review verdict posted 10:47:48Z with findings routed to lab; review run 39025190545 still in progress, its forwarder posts the lab trigger; the lab round must rebase), #592 (macOS vehicle, head 582de170, CLEAN; re-review found 1 blocking Windows-arm probe defect -> `/oc fix` posted 10:52:15Z, fix run 39026542175 in flight; macOS re-verify 39025499533 running). Merge ledger since 2026-10-16: #595 (lab peros queue:max, Refs #594), #590, #589-#583, #581. Full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #597 (closes via #598), #596 (closes via #599 when gates clear), #594 (**stays open until the proof: Windows pending survives the post-fix macOS handoff no-op, then starts**), #591 (closes via #593 + ladder fold), #582 (both native arms in flight on the #592 branch), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. No untriaged issues.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries vs 19 live non-system non-maintainer workflow `name:` fields, exact set match re-verified this run (system: Dependabot Updates, Dependency Graph, pages-build-deployment; self: maintainer). No drift.
 - Main tip: d9f44db7 (#595 merge). #595 body carries `Refs #594` only; #594 stayed OPEN. Branch opencode/lab-594-peros-queue-max left intact at 1988d35c.
 - Held runs: zero action_required. Zombie queued runs unchanged (issue532 + lab-427 branches; ambient, no required check affected).

## IN FLIGHT
 - **#594 PROOF:** Windows arm 39026429150 pending (created 10:50:30Z, three seconds before the merge) behind macOS arm 39025499533 (running since 10:35:56Z, ETA ~10:56Z). Decisive event: the macOS completion handoff posts `/oc maintainer` on #582, queuing a peros no-op run under the POST-fix `queue: max`; the pending Windows arm must survive it (no cancelled zero-job run) and then start. Next run: adjudicate; clean -> close #594 with the evidence and retire the one-arm-per-tick workaround; evicted -> re-dispatch test-windows once and re-prove.
 - **#593 (lab ladder, c9c3ea14, CONFLICTING):** second-round review (verdict 10:47:48Z, run 39025190545 still in progress) found a resolver fail-loud hole + a public-docs overclaim + two guard/precision gaps; routed to lab. The review workflow's "Force lab routing" + "Forward reviewer decision" steps are still pending on its running agent step. If no owner lab trigger appears on #593 by the next tick, dispatch `{"action":"lab","issue":593}`. The round must rebase onto current main (#595 merged over LAB.md/AGENTS.md/silent-stall-audit.sh/opencode.yml/auditor.yml). Lab post-mortem run 39025773224 still in progress on a NEW branch (barred from touching #593 mid-flight).
 - **#592 (macOS vehicle, 582de170):** re-review routed ONE blocking finding (Windows arm of `read_probe_reply`, crates/terminal/src/main.rs:146-178: unbounded blocking stdin read after a WaitForSingleObject wake on non-character console records; corrected code in the review comment) to the Fixer; fix run 39026542175 in flight. macOS re-verify 39025499533 still runs against 582de170; a fixer push moves the head, so the post-fix native arms must re-run sequentially after the fix (test-macos, then test-windows, one per tick until the #594 proof retires the one-arm rule).
 - **#598 (Curator sync, 95485bb0):** `Fixes #597`; re-review 39026424981 in progress (+39026433492 pending). Gates -> merge -> closes #597.
 - **#599 (docs sweep for #596, 5551e856):** build SUCCESS 10:54:55Z; `/oc review` 10:54:35Z; review 39026683574 in progress (+39026701930 pending). Body `Closes #596`. Watch the maze-chase docs overlap with #592/#598 at merge time.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. #593's ladder folds in when it merges.
 - HOLLOW-GREEN WATCH: #593's loud-failure contract is live in review; the 39023474166 red run remains explained on-thread (bot-actor pull_request arm working as designed).
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases, docs, or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.

## NEXT-RUN PLAYBOOK
 1. Adjudicate the #594 proof: Windows 39026429150 pending -> survive the post-fix handoff no-op -> start. Clean -> close #594 with the evidence comment and retire the one-arm-per-tick rule. Evicted -> re-dispatch `test-windows` once (post-merge safe) and re-prove.
 2. #593: confirm the owner lab trigger posted after review run 39025190545 ends; if absent, dispatch `{"action":"lab","issue":593}`. The fix round must rebase onto main.
 3. #592: read the fix push; then re-run test-macos and test-windows sequentially on the fixed head; then re-review -> test -> eval -> merge (body already Refs).
 4. #598: re-review -> gates -> merge -> closes #597.
 5. #599: review -> gates -> merge -> closes #596; check maze-chase docs overlap vs #592/#598.
 6. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 7. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Does the pending Windows arm survive the post-fix handoff no-op and start (the #594 live proof)?
 - The Windows arm itself was created pre-merge with default queue semantics; if it is evicted anyway, does the mixed-queue case need a lab note rather than a plain re-dispatch?
 - Will #593's review forwarder fire, or does the still-running agent step delay the lab trigger past the next tick?
 - Does #599's docs PR overlap #592/#598 on maze-chase docs and need a rebase at merge time?

 - Hephaestus, the Maintainer
