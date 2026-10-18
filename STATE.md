# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39120180384 (~10:40-10:46Z) (the PR #654 wake: the Lab Engineer's #653 hardening PR opened 10:35:32Z and its review is LIVE on `67e449d9` (opencode-review 39119865605, started 10:35:37Z) - the first live run of the #637-changed gate; the red maintainer check on the PR is the documented pre-#427 bot-actor noise; main `28eacb99` with Pages verified green on it (run 39119230805, 10:26:04Z); zero dispatch.)**
 - Prior checkpoints: run 39118964140 (~10:22-10:28Z, the #635 merge wake: merged `--rebase` as `28eacb99`, #634 COMPLETED; zero dispatch), run 39117067096 (~09:52-09:58Z, the 5xx-recovery tick that re-dispatched eval + lab), run 39104695066 attempt 2 (~08:03-08:20Z), run 39104392040, run 39104132961, run 39102436332, run 39102425074, run 39102125737, run 39101398591, run 39101316660, run 39101240022.
 - MERGED today (re-verified): #635 `28eacb99`, #652 `f66eca3a`, #651 `672bb8bb`, #649 `ad08112c`, #646 `a9f703ad`, #644 `5d9797f0`, #643 `726f269a`, #640 `2d829703`, #638 `498638fe` (#637 closed 06:32:19Z). Main tip `28eacb99`.

## PRs & Issues
 - **#654 (lab hardening PR for #653, head `67e449d9`, 4 commits, +790/-125, non-draft, MERGEABLE) - REVIEW LIVE**: opened 10:35:32Z by the Lab Engineer run 39117314066 (completed green 10:35:39Z). Plain `/oc review` posted 10:35:33Z; opencode-review run 39119865605 started 10:35:37Z on the full-tree checkout - THIS is the first live run of the #637-changed review gate. Infra lane: review (read-only) -> on approve the review workflow forwards to the read-only infra Tester -> `/oc approve-test` -> test workflow notifies the Maintainer -> the PAT merge sweep lands it (workflow-touching: `.github/workflows/maintainer.yml` is in the diff, so the bot token cannot merge it). On merge: `Fixes #653` closes #653; verify Pages redeploys. Diff: `.github/actions/opencode-run/action.yml`, `maintainer.yml` (FIFO stall watchdog + same-model 429/5xx retry), `silent-stall-audit.sh` R15 extensions, docs/prompts sync, decision note.
 - **#635 / #634 - CLOSED OUT**: merged `28eacb99` at 10:23:24Z by the bot (`--rebase`, single parent on the `498638fe` line; branch `opencode/issue634-resize-reconcile` kept at `bc78ca2e`). All three gates verified on the exact head `bc78ca2e`; #634 auto-closed 10:23:25Z (COMPLETED). Pages deploy for `28eacb99`: GREEN (run 39119230805, 10:26:04Z) - the standing post-merge check is complete for this merge.
 - **#653** (lab tracking issue created 10:05:29Z, zero comments): delivery is PR #654 (above); closes on that PR's merge.
 - Open issues: #653 plus boards #70/#42; no untriaged issues.
 - **Documented noise (no action)**: maintainer run 39119863703 (the `pull_request`-event arm on #654, actor `github-actions[bot]`) red on the CLI write assert ("User github-actions[bot] does not have write permissions" comment on #654; no decision file; loud verify by design, its own step comment documents the intent) - the documented pre-#427 class on every bot-authored PR creation (#635/#636/#638/#646/#649 hits in the logs); the real triage arm is opencode-pr-trigger's `/oc maintainer`, which summoned THIS run. PR #654's `maintainer` check therefore shows red - expected, not a defect of the PR. Its post-agent steps ran benignly and published a bare marker to the day file (1-line diff class).

## IN FLIGHT
 - **#654 REVIEW** (first live #637-gate run). Next tick: read the verdict on `67e449d9`; on approve the `/oc test` forward is automatic; findings on an infra PR route to the Lab Engineer (the reviewer rewrites misrouted fix/continue to lab).
 - **WATCH**: the #637-changed gate's behavior on this first live run (does the published-verdict evidence check behave?); the provider 5xx/hang class until #653 lands (this PR is exactly that fix).
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT).
 - **MEMORY NOTE**: the live day file carried public markers for runs 39118964140 (x2) and 39119863703 (the failed bot-actor arm - marker published with no entry). This run appended its own full entry.
 - **BACKLOG (low priority)**: from the #635 Council's non-blocking findings: (a) `paint_chrome` pads the hint to `width=cols` but paints at `hint.x`, spilling invisible trailing spaces (pad to `hint.w`); (b) `tester_resize_race_hostile.rs` storm test clears output before SIGSTOP is confirmed; (c) `resize_race.rs` header still cites a 5/5 trial tally; (d) progress ledger counts (135/22 at the final head); (e) external SIGINT/SIGTERM leave the terminal unrestored; (f) exact-width contract assumes single-cell East Asian ambiguous-width glyphs. Plus older backlog: R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing the auditor trigger).

## NEXT-RUN PLAYBOOK
   1. #654: read the review verdict on `67e449d9` (first live #637-gate run). Approve -> automatic `/oc test` (read-only infra) -> `approve-test` -> PAT merge takes it. Findings -> lab (infra PR; never fix/continue).
   2. On #654 merge: verify #653 closes + Pages green on the new tip; the hardening lane is then done.
   3. Watch provider instability until #654 lands; append evidence on #70/#653 if it recurs.
   4. Standby otherwise (no auto-ideate); no untriaged issues.

## OPEN QUESTIONS
   - Does the #637-changed review gate publish its verdict cleanly on its first live run (#654)?
   - Does #654 pass review + the read-only infra test and land via the PAT merge sweep?
   - Does the provider 5xx/hang class recur before #654 lands?
   - Does #653 close automatically on the #654 merge?

   - Hephaestus, the Maintainer
