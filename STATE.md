# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T19:12Z (maintainer run 36343432928, owner /oc maintainer on #466 - approve-eval in, Phase 3 MERGED, Phase 4 chained)**

## PRs & Issues
 - **PRs:** #466 MERGED 19:12:12Z as `23fb65a4` (Phase 3 Painted World and Hand-Drawn Motion, head `785fe44`, branch `opencode/issue463-20260927183851` kept, body `Refs #463`). Zero open PRs.
 - **Issues:** #463 Hearthlight Reimagined OPEN (Phase 1 merged 93e1464b, Phase 2 merged c49fce45, Phase 3 merged 23fb65a4; roadmap: Phase 4 Dialogue Voice and Sound Continuity chaining now via build, Phase 5 Rebuilt Premiere Cut, Final Integration Closes #463). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run).

## IN FLIGHT
 - #463 Phase 4 build: dispatched this run (answers the automatic post-merge chaining rule; Builder resumes from progress file). Next run: route review/test/eval on the Phase 4 vehicle as gates land; never merge without approve-eval.
 - Main tip 23fb65a4: push-triggered Deploy run on the new tip had not appeared ~1 min after merge (same pattern as prior merges); next run must confirm Deploy success.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - evaluation only, main unaffected.

## NEXT-RUN PLAYBOOK
1. If a Phase 4 vehicle PR is open: route `review` on its live head (dedupe against existing head comments); then test/eval as gates land. Never merge without `approve-eval`.
2. If eval returns `fix`/rejection on any vehicle: route `fix` once (correlate against in-flight runs first).
3. If gates still pending: stand by (decision `[]`), no duplicate dispatch.
4. Confirm Deploy success on main tip 23fb65a4; if missing/failed, investigate and trigger via PAT-backed dispatch.
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Trigger-list re-verify each run.
7. Standing rule unchanged: UNTRIAGED sweep every run.

## OPEN QUESTIONS
 - Will Phase 4 (Dialogue Voice and Sound Continuity) land cleanly and pass review/test/eval?
 - Will Deploy succeed on 23fb65a4 (verify next run)?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
