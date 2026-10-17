# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39071416075 (~21:40Z) (owner `/oc maintainer` summon on #630 right after the Tester's contract-shaped `/oc approve-test` at 21:32:59Z; #630 head `91740d3e` merge-ready -> PAT sweep this run; #622 rebased to `ec8fae3e` - F5 fold landed, round-5 review IN PROGRESS; native pair on #582: macOS arm agent in progress, Windows arm pending FIFO; held 0, zero true failures, allowlist exact 19/19, pages green on `a28687b5`)**
 - Prior checkpoint: run 39070281431 (~21:25Z) (status tick on #630; review 39069701703 in flight; bot-actor PR-event red documented; zero dispatch)

## PRs & Issues
 - **#630** (lab PR for #629, `Closes #629`, head `91740d3e`, MERGEABLE/UNSTABLE - the UNSTABLE is the documented bot-actor maintainer red only): review run 39069701703 APPROVED 21:25:47Z; read-only infra test run 39070907351 approved at 21:32:59Z with the contract-shaped verdict (first line `` `/oc approve-test` ``, backticked). R21 predicate verified live: backtick-optional anchor matches; head-binding holds (head commits all 21:08:12Z, no `head_ref_force_pushed` events, verdict 21:32:59 > head push). No `/oc fix` after. The PAT merge sweep in THIS run is armed to merge; on merge: #629 auto-closes, pages redeploy, and R22 becomes live (main then R1-R22).
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`): F5 fold lab run 39067346578 finished SUCCESS 21:31:41Z after pushing the F5 commits (`c50fbb04`, `994c0d08`, `3c36f75b`) and the rebase commit `ec8fae3e` (21:29:53Z: rebase onto `a28687b5`, main's R18 kept in position, R15 free-tier annotation kept; re-verified 21/0 + 20/20 mutation + 4/4 edge). Head now `ec8fae3e`, MERGEABLE/CLEAN. Round-5 review run 39071314209 IN PROGRESS since 21:31:38Z on the rebased head. The 21:31:31Z on-thread push rejection (non-fast-forward) is the expected wrapper-noise class on a rebased workflow branch (the PAT step landed the head); no post-mortem. Skip-only pending runs from the comment fan-out: Lab Engineer 39071324630, opencode-review 39071324559 (both will skip at their gates). Lane: review -> read-only test -> PAT merge (`Closes #620`) -> close #620.
 - **#582 (parent tracker)**: NATIVE PAIR LIVE. macOS arm 39068848280 IN PROGRESS since 20:56:57Z (agent step running, ~45 min at survey; 90-min step budget); Windows arm 39068849150 PENDING FIFO behind it. Comment-triggered runs execute main's fixed forwarder, so the Windows arm's decision handoff is the byte-exact #612 acceptance proof. NEXT: on the Windows arm's `/oc maintainer` handoff verify byte-exactness (no `C:/Program Files/Git/...` mangle) -> fold proof into #612 and close it on green; triage findings.
 - **#629** open, closes via #630's merge. **#612** open pending the native proof. **#620** open via #622. **#552** owner window ~Oct 23; **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614. Main tip `a28687b5` (pre-#630).
 - **RULE LABELS:** main = R1-R21 (R18 in position between R17 and R19). #630 brings R22 - merge pending in this run.
 - **TEST-VERDICT-SHAPE WATCH (standing):** resolved at the publisher side if #630 lands; the tester's live verdict was already contract-shaped this time (backticked first line).
 - **Bot-actor red (documented class, STANDING):** PR-event maintainer runs on bot-authored branches show the permission-note red (observed again on #630 open, run 39069701379; the #630 check is still red for it at survey); the working wake path is the PAT-forwarded comment arms. Duplicate close-event wakes (observed on #628/#614): they survey, find everything owned, post nothing, exit `[]`.
 - **Stale phantom queued runs (observed, log-only):** Sep 25 lab-427 cohort (36101155844/851/868) and Oct 5 opencode-pr-trigger 37344324101 sit pending forever on dead concurrency groups. No action.
 - **Benign pending workflow_run tick (observed):** maintainer 39071329553 (21:31:51Z, group `maintainer-main`) - every allowlisted workflow completion spawns a maintainer run that skips at the job gate unless failure/timed_out; this one will skip on start. No action.
 - **Boards/health:** allowlist self-audit EXACT 19/19 both directions (maintainer.yml:38 vs the 19 live non-maintainer names); held `action_required`: 0; true failures in the last 120 runs: 0 (only the documented bot-actor class); pages green on `a28687b5` (last deploy 39071324072 success 21:31:46Z); no untriaged issues.

## IN FLIGHT
 - **#630 PAT SWEEP MERGE (this run)** -> #629 closes -> pages on the new tip -> R22 live; verify next run (PR merged, issue closed, sweep log lines).
 - **#622 ROUND-5 REVIEW (39071314209)** -> verdict -> read-only test -> PAT merge (`Closes #620`); findings would forward `/oc lab` (infra PR).
 - **#582 NATIVE PAIR (39068848280 macOS agent in progress + 39068849150 Windows pending)** -> findings reports + decision forwards -> verify byte-exact Windows handoff -> close #612 on green.
 - PAGES WATCH (standing): verify a deploy after every new main tip (done for `a28687b5`; next after the #630 merge).
 - Native-proof capture (standing): the Windows arm's handoff on #582 is the closing evidence; verify byte-exactness before closing #612.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. BOT-ACTOR CLASS (standing, documented). EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Sibling concurrency: maintainer supersedes by design; last-commit-wins on memory files (this run overlaps 39071324640 on #622 and the benign 39071329553).
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #630: verify the merge landed (main tip advanced, #629 closed, R22 live in silent-stall-audit.sh on main); if the sweep skipped (e.g. still UNKNOWN mergeable or a stale verdict read), re-check the sweep log and re-trigger via the next tick; pages redeployed on the new tip.
 2. #622: round-5 review verdict -> green: read-only test -> PAT merge (`Closes #620`) -> close #620; findings: the review's `/oc lab` forward owns the fold. Verify the R1-R22 label unification if #630 merged first (script on main is R1-R22; the PR branch carries a unified range).
 3. #582: watch the native pair (macOS arm first, then the Windows arm); on the Windows arm's handoff verify the posted comment body is byte-exact (exactly the trigger text, no `C:/Program Files/Git/...` mangle) -> record the proof and close #612 on green; triage/route any new findings.
 4. Pages after every new main tip; held-run sweep automatic; #552 window ~Oct 23.
 5. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the #630 PAT sweep merge on the first pass this run, and does #629 close cleanly?
 - Does #622's round-5 review approve the rebased F5 head in one round, and does the read-only test follow on the same head?
 - Does the Windows arm post a byte-exact decision handoff on #582, and does the native pass come back clean (or with new findings)?

 - Hephaestus, the Maintainer
