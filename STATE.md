# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T08:12Z (maintainer run 36305443911, dependabot PR #448 triage - review dispatched)**

## PRs & Issues
 - **PRs:** #448 OPEN (dependabot vitest 3.2.7 to 5.0.2 in /kinetica, single-line package.json bump, head 09819a5c) - review dispatched this run. Last merged: PR #447 (Phase 5: Showcase Refresh) to 6af0bd8e, triple gate green. Epic #436 CLOSED.
 - **Issues:** only standing boards open: #70 lab-health, #42 brainstorm. Epic #436 CLOSED (all 5 phases merged).
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 6af0bd8e LIVE, unchanged.** Trigger-list 18/18 PASS. Pins `opencode/muse-spark-1.3-contributor-free` (opencode.json two-knob).

## IN FLIGHT
 - PR #448 awaiting Reviewer verdict (dispatched 36305443911). Note: opencode-pr-trigger run 36305373721 on the dependabot branch failed closed by design (actor-write-gate: dependabot[bot] has no write perms - clean skip, not a crash, no re-dispatch).
 - Nothing else lab-owned. Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (unchanged since ~19:55Z 2026-09-26 push, triaged in run 36267847851, no PR): tor-cli CI still red branch-scoped (Windows `Setsid` break at main.go:649 + macOS fail-closed exit-code regression). No dispatch - owner session active, no vehicle (no PR/issue), main unaffected. See playbook.

## NEXT-RUN PLAYBOOK
1. If Reviewer approves #448: route `test`, then merge on Tester approval (shipping limit N/A - dep bump, not a new project). If Reviewer requests fixes: route `fix` - but note the branch is dependabot-owned; do NOT push to it via fix. Re-evaluate then (dependabot rebases itself; major 3.x to 5.x jump may need kinetica test verification).
2. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if review findings land); the Windows `Setsid` break (tor-cli/main.go `spawnSupervisor`, plus committed `tor-cli/tor-cli` binary in diff) AND the macOS fail-closed exit-code regression must be resolved before merge.
3. If the branch keeps advancing with no PR and CI stays red >3 days (bot-work stall lens does not apply to owner work; evaluate, do not seize): consider a `ping` on the eventual PR/issue, never on closed #436 uninvited.
4. Verify Deploy health on main only if main advances (still 6af0bd8e).
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Evaluator follow-ups (255 passthrough figure, help -v edge, bare-word typo UX, mobile nav affordance, code-comment clip) are non-blocking; act only if Owner requests a new tor-cli iteration.
7. Trigger-list re-verify each run.

## OPEN QUESTIONS
 - Will vitest 5.x break kinetica's test suite (major 3 to 5 jump)? Awaiting Reviewer/Tester verdict on #448.
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Will the Owner request a follow-up tor-cli iteration for the Evaluator's cosmetic notes?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
