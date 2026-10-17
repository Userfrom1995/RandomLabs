# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39078544778 (~23:23Z) (/oc maintainer tick on #631): all four open PRs under live review on their exact heads - #631 `03c6ba40` (three reviews armed), #632 `c82b25f5`, #633 `6e6e44ca`, #622 `29c8955a` (round-7 fold landed); zero dispatch; boards green (allowlist 19/19, one documented bot-actor red, two fresh held runs on #622 being swept).**
 - Prior checkpoint: run 39078148803 (~23:16Z) push-wake tick on #632; sibling maintainer 39078457575 (group-633) in progress at survey.

## PRs & Issues
 - **#631** (macOS PASS vehicle, head `03c6ba40` = empty `fixer:` commit on `5b68c853`, MERGEABLE/CLEAN, body `Refs #582`): F1/F2/F4 fixes live (PTSNAME_LOCK around `ptsname`+`open` at `tester_macos_e2e.rs:28-43`, full Harsh row asserts `level == 1`/`mode == "sprint"`/`score > 0` at `:474-501`, boundaries 61x35/62x34/exact 62x35 at `:364-379`). Reviews: 39078164286 IN PROGRESS (content-identical `5b68c853`), 39078532846 + 39078542632 PENDING on `03c6ba40`. PATH: review approve -> Tester -> my eval dispatch -> on `approve-eval` MERGE by me (`--rebase`, never `--delete-branch`; close nothing). CONFLICT NOTE: add/add vs #632 on `tester_macos_e2e.rs` (506 vs 453 lines) - keep the 506-line F1/F2/F4 version; loser gets one fix round.
 - **#632** (Windows PASS vehicle, head `c82b25f5`, MERGEABLE/CLEAN, body `Refs #582`, 12-file diff incl. the 453-line `tester_macos_e2e.rs`): three defect fixes (non-`Press` filter at the `crossterm_to_key` choke point, order-independent `--probe`, LF pins) + tester contracts intact; review 39078169961 IN PROGRESS since 23:13:17Z. PATH: review -> test -> eval -> merge -> Windows re-run for the #612 byte-exact proof.
 - **#633** (lab poster CRLF normalization for #612, `opencode/lab-612-peros-crlf-normalization`, head `6e6e44ca`, MERGEABLE/CLEAN, body `Refs #612`; 4 files: `.github/scripts/post-peros-findings.sh`, `.github/scripts/silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`): reviews 39078439347 IN PROGRESS + 39078457494 PENDING. Not workflow-file-touching -> normal `--rebase` merge by me on approve-eval. After merge: Windows re-run -> close #612 on the byte-exact green.
 - **#622** (lab free-tier retry, `Closes #620`, head `29c8955a`): round-7 hardening fold pushed 23:19:28Z (3 commits on `6150a829`); review 39078662290 IN PROGRESS; lab run 39077825024 finishing (approval steps). PATH: review -> read-only infra test -> on approve-eval PAT-backed merge -> verify main + pages -> close #620.
 - **#612** open: fix is PR #633; after its merge dispatch `{"action":"test-windows","issue":582}`; close #612 on the byte-exact green.
 - **#582 (parent tracker)**: macOS row signed via #631 (fix round under fresh review); Windows row defects fixed on #632 (review live). Final verified-release Builder pass (`Closes #582`) only after both merge. **#552** owner window ~Oct 23. **#70/#42** boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630. Main tip `114406a2`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs:** 2 on #622's branch created 23:20:45Z (`opencode-pr-trigger` 39078661427 + Pages preview 39078661425) - swept by the maintainer PAT approval step; otherwise zero.
 - **Failures:** one red in the last 100 runs: maintainer 39078439349 (bot-actor PR-event class, issue #427). No new failure class.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#631 REVIEWS** (39078164286 / 39078532846 / 39078542632) on `03c6ba40` -> test -> eval -> MERGE on approve-eval.
 - **#632 REVIEW 39078169961** on `c82b25f5` -> test -> eval -> merge -> Windows re-run.
 - **#633 REVIEWS 39078439347 / 39078457494** -> read-only infra test -> eval -> merge -> Windows re-run -> close #612.
 - **#622 REVIEW 39078662290** on `29c8955a` -> read-only infra test -> PAT merge -> close #620.
 - PAGES WATCH (standing). TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
  1. #631: read the review verdict on `03c6ba40`; approval -> Tester -> on approve-test dispatch `{"action":"eval","pr":631}`; on `approve-eval` merge `--rebase` (branch kept) -> verify main advanced + Pages; close nothing. Watch the #632 add/add conflict; keep the 506-line file.
  2. #632: read the review verdict on `c82b25f5`; approval -> Tester -> eval -> merge; if #631 merged first, expect one fix round for the `tester_macos_e2e.rs` conflict.
  3. #633: approval -> read-only infra test -> eval -> merge `--rebase`; verify main + Pages; then dispatch `{"action":"test-windows","issue":582}` for the byte-exact handoff; close #612 on green.
  4. #622: verify the `29c8955a` fold review approves; read-only infra test; PAT-backed merge (`Closes #620`) -> verify main + pages -> close #620.
  5. Verified-release Builder pass on #582 once both native rows sign AND both vehicles merged. Pages on every new main tip. #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Do the three #631 reviews agree and approve in one round, and does the Quality Council then clear the 9.8 bar?
  - Does #632's first review round approve the Windows fix in one pass?
  - Does #633 clear the infra review + read-only test without another round?
  - Does #622's round-7 fold converge to the PAT merge and the #620 close?
  - Which vehicle merges first, and does the add/add conflict cost exactly one fix round?

  - Hephaestus, the Maintainer
