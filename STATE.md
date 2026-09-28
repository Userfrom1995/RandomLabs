# STATE - Random factory checkpoint
 - **Updated: 2026-09-28T15:06Z (maintainer run 36440921081, owner /oc eval + /oc maintainer on PR #471 - eval already queued, stand down)**

## PRs & Issues
 - **PRs:** #471 OPEN (bot, `opencode/issue470-20260928143105`, head 4d1eea1daa2100d - Tester qc-fixes suite on top of Fixer V1-V5 head 28f4e164) - Mythduel Phase 1 passed re-review (`/oc approve` on 28f4e164, all V1-V5 verified live) and full re-test (`/oc approve-test` at 4d1eea1d: repro GREEN, hostile 35/35, qc-fixes 23/23, serve GREEN, no post-approval fix findings). MERGEABLE CLEAN. MERGE GUARD: Refs #470, never Closes, until final phase lands.
 - **Issues:** #470 Mythduel OPEN (Phase 1 in re-eval gate; Phase 2 chains only after intermediate merge). Standing boards open: #70 lab-health, #42 brainstorm. Epics #449 (short film) and #463 (Hearthlight Reimagined) CLOSED.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS.
 - **Owner commissions:** Thor-vs-Zeus original-mythology duel accepted (no Marvel/Sony likeness or assets, binding review gate). Same production quality bar as short-film commission.

## IN FLIGHT
 - #471 Phase 1 re-eval already queued twice over: prior run 36440585825's eval dispatch is in_progress (opencode-eval 36440887935, 15:05:10Z) and the owner's own `/oc eval` (15:05:07Z) queued a second pending session (opencode-eval 36440921297, 15:05:25Z), both on head 4d1eea1d. This run dispatches nothing (dedupe). Next: Evaluator verdict -> on approve-eval merge as Refs #470 + immediately chain Phase 2 build (never [] on an intermediate merge); on fix verdict route Fixer.
 - Main tip 822d164367e8 (unchanged). #470 stays OPEN through all intermediate phases.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` not re-checked this run (no signal; standing evaluation-only item).

## NEXT-RUN PLAYBOOK
1. Check Evaluator verdict on PR #471 head 4d1eea1d (approve-eval -> merge as Refs #470 + chain Phase 2; fix findings -> route fix; do NOT re-dispatch eval while an eval run is in flight; 30-min cooldown on same-branch re-dispatch).
2. At eventual merge time enforce Refs-not-Closes on #471; after merging the intermediate phase, immediately chain Phase 2 build (never output [] on an intermediate merge).
3. On any other new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
4. Trigger-list re-verify each run.
5. Standing rule unchanged: UNTRIAGED sweep every run.
6. Standby when idle otherwise: do NOT auto-dispatch ideate or invent work.

## OPEN QUESTIONS
 - What does the re-eval verdict on the V1-V5 fixed + re-tested head 4d1eea1d say (then merge-as-Refs + Phase 2, or fix)?
 - Note: two eval sessions queued on the same head (36440887935 in_progress + 36440921297 pending) - harmless duplicate from owner + prior-dispatch overlap; take the first binding verdict, ignore the second unless heads diverge.
 - PR #471 must merge as Refs #470, never Closes, until the final phase lands.
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
