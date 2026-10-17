# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39071324640 (~21:40Z) (post-push `/oc maintainer` wake on #622; F5 fold landed as head `ec8fae3e` - verified 0 behind main, CLEAN/MERGEABLE, loop-level R15 behavioral harness present, full audit 21/0 on an extracted head tree; review 39071314209 IN PROGRESS on that head; **#630 MERGED 21:36:57Z - #629 CLOSED 21:36:58Z, main tip `114406a2`, pages deploy pending/starting on the new tip**; macOS arm still running, Windows arm FIFO-pending; held 0, zero true failures; allowlist exact 19/19)**
 - Prior checkpoint: run 39070281431 (~21:25Z) (owner summon on #630; bot-actor red documented; native pair + #622 fold in flight)

## PRs & Issues
 - **#622** (`opencode/lab-620-freetier-retry`, head `ec8fae3e`, 0 behind/12 ahead of main `a28687b5`, CLEAN/MERGEABLE, `Closes #620`): THE F5 FOLD LANDED. Rebased onto `a28687b5`; labels unified R1-R21 with R18 in position; F2 header fixed ("also guarded by extended audit rule R15"); loop-level R15 behavioral harness added (both real runner `run:` blocks executed against a mock `opencode` + mock `sleep`, per-scenario timeouts, interception probe, env-scrubbed sandbox); the brittle F3/F4 window pins trimmed where the behavioral matrix now covers them (the sanctioned F5 relaxation). I verified `bash .github/scripts/silent-stall-audit.sh` on an extracted copy of the head: **21 passed / 0 failed**. Review run 39071314209 IN PROGRESS since 21:31:38 (the post-push `/oc review` at 21:31:35). Lane: review -> read-only infra test -> PAT merge (`Closes #620`) -> close. The 21:31:31Z non-fast-forward dump on-thread is the documented wrapper App-token noise; the PAT step landed the head.
 - **#630** (`Closes #629`, head `91740d3e`): **MERGED 21:36:57Z** on the head-bound verdict pair (review `/oc approve` 21:25:47Z + tester `/oc approve-test` 21:32:59Z, no push after either; sibling run 39071416075 executed the PAT sweep). **#629 CLOSED 21:36:58Z.** Main tip `114406a2` ("lab: record the tester verdict publication contract decision (Refs #629)"). Pages deploy on the new tip was pending/starting at this session's close (runs 39071692520/39071690475); next run verifies it green. This merge is the live #629 acceptance run (first sweep merge under the R21 binding + canonical marker).
 - **#582 (parent tracker)**: NATIVE PAIR. macOS arm 39068848280 IN PROGRESS since 20:56:57 (agent step genuinely running since 20:57:12; slowness is agent/runtime, not a stall); Windows arm 39068849150 PENDING FIFO behind it. The Windows arm's `/oc maintainer` handoff is the byte-exact #612 acceptance proof (main's fixed forwarder: stdin transport + MSYS_NO_PATHCONV).
 - **#629** CLOSED (via #630's merge). **#620** closes via #622's merge. **#612** open pending the native proof. **#552** owner window ~Oct 23; **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630. Main tip `114406a2`.
 - **RULE LABELS:** main = R1-R22 (R22 - tester verdict publication + canonical marker - landed with #630; R18 between R17 and R19). #622 branch = R1-R21 (no new rule number).
 - **TEST-VERDICT-SHAPE WATCH (standing):** R21 rejects prose-first verdicts; #630's publisher-side checker + canonical marker is live on main (R22) and the first sweep merge under the new binding + marker was #630 itself (head-bound, clean). Keep watching subsequent infra merges.
 - **Bot-actor red (documented class, STANDING):** PR-event maintainer runs on bot-authored branches show the permission-note red; the working wake path is the PAT-forwarded comment arms. Duplicate close-event wakes survey, find everything owned, exit `[]`.
 - **Stale phantom queued runs (observed, log-only):** Sep 25 lab-427 cohort and Oct 5 opencode-pr-trigger 37344324101 sit pending forever on dead concurrency groups. No action.
 - **Boards/health:** allowlist self-audit EXACT 19/19 both directions; held `action_required`: 0; failures/timed_out in the last 100 runs: 0; pages green on `a28687b5` (deploy 39071324072 success 21:31:46 plus the #622 preview trigger success); pages deploy on the new tip `114406a2` was starting/pending at session close - VERIFY NEXT RUN; no untriaged issues.

## IN FLIGHT
 - **#622 REVIEW (39071314209)** -> verdict -> read-only infra test -> PAT merge (`Closes #620`) -> close. On findings the review forwards `/oc lab` (infra PR; never fix/continue).
 - **PAGES on `114406a2`** (deploy runs 39071692520/39071690475 pending/in-progress at session close) -> verify green next run.
 - **#582 NATIVE PAIR (macOS arm running, Windows arm pending)** -> findings reports + decision forwards -> verify byte-exact Windows handoff -> close #612 on green.
 - PAGES WATCH (standing): verify a deploy after every new main tip.
 - Standing rules: TEST-CRASH RULE (retry once; second consecutive silent death -> lab); BOT-ACTOR CLASS (documented); EXPECTED WRAPPER-PUSH NOISE (non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head); SHALLOW-CLONE CAVEAT (#602); Infra routing guard (`.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only).
 - Sibling concurrency: maintainer supersedes by design; last-commit-wins on memory files.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. Verify pages deployed green on `114406a2` (was starting at session close). #630 is merged and #629 closed - record the accepted live proof if the deploy is green.
 2. #622: review verdict -> approve -> read-only infrastructure test -> PAT sweep merge (`Closes #620`); on findings the review's `/oc lab` forward owns the fold (branch may need a micro-rebase if main moved; the review-forwarded lab route owns it).
 3. #582: on the Windows arm's handoff verify the posted body is byte-exact (exactly the trigger text, no `C:/Program Files/Git/...` mangle) -> record the proof and close #612 on green; triage arm findings.
 4. Pages after every new main tip; held-run sweep automatic; #552 window ~Oct 23.
 5. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does #622's review round approve the F5 head, and does the read-only test follow on the same head?
 - Does the Windows arm post a byte-exact decision handoff on #582, and does the native pass come back clean (or with new findings)?
 - Do the pages deploy and the next tips stay green after the R22 merge?

 - Hephaestus, the Maintainer
