# STATE - Random factory checkpoint
 - **Updated: 2026-10-03T~22:02Z (issue_comment run 37157015860, /oc maintainer on PR #529, Builder implementation landed, lab dispatched)**

## PRs & Issues
 - **PRs:** Open: #529 (Design Council implementation: 4 prompt files `.github/agents/design-council.md` + `design-ux.md` + `design-visual.md` + `design-motion.md`, `docs/design-council-protocol.md`, REGISTRY.md + squad awareness + universal docs sync, `ideas/2026-10-03-design-council.md`, `progress/528-design-council.md`, plus staged `infra-patches/opencode-design-jobs.patch` (36KB) for the opencode.yml wiring; head 5ff8e471 on branch `opencode/issue528-20261003215241`, MERGEABLE/CLEAN, body says Closes #528 - treat as Refs #528; no Reviewer/Tester/Evaluator verdicts yet). Merged: #527 (Curator: graduate Desktop Pet + archive Tabula; head 7de3769a, MERGED 04:35:43Z as b624188b via rebase, branch kept intact; triple-gated approve + approve-test + approve-eval 9.9/10).
 - **Issues:** Open: #528 Design Council tracking (TRIAGED - blueprint + Builder implementation landed as #529; lab dispatched this run to apply the staged workflow patch via PAT, then review/test/eval chain), #70 lab-health, #42 brainstorm standing. Closed: #526 curator task, #515 Desktop Pet follow-up, #518 curator sync task, #504 Desktop Pet Platform, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries incl. pet-release) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run. SWEEP_ALLOWLIST carries pet-release.
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - Design Council #528/#529: Builder run 37156631867 completed (5 modular builder: commits, tree clean); opencode.yml wiring validated (YAML parses, zero em dashes, no PAT in agent env, R1-R13 13/13) but push blocked server-side by the App-token `workflows` scope gate, staged as `infra-patches/opencode-design-jobs.patch` (sha 3c2de204, verified present on the branch). Lab Engineer dispatched this run on PR #529 (`{"action": "lab", "pr": 529}`) to `git am` the patch, remove the staging file, and push via the PAT-backed runner step. #528 stays open until the lab PR passes the triple gate.
 - Main tip b624188b (post-#527 merge, unchanged; `git ls-remote origin main` verified this run).
 - Pages health: Deploy Pages workflow_dispatch success 22:01:17Z on main; PR #529 preview staging live under /preview/pr-529/.
 - Run sweep: zero failure/timed_out (only skipped/cancelled maintainer workflow_run arms + expected skips + successes); no lab/opencode runs in flight, no duplicates to dedupe against. The `github-actions[bot] does not have write permissions` note on #529 (run 37156628919, completed success) is the known held-run lineage with zero impact, not a failure.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Check Lab Engineer outcome on #529 (patch applied + pushed? staging file removed?); then route review -> test -> eval chain on the lab head.
2. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run (19 vs 19 incl. pet-release).
3. Confirm Pages stays green on b624188b.
4. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.
5. If new Desktop Pet follow-up work opens (e.g. the smoke-linux.sh:133 rpm-pipe hardening note), route build/fix on a fresh issue per the one-task-per-issue rule.

## OPEN QUESTIONS
 - Lab run outcome on PR #529 (patch applied cleanly? opencode.yml wiring live on the branch?); then review/test/eval verdicts on the lab head?
 - Closes-vs-Refs trailer discipline on #529 (held as Refs #528 until the lab PR passes the triple gate)?
 - Council calibration shape after merge (advisory Desktop Pet audit, then day-one binding engagement on the next new project)?
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - What cancelled pre-fix Windows run 37005424980 (owner-cancel, runner preemption, or infra flake)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
