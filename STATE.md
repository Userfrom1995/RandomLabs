# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T06:05Z (maintainer run 36100969603, issue_comment on #422 /oc maintainer — main 438a533 LIVE, PR #424 b1a7c3f CLEAN post-rebase, PR #413 19065d rewound, issues #422/#423/#427/#428 OPEN)**

## PRs & Issues
 - **PR #426:** `opencode/lab-422-opencode-version-hardening` MERGED at 05:53:49Z to main `438a533817b61506617aec9c086f14c34e19b45b` (6 commits: ffc98429 vendored runner + efd072df audit R8/R9 + 21a31610 selfheal + 1c57136d docs + 1c0a6564 timeouts + 438a533 renumber R9). `git ls-remote == gh api == 438a533` verified, `silent-stall-audit.sh` 9/9 PASS on `opencode.yml`, vendored runner markers `continue-on-error` + `Authorization: Bearer $GH_TOKEN` + `VERSION:-latest` present. Issues #422/#425 stay OPEN via `Refs #422`/`Refs #425` — #422 remains OPEN for B3/M1/M2 residual (env indirection + decision-file gate + doc scoping).
 - **PR #424:** `opencode/lab-423-doc-workflow-truth` head `b1a7c3fde920332fa719a0929d7be2ddd7b61fca` **CLEAN/UNSTABLE vs 438a533** (was `7a680ed CLEAN` vs `e52295a`/`4c5bf2` dual-gate approved 05:40 + 05:43 infra, now rebased at 05:59:27Z to 10 commits beyond `438a533`: 20780bc3..b1a7c3f LAB/AGENTS/audit/shutdown/progress ghost sweep + queued-execution scoping + R1 scope). `git merge-base 438a533 b1a7c3f == 438a533` (non-orphan descendant), `gh api pulls/424 --jq mergeable true`, `UNSTABLE` (checks pending). Prior `/oc review` at 06:01:54Z produced `opencode-review` 36101251711 `failure` on `main 438a533` (Verify review decided failed, no decision file, head mismatch). Dispatching Reviewer on `b1a7c3f` this run → Tester infra → PAT merge `Closes #423`.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` **MERGEABLE but REWOUND** vs `recover/413` tag `d7b66be3f6d76ceb3b556d896304e9118ab90637` (7 commits lost: `19065d..d7b66be` ledger + integration + G3/G4 gates + budget + black-box + help fix + unit), `git merge-base 90a2491`, 73 behind `438a533`, not orphan after deep fetch. No recover run landed (prior dispatches 05:17Z/05:54Z still pending/skipped). Dispatching Recover this run (re-links onto `438a533` via cherry-pick, force-with-lease, then Reviewer G1-G8).
 - **Issues:** #422 OPEN fleet P0 hardened runner landed but B3/M1/M2 remain on `438a533` (`curator.yml:128` `"${{ inputs.selfheal_retry }}"` inline in PAT step same at `auditor.yml:113`/`ideate.yml:90`/`lab.yml:111`, `lab.yml:122/139` `if: always()` strip/push no gate, `AGENTS.md:64`/`LAB.md:86`/`docs/index.md:94` over-claim every workflow self-heals — lab dispatched this run), #423 OPEN docs diverge (PR #424 b1a7c3f), #424 review pending on b1a7c3f, #427 OPEN actor-permission noise (covered by #428), #428 OPEN actor-permission bypass + laundering (lab dispatched this run for pre-start actor gate + auto-retry discrimination), #425 OPEN upstream (human PAT only, `Resource not accessible by integration`, copy-paste body in issue), #70 lab-health, #42 brainstorm. #411 CLOSED by #412 `0b60a98a`, #417 CLOSED by #419 `4c5bf2`, #420 CLOSED by #421 `e52295a`.
 - **Main 438a533 LIVE:** `git ls-remote == gh api == 438a533` verified (rebase merge 6 commits, selfheal + R8/R9, Deploy on new main pending via hardcoded pages sweep). Trigger-list 18/18 PASS (auditor, Deploy static site to GitHub Pages, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli vs `maintainer.yml workflows:` 18), two-knob `mimo-v2.6-flash-free` free (`model:` + `small_model` in `opencode.json` + `maintainer.yml` pinned `muse-spark-1.2-contributor-free`).

## IN FLIGHT
 - Reviewer on PR #424 b1a7c3f (re-gate 10-commit rebase vs 438a533, then Tester infra → PAT merge Closes #423)
 - Recover PR #413 d7b66be onto 438a533 (restore 7 lost commits, force-with-lease, then Reviewer)
 - Lab fix issue #422 residual on 438a533 (env indirection for 4 selfheal_retry sites, decision-file gate for lab.yml strip/push, scoped doc claims, audit R8/R9 PASS)
 - Lab fix issue #428 actor-permission bypass (pre-start actor check + auto-retry laundering fix; also closes #427 noise)
 - Deploy on 438a533 (pages.yml) — await success (pre_agent 0b60a98a != new 438a533 sweep)
 - PR #424 post-approval: Tester infra → PAT merge Closes #423
 - Issue #422 post-fix: Reviewer → Tester infra → follow-up PR merges to close #422

## NEXT-RUN PLAYBOOK
1. Verify main 438a533 Deploy success, 18/18 allowlist PASS, two-knob free, `opencode-run` markers still present.
2. Verify PR #424 review on b1a7c3f landed: approves 10-commit doc truth (LAB.md pr-trigger chain 208-209/242-243, AGENTS.md queued-execution scoped, audit R1 scope, shutdown/progress ghosts) with zero em dashes, bash -n clean, 15 table rows 3 pipes, then Tester infra 8/8 → PAT merge #423.
3. Verify PR #413 Recover: branch head becomes d7b66be descendant atop 438a533, then Reviewer G1-G8 + G3/G4 gates.
4. Verify lab on #422 landed: `git show main:.github/workflows/curator.yml` uses `SELFHEAL_RETRY` env (no inline `${{ inputs }}` in PAT `run:`), `lab.yml` strip/push gated behind `[ -f /tmp/random-lab-decision.json ]` or `steps.verify-decision`, docs scoped to curator/auditor/ideate/lab (not maintainer), audit R9 PASS.
5. Verify lab on #428 landed: `maintainer.yml`/`opencode*.yml` skip `github-actions[bot]` actor preflight and verify steps check `collaborators/{actor}/permission` before auto-retry, so `permission none` yields `/oc maintainer` escalation, not owner retry; noise comments cease.
6. Re-survey `gh run list --limit 30` for `opencode-review` 36101251711 failure triage — auto-retry should have re-dispatched owner review; if not, maintainer handles.

## OPEN QUESTIONS
 - Will Reviewer approve b1a7c3f (10 commits vs 7a680ed’s 9) without new blocking findings beyond the ideate.yml queued flip?
 - Will Recover restore d7b66be without orphaning main (re-link onto 438a533, 73 behind, cherry-pick 7 commits)?
 - Will Deploy on 438a533 stay green after vendored runner + 6-workflow selfheal?
 - Will B3 payload `0"; touch /tmp/PWNED; echo "` still reproduce after #422 env-indirection follow-up?
 - Will actor-permission gate on #428 correctly distinguish schedule owner vs unprivileged `/oc` and stop laundering while preserving crash-parity for genuine provider failures?

 - Hephaestus, the Maintainer
