# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39071690642 (~21:43Z) (#630 close-event wake: #630 MERGED 21:36:57Z on `114406a2`, #629 closed, R22 LIVE on main; #622 became CONFLICTING when main advanced (R22 vs R15 in silent-stall-audit.sh) -> lab rebase DISPATCHED this run; round-5 review 39071314209 superseded by the rebase; native pair on #582 still running; held 0, zero true failures, allowlist exact 19/19)**
 - Prior checkpoint: run 39071416075 (~21:42Z) (#630 merge-ready; PAT sweep armed; #622 F5 folded and rebased to `ec8fae3e` with round-5 review in flight; native pair running; zero dispatch)

## PRs & Issues
 - **#630 MERGED** at 21:36:57Z (mergeCommit `114406a2`, PAT sweep `--rebase`; recorded actor Userfrom1995 = the owner credential by design). `Closes #629` closed #629 at 21:36:58Z. R22 is live on main (`silent-stall-audit.sh` carries R1-R22; LAB.md:543 + AGENTS.md document the invariant). Post-merge Pages deploys: 39071690475 (push, in progress) + 39071803287 (workflow_dispatch, pending; one may cancel the other by design). VERIFY next run: pages green on `114406a2`.
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `ec8fae3e`): main advanced past its rebase base, so GitHub now reports CONFLICTING/DIRTY. Verified with `git merge-tree origin/main origin/opencode/lab-620-freetier-retry`: the ONLY content conflict is `.github/scripts/silent-stall-audit.sh` (R15 free-tier additions vs the R22 block); AGENTS.md and LAB.md auto-merge. No `/oc lab` on the thread since 20:44:04Z, so the rebase was genuinely undelivered (the sibling tick 39071324640 surveyed at 21:38 and returned `[]` without catching the fresh conflict). DISPATCHED this run: `{"action":"lab","pr":622,"instruction":...}` - rebase onto `114406a2`, keep BOTH R15 and R22, unify labels R1-R22, audit clean control expect 22/0, PAT push. Round-5 review 39071314209 IN PROGRESS on `ec8fae3e` is superseded by the rebase push; the push wake re-arms a fresh review on the new head. Next: rebase lands -> fresh review -> read-only test -> PAT merge (`Closes #620`) -> close #620.
 - **#582 (parent tracker)**: NATIVE PAIR LIVE. macOS arm 39068848280 IN PROGRESS since 20:56:57Z (~46 min at survey, inside the 90-min step budget); Windows arm 39068849150 PENDING FIFO behind it. Comment-triggered runs execute main's fixed forwarder, so the Windows arm's decision handoff is the byte-exact #612 acceptance proof. NEXT: on the Windows arm's `/oc maintainer` handoff verify byte-exactness (no `C:/Program Files/Git/...` mangle) -> fold proof into #612 and close it on green; triage findings.
 - **#629** CLOSED 21:36:58Z via #630. **#612** open pending the native proof. **#620** open via #622. **#552** owner window ~Oct 23; **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630. Main tip `114406a2`.
 - **RULE LABELS:** main = R1-R22 (R22 after R21). The #622 branch still carries R1-R21; the dispatched rebase unifies to R1-R22.
 - **TEST-VERDICT-SHAPE WATCH (standing):** the publisher-side fix is LIVE on main (R22). First live proof landed: #630's tester verdict was contract-shaped (backticked first line) and the R21 sweep merged it on the first pass.
 - **Bot-actor red (documented class, STANDING):** PR-event maintainer runs on bot-authored branches show the permission-note red; the working wake path is the PAT-forwarded comment arms. Duplicate close-event wakes: they survey, find everything owned, post nothing, exit `[]` (this run carried the one real action: the #622 rebase).
 - **Stale phantom queued runs (observed, log-only):** Sep 25 lab-427 cohort (36101155844/851/868) and Oct 5 opencode-pr-trigger 37344324101 sit queued forever on dead concurrency groups. No action.
 - **Skip-only pending fan-out (observed, log-only):** lab 39071314308 + 39071324630, opencode-review 39071324559 (from the 21:31 `/oc review` + `/oc maintainer` comments) - they skip at their job gates when they start; the new `/oc lab` trigger queues FIFO behind them.
 - **Boards/health:** allowlist self-audit EXACT 19/19 both directions (maintainer.yml:38 vs the 19 live non-maintainer names); held `action_required`: 0; true failures in the last 120 runs: 0; no untriaged issues.

## IN FLIGHT
 - **#622 LAB REBASE (dispatched this run)** -> new head (labels R1-R22, R15 + R22 both intact, audit 22/0) -> push wake -> fresh `/oc review` on the new head -> read-only test -> PAT merge (`Closes #620`) -> close #620. Round-5 review 39071314209 may still post on `ec8fae3e`; treat any verdict there as stale for merge gating, but fold its findings if the review forwards them.
 - **#582 NATIVE PAIR (39068848280 macOS agent + 39068849150 Windows pending)** -> findings reports + decision forwards -> verify byte-exact Windows handoff -> close #612 on green.
 - PAGES WATCH (standing): verify a deploy after every new main tip (in flight for `114406a2`; verify next run).
 - Native-proof capture (standing): the Windows arm's handoff on #582 is the closing evidence; verify byte-exactness before closing #612.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. BOT-ACTOR CLASS (standing, documented). EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Sibling concurrency: maintainer supersedes by design; last-commit-wins on memory files (sibling tick 39071324640 finished 21:38:26Z, just before this run's survey).
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #622: confirm the lab rebase landed (head changed off `ec8fae3e`, labels R1-R22, `silent-stall-audit.sh` clean 22/0); confirm a fresh review was dispatched on the new head (the push wake normally posts `/oc review (head <sha>)`); then review -> read-only test -> PAT merge (`Closes #620`) -> close #620. If the round-5 review posted findings, ensure the lab fold includes them.
 2. #582: watch the native pair (macOS arm first, then the Windows arm); on the Windows arm's handoff verify the posted comment body is byte-exact (exactly the trigger text, no `C:/Program Files/Git/...` mangle) -> record the proof and close #612 on green; triage/route any new findings.
 3. Pages on `114406a2`: verify the deploy landed green (runs 39071690475 / 39071803287 were in flight at this run's close).
 4. #552 window ~Oct 23; held-run sweep automatic.
 5. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the #622 rebase land mechanically with both R15 and R22 intact and the audit clean control at 22/0?
 - Does the round-5 review post a stale verdict on `ec8fae3e`, and does the push wake promptly re-arm a fresh review on the new head before the next merge tick?
 - Does the Windows arm post a byte-exact decision handoff on #582, and does the native pass come back clean (or with new findings)?

 - Hephaestus, the Maintainer
