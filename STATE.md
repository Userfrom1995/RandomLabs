# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39068652285 (~21:00Z) (#614 MERGED 20:54:02Z -> main `a28687b5`; post-merge audit re-run on the merged tree 21/0; NATIVE PAIR dispatched on #582 at 20:56:47Z by sibling run 39068614500 (peros 39068848280 live + 39068849150 queued); #628 merged 20:53:54Z (`Fixes #626`) -> #626 CLOSED; #622 CONFLICTING on the R18 insert (F5 fold live + merge-order rebase note posted); #629 lab live; held 0, failures 0, allowlist exact 19/19, pages green on `a28687b5`)**
 - Prior checkpoint: run 39068463150 (~20:53Z) (#629 triaged to lab; #628 contract-shaped re-test live; #614 read-only test live; #622 F5 fold live + 3 FIFO lab passes)

## PRs & Issues
 - **#614 MERGED 20:54:02Z** (`opencode/lab-612-msys-body-pathconv`, 11 commits, rebase merge by the PAT sweep on the R21 head-bound approval). Main tip `a28687b5` (ls-remote + API agree). Post-merge verification done this run: full audit re-run on an archive of `origin/main` = 21 passed / 0 failed (R18 + R19/R20/R21 all present, every live label R1-R21); the three peros forwarders carry `MSYS_NO_PATHCONV: "1"` + stdin (`--body-file -`); lab.yml budgets 120/90; pages run 39068665141 SUCCESS on the tip. Linked `Refs #612` -> #612 stays OPEN pending the native byte-exact proof.
 - **#582 (parent tracker)**: native pair dispatched 20:56:47/48Z on #582. Peros run 39068848280 IN PROGRESS (first arm), 39068849150 PENDING (second, FIFO behind the first per the per-issue group). On completion each arm posts its signed findings report and its forward step posts the decision trigger on #582; the WINDOWS handoff comment body is the #612 byte-exact proof (mangled form would read `C:/Program Files/Git/...`; the fixed form must read exactly the trigger text). NEXT: verify the handoff, fold the proof, close #612 on green; triage new findings if any.
 - **#622** (`opencode/lab-620-freetier-retry`, head `db29f726`, CONFLICTING/DIRTY as predicted, `Closes #620`): F5 loop-level fold lab 39067346578 IN PROGRESS since 20:35:15Z; two FIFO-queued lab passes behind it (39067638106, 39067966662). Merge-order note posted 20:56:45Z: the fold push must rebase onto `a28687b5`, unify every live range label to R1-R21 with R18 BETWEEN R17 and R19, and keep the five F3/F4 R15 pin sub-flags intact. Do NOT preemptively rebase (would race the fold push); the post-fold lab/review pass owns the rebase. Lane: fold push -> review -> read-only test -> PAT merge.
 - **#629** (`[Infra] opencode-test publication-shape gap`, lab dispatched 20:53:48Z): lab run 39068648771 IN PROGRESS. Lane: PR -> review -> read-only test -> PAT merge (`Fixes #629`) -> close. Watch: fail-closed on a mis-shaped verdict; R21 untouched.
 - **#626 CLOSED** via #628's merge (`Fixes #626`, merge commit `ffbae2af` at 20:53:54Z; the R21 anchor correctly refused the prose-first verdict and merged on the contract-shaped re-publication at 20:53:17Z).
 - **#612, #620, #582 OPEN** with live lanes; **#552** owner window ~Oct 23; **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614. Main tip `a28687b5`.
 - **RULE LABELS:** main = R1-R21 (21 live rules; R18 now in position between R17 and R19).
 - **TEST-VERDICT-SHAPE WATCH (standing):** R21 worked as designed tonight (#628 prose-first verdict did not count; the contract-shaped re-test merged it). Until #629's fix lands, a prose-first verdict needs one test re-dispatch (never a forged marker comment).
 - **Bot-actor red (documented class, STANDING):** the pending PR-event maintainer runs on the merged bot branches (#614, #628) will still show the permission-note red; the working wake path is the PAT-forwarded comment arms.
 - **Stale phantom queued runs (observed, log-only):** Sep 25 lab-427 cohort (36101155844/851/868) and Oct 5 opencode-pr-trigger 37344324101 sit pending forever on dead concurrency groups. No action.
 - **Boards/health:** allowlist self-audit EXACT 19/19 (live non-native non-maintainer names vs maintainer.yml `workflows:`); held `action_required`: 0; failures over the last 100 runs: 0; no untriaged issues.

## IN FLIGHT
 - **#582 NATIVE PAIR (39068848280 live + 39068849150 queued)** -> findings reports + decision forwards -> verify byte-exact Windows handoff -> close #612 on green; triage findings.
 - **#622 F5 FOLD (39067346578)** -> rebase onto `a28687b5` (R1-R21 labels, R18 in position, F3/F4 pins intact) -> push -> review -> read-only test -> PAT merge (`Closes #620`); queued lab passes drain FIFO.
 - **#629 LAB (39068648771)** -> PR -> review -> read-only test -> PAT merge (`Fixes #629`) -> close.
 - PAGES WATCH (standing): verify a deploy after every new main tip (done for `a28687b5`, run 39068665141).
 - Native-proof sequencing (standing): DISCHARGED for dispatch; the proof capture is the next run's job.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. BOT-ACTOR CLASS (standing, documented). EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Sibling concurrency: maintainer supersedes by design; last-commit-wins on memory files.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #582: watch the native pair; on the Windows arm's handoff, verify the posted comment body is byte-exact (exactly the trigger text, no `C:/Program Files/Git/...` mangle) -> record the proof and close #612 on green; triage/route any new findings.
 2. #622: fold push -> confirm the R1-R21 rebase and the F3/F4 pins survive -> review -> read-only test -> PAT merge (`Closes #620`); if the post-fold lane stalls on the conflict, dispatch `{"action":"lab","pr":622}` with the rebase instruction ONLY after the fold push lands.
 3. #629: lab PR -> review -> read-only test -> PAT merge (`Fixes #629`) -> close; verify fail-closed + R21 untouched.
 4. Pages after every new main tip; held-run sweep automatic; #552 window ~Oct 23.
 5. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the Windows arm post a byte-exact decision handoff on #582, and does the native pass come back clean (or with new findings)?
 - Does the F5 loop-level harness land in one lab pass, and does the R18-insert rebase stay mechanical?
 - Does the #629 publication-shape checker land in one surgical PR without touching R21?

 - Hephaestus, the Maintainer
