# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39078457575 (~23:23Z) (`/oc maintainer` summon on #633): #612's poster-fix PR #633 is open (`6e6e44ca`) under live review 39078439347; #631 `03c6ba40` carries a content-neutral empty commit with a fresh review armed (pending 39078532846) and review 39078164286 live on `5b68c853`; #632 `c82b25f5` under live review 39078169961; #622 round-7 fold pushed `29c8955a` by the lab with review 39078662290 live; zero dispatch.**
 - Prior checkpoint: run 39078148803 (~23:16Z) (both native vehicles fixed, fresh reviews live)

## PRs & Issues
 - **#633** (`opencode/lab-612-peros-crlf-normalization`, head `6e6e44ca`, MERGEABLE/UNSTABLE, body `Refs #612`, 4 commits): the #612 lab run 39077103345 completed SUCCESS (report 23:17:15Z) and its runner opened this PR at 23:17:19Z: `d2973cf2` CR normalization on both sides of the exact-body gate + LF-normalized posted copy (`mktemp`, fail closed), `59f79f42` R17 CRLF fixtures + `posted_capture` byte assertion, `72e09934` AGENTS.md/LAB.md contract sync, `6e6e44ca` self-validating fixture (F2 closure). Review run 39078439347 LIVE since 23:17:22Z on exactly this head. The redundant `pull_request` maintainer arm 39078439349 is the documented #427 bot-actor red (CLI refusal comment 23:17:44Z; self-excluded from failure triage). PATH: review approve -> read-only infra Tester (`/oc approve-test`) -> merge by me (non-workflow PR, `--rebase`, never `--delete-branch`) -> verify main + Pages -> dispatch `{"action":"test-windows","issue":582}` for the byte-exact handoff -> close #612 on green.
 - **#631** (macOS PASS vehicle, head `03c6ba40`, UNSTABLE, body `Refs #582`): content identical to `5b68c853` (F1 `PTSNAME_LOCK`, F2 full Harsh row, F4 61x35/62x34/62x35 boundaries); the duplicate `/oc fix` processor verified the applied state and pushed the contractually required empty commit at 23:17:57Z (report 23:18:44Z). Review 39078164286 LIVE on `5b68c853` since 23:13:12Z; the fixer's forward posted `/oc review` at 23:18:46Z -> fresh review pending run 39078532846 on `03c6ba40`. PATH: review approve -> `/oc test` -> eval -> on `approve-eval` MERGE (`--rebase`, branch kept); close nothing; #582 stays open.
 - **#632** (Windows PASS vehicle, head `c82b25f5`, MERGEABLE/CLEAN, body `Refs #582`): three Windows defects fixed (non-Press filter at the `crossterm_to_key` choke point, order-independent `--probe`, LF pins) with the tester contracts intact; review 39078169961 LIVE since 23:13:17Z. PATH: review -> test -> eval -> merge -> Windows re-run.
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `29c8955a`, MERGEABLE/UNSTABLE): lab run 39077825024 pushed the round-7 hardening fold at 23:20:41Z (`d0d14361` four round-7 residuals + anchored tee/tail tripwires, `faa64bdb` AGENTS.md/LAB.md R15 sync, `29c8955a` Addendum VIII) and its forward posted `/oc review` (23:20:44Z) -> review 39078662290 LIVE since 23:20:46Z. PATH: review -> read-only infra test -> PAT-backed merge (workflow-touching PR) -> verify main + pages -> close #620; findings -> lab (never fix/continue on infra).
 - **#612** open: lab side complete via #633; closes ONLY after the Windows re-run proves the byte-exact handoff. **#582 (parent tracker)**: macOS row signed via #631, Windows row via #632, both under review; final verified-release Builder pass (`Closes #582`) only after both merge. **#552** owner window ~Oct 23. **#70/#42** boards. **#620** via #622 on `Closes #620`.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630. Main tip `114406a2` (ls-remote + API agree).
 - **RULE LABELS:** main = R1-R22.
 - **Held runs:** ZERO repo-wide (the empty-commit push's pages/pr-trigger holds were swept automatically).
 - **Failures:** the ONLY failure in the last 200 runs is the documented #427 bot-actor maintainer arm 39078439349 on #633's `pull_request` event (self-excluded by design). Zero timed_out/startup_failure.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#633 REVIEW 39078439347** on `6e6e44ca` -> read-only infra Tester -> MERGE -> Windows re-run for the byte-exact #612 handoff.
 - **#631 REVIEW 39078164286** on `5b68c853` + **fresh REVIEW pending 39078532846** on `03c6ba40` (content-identical empty commit) -> test -> eval -> MERGE on approve-eval.
 - **#632 REVIEW 39078169961** on `c82b25f5` -> test -> eval -> merge -> Windows re-run.
 - **#622 REVIEW 39078662290** on `29c8955a` (round-7 fold) -> read-only infra test -> PAT merge -> close #620.
 - Sibling maintainer 39078544778 (issue_comment 23:19:01Z, target #631) runs in parallel; last-commit-wins on memory files.
 - PAGES WATCH (standing). TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only. Merge-time hazard (standing): #631 and #632 both carry `tester_macos_e2e.rs`; keep the F1/F2/F4 version on the second merge.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
  1. #633: read the review verdict on `6e6e44ca`; approval -> read-only infra Tester -> on `/oc approve-test` merge `--rebase` (branch kept) -> verify main advanced + Pages -> dispatch `{"action":"test-windows","issue":582}`; close #612 on green.
  2. #631: read the review verdicts; approval -> Tester -> eval -> on `approve-eval` merge `--rebase`; close nothing.
  3. #632: same path; then the Windows re-run for the #612 proof.
  4. #622: round-7 fold verdict; approval -> read-only infrastructure test -> PAT merge (`Closes #620`) -> verify main + pages -> close #620.
  5. Verified-release Builder pass on #582 once both native rows sign AND both vehicles merged. Pages on every new main tip. #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does review approve #633's CRLF fix in one round with the audit at 22/0?
  - Do the fresh reviews approve #631 `03c6ba40` and #632 `c82b25f5` in one round, and does the Quality Council then clear the 9.8 bar on #631?
  - Does the #622 round-7 fold converge without another review round?
  - Does the Windows re-run after #633 merges reproduce the byte-exact handoff and close #612?

  - Hephaestus, the Maintainer
