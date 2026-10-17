# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39068664642 (~21:02Z) (duplicate close-event wake on merged #614; fix re-verified live on main from the API - all three peros forwarders carry `MSYS_NO_PATHCONV: "1"` (lines 211/417/629) + stdin `--body-file -` (222/427/642); NATIVE PAIR running on #582: macOS arm 39068848280 IN PROGRESS since 20:56:57Z, Windows arm 39068849150 PENDING FIFO behind it; #622 F5 fold 39067346578 still in progress with 3 queued lab passes; #629 lab 39068648771 in progress; held 0, failures 0, allowlist exact 19/19, pages green on `a28687b5`)**
 - Prior checkpoint: run 39068652285 (~21:00Z) (#614 MERGED 20:54:02Z -> main `a28687b5`; post-merge audit 21/0; native pair dispatched 20:56:47/48Z; #628 merged -> #626 CLOSED; #622 merge-order note posted)

## PRs & Issues
 - **#614 MERGED 20:54:02Z** (`opencode/lab-612-msys-body-pathconv`, 11 commits, rebase merge by the PAT sweep on the R21 head-bound approval). Main tip `a28687b5` (ls-remote + API agree). Fix re-verified live this run from the API (`?ref=main`): all three forwarders carry the step env `MSYS_NO_PATHCONV: "1"` and post via `printf '%s' "$1" | gh issue comment ... --body-file -`. Post-merge audit on the merged tree was 21/0 (sibling run). Linked `Refs #612` -> #612 stays OPEN pending the native byte-exact proof. No comment posted this run (sibling run 39068652285 posted the post-merge record at 20:59:59/21:00:04Z).
 - **#582 (parent tracker)**: NATIVE PAIR LIVE. Owner-PAT triggers `/oc test-macos` 20:56:47Z + `/oc test-windows` 20:56:48Z. Run 39068848280: `test-macos` IN PROGRESS (started 20:56:57Z), `test-linux`/`test-windows` skipped by the per-trigger gate. Run 39068849150: PENDING (FIFO behind macOS on the per-issue group; `queue: max` semantics correct). Comment-triggered runs execute the workflow YAML from `main`, which now carries the fixed forwarder. NEXT: on the Windows arm's `/oc maintainer` handoff, verify the posted comment body is byte-exact (no `C:/Program Files/Git/...` mangle) -> fold the proof into #612 and close it on green; triage any new findings (macOS arm may surface findings from the #610-era fixes).
 - **#622** (`opencode/lab-620-freetier-retry`, head `db29f726`, CONFLICTING/DIRTY as predicted, `Closes #620`): F5 loop-level fold lab 39067346578 IN PROGRESS since 20:35:15Z; FIFO-queued lab passes behind it: 39067628562, 39067638106, 39067966662 (all pending). Merge-order note on-thread (20:56:45Z): fold push must rebase onto `a28687b5`, unify live labels to R1-R21 with R18 BETWEEN R17 and R19, keep the five F3/F4 R15 pin sub-flags. Do NOT preemptively rebase (would race the fold push); the post-fold lab/review pass owns the rebase. Lane: fold push -> review -> read-only test -> PAT merge.
 - **#629** (`[Infra] opencode-test publication-shape gap`, lab dispatched 20:53:48Z): lab run 39068648771 IN PROGRESS since 20:53:51Z; no PR yet. Lane: PR -> review -> read-only test -> PAT merge (`Fixes #629`) -> close. Watch: fail-closed on a mis-shaped verdict; R21 untouched.
 - **#626 CLOSED** via #628 merge (`Fixes #626`, 20:53:54Z).
 - **#612, #620, #582 OPEN** with live lanes; **#552** owner window ~Oct 23; **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614. Main tip `a28687b5`.
 - **RULE LABELS:** main = R1-R21 (21 live rules; R18 in position between R17 and R19).
 - **TEST-VERDICT-SHAPE WATCH (standing):** R21 working as designed (#628 prose-first verdict was correctly ignored; the contract-shaped re-test merged it). #629's fix lands the publisher-side checker; until then a prose-first verdict needs a test re-dispatch (never a forged marker comment).
 - **Bot-actor red (documented class, STANDING):** PR-event maintainer runs on merged bot branches show the permission-note red; the working wake path is the PAT-forwarded comment arms. **Duplicate close-event wakes (observed twice tonight on #628 and #614):** they survey, find everything owned, post nothing (or a one-line duplicate note), and exit `[]`; no action.
 - **Stale phantom queued runs (observed, log-only):** Sep 25 lab-427 cohort (36101155844/851/868) and Oct 5 opencode-pr-trigger 37344324101 sit pending forever on dead concurrency groups. No action.
 - **Boards/health:** allowlist self-audit EXACT 19/19 (live non-native non-maintainer names vs maintainer.yml `workflows:`); held `action_required`: 0; failures over the last 100 runs: 0 (cancelled entries are the designed supersede classes); pages success on `a28687b5` (39068665141 + 39068857182); no untriaged issues.

## IN FLIGHT
 - **#582 NATIVE PAIR (39068848280 macOS in progress + 39068849150 Windows pending)** -> findings reports + decision forwards -> verify byte-exact Windows handoff -> close #612 on green; triage findings.
 - **#622 F5 FOLD (39067346578, ~27 min in)** -> rebase onto `a28687b5` (R1-R21 labels, R18 in position, F3/F4 pins intact) -> push -> review -> read-only test -> PAT merge (`Closes #620`); queued lab passes drain FIFO.
 - **#629 LAB (39068648771)** -> PR -> review -> read-only test -> PAT merge (`Fixes #629`) -> close.
 - PAGES WATCH (standing): verify a deploy after every new main tip (done for `a28687b5`).
 - Native-proof capture (standing): the Windows arm's handoff on #582 is the closing evidence; verify byte-exactness before closing #612.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. BOT-ACTOR CLASS (standing, documented). EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Sibling concurrency: maintainer supersedes by design; last-commit-wins on memory files.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #582: watch the native pair (macOS completion -> Windows arm run); on the Windows arm's handoff, verify the posted comment body is byte-exact (exactly the trigger text, no `C:/Program Files/Git/...` mangle) -> record the proof and close #612 on green; triage/route any new findings (macOS arm may report findings).
 2. #622: fold push -> confirm the R1-R21 rebase and the five F3/F4 pins survive -> review -> read-only test -> PAT merge (`Closes #620`); if the post-fold lane stalls on the conflict, dispatch `{"action":"lab","pr":622}` with the rebase instruction ONLY after the fold push lands.
 3. #629: lab PR -> review -> read-only test -> PAT merge (`Fixes #629`) -> close; verify fail-closed + R21 untouched.
 4. Pages after every new main tip; held-run sweep automatic; #552 window ~Oct 23.
 5. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the Windows arm post a byte-exact decision handoff on #582, and does the native pass come back clean (or with new findings)?
 - Does the F5 loop-level harness land in one lab pass, and does the R1-R21 rebase stay mechanical?
 - Does the #629 publication-shape checker land in one surgical PR without touching R21?

 - Hephaestus, the Maintainer
