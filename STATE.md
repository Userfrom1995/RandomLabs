# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39070281431 (~21:25Z) (owner `/oc maintainer` summon on #630; #630 review 39069701703 IN PROGRESS on `91740d3e`; bot-actor PR-event red on #630 = documented class; #622 F5 fold still running + 3 FIFO passes; native pair on #582: macOS arm in progress, Windows arm pending; held 0, zero true failures; allowlist exact 19/19; pages green on `a28687b5`)**
 - Prior checkpoint: run 39068664642 (~21:02Z) (duplicate close-wake on merged #614; fix verified live on main; NATIVE PAIR dispatched 20:56:47/48Z; zero dispatch)

## PRs & Issues
 - **#630** (lab PR for #629, `Closes #629`, head `91740d3e`, MERGEABLE, 10 files): owner `/oc review` 21:08:51Z -> review run 39069701703 IN PROGRESS since 21:08:53Z on the exact head; no verdict yet. Lane: review -> read-only infra test -> PAT sweep merge (`Closes #629`) -> close. PR-event maintainer red 39069701379 + on-thread permission note = documented bot-actor class, no dispatch.
 - **#582 (parent tracker)**: NATIVE PAIR LIVE. macOS arm 39068848280 IN PROGRESS since 20:56:57Z; Windows arm 39068849150 PENDING FIFO behind it. Comment-triggered runs execute main's fixed forwarder, so the Windows arm's decision handoff is the byte-exact #612 acceptance proof. NEXT: on the Windows arm's `/oc maintainer` handoff verify byte-exactness (no `C:/Program Files/Git/...` mangle) -> fold proof into #612 and close it on green; triage findings.
 - **#622** (`opencode/lab-620-freetier-retry`, head `db29f726`, CONFLICTING - the predicted R18-insert divergence, `Closes #620`): F5 loop-level fold lab 39067346578 IN PROGRESS since 20:35:15Z (~47 min at survey; inside the 120/90 lab budget); FIFO-queued lab passes behind it: 39067628562, 39067638106, 39067966662. Merge-order note on-thread (20:56:45Z): fold push must rebase onto `a28687b5`, unify labels R1-R21 with R18 BETWEEN R17 and R19, keep the five F3/F4 R15 pins. Do NOT preemptively rebase (would race the fold push); the post-fold lab/review pass owns it.
 - **#629** open, closes via #630's merge (`Closes #629`). **#612** open pending the native proof. **#620** open via #622. **#552** owner window ~Oct 23; **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614. Main tip `a28687b5`.
 - **RULE LABELS:** main = R1-R21 (21 live rules; R18 in position between R17 and R19). #630 adds R22 - not merged yet.
 - **TEST-VERDICT-SHAPE WATCH (standing):** R21 correctly rejects prose-first verdicts; #629's publisher-side checker + canonical marker fix is in #630's lane.
 - **Bot-actor red (documented class, STANDING):** PR-event maintainer runs on bot-authored branches show the permission-note red (observed again on #630 open, run 39069701379); the working wake path is the PAT-forwarded comment arms. Duplicate close-event wakes (observed on #628/#614): they survey, find everything owned, post nothing, exit `[]`.
 - **Stale phantom queued runs (observed, log-only):** Sep 25 lab-427 cohort (36101155844/851/868) and Oct 5 opencode-pr-trigger 37344324101 sit pending forever on dead concurrency groups. No action.
 - **Boards/health:** allowlist self-audit EXACT 19/19 both directions (maintainer.yml:38 vs the 19 live non-maintainer names); held `action_required`: 0; true failures in the last 60 runs: 0 (only the documented bot-actor class); pages green on `a28687b5` (39068857182 + preview workflow_dispatch 39070275151 at 21:16:56Z); no untriaged issues.

## IN FLIGHT
 - **#630 REVIEW (39069701703)** -> verdict -> read-only infra test -> PAT merge (`Closes #629`) -> close.
 - **#582 NATIVE PAIR (39068848280 macOS in progress + 39068849150 Windows pending)** -> findings reports + decision forwards -> verify byte-exact Windows handoff -> close #612 on green.
 - **#622 F5 FOLD (39067346578, ~47 min in)** -> rebase onto `a28687b5` (R1-R21 labels, R18 in position, F3/F4 pins intact) -> push -> review -> read-only test -> PAT merge (`Closes #620`); queued lab passes drain FIFO.
 - PAGES WATCH (standing): verify a deploy after every new main tip (done for `a28687b5`).
 - Native-proof capture (standing): the Windows arm's handoff on #582 is the closing evidence; verify byte-exactness before closing #612.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. BOT-ACTOR CLASS (standing, documented). EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Sibling concurrency: maintainer supersedes by design; last-commit-wins on memory files.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #630: review verdict -> green: read-only infra test -> PAT sweep merge (`Closes #629`); findings: the review's `/oc lab` forward owns the fold. Verify #629 closes and pages redeploy on the new tip.
 2. #582: watch the native pair (macOS arm first, then the Windows arm); on the Windows arm's handoff verify the posted comment body is byte-exact (exactly the trigger text, no `C:/Program Files/Git/...` mangle) -> record the proof and close #612 on green; triage/route any new findings.
 3. #622: fold push -> confirm the R1-R21 rebase and the five F3/F4 pins survive -> review -> read-only test -> PAT merge (`Closes #620`); dispatch `{"action":"lab","pr":622}` with the rebase instruction ONLY if the post-fold lane stalls after the push.
 4. Pages after every new main tip; held-run sweep automatic; #552 window ~Oct 23.
 5. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does #630's review approve the R22 surgery in one round, and does the read-only test follow on the same head?
 - Does the F5 loop-level harness land in one lab pass, and does the R18-insert rebase stay mechanical?
 - Does the Windows arm post a byte-exact decision handoff on #582, and does the native pass come back clean (or with new findings)?

 - Hephaestus, the Maintainer
