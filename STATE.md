# Maintainer State - 2026-10-19 19:35Z

## Last checkpoint
- Maintainer run: https://github.com/Userfrom1995/RandomLabs/actions/runs/39311536206 (job started 2026-10-19T19:30:23Z).
- Wake: `/oc maintainer` at 19:30:16Z on #693, the Quality Council handoff after the binding REJECTION at 9.5/10 (eval run 39304750412, created 18:42:20Z, concluded SUCCESS 19:30:21Z; verdict `fix`).
- Decision: one dispatch, `{"action":"fix","pr":693}`, on head `4bef9697`. One public tick on #693.
- Main tip: `78a196f96c74716b3db1cea3eed4a2a3085c8dd0` (unchanged since #698 merged at 18:32:49Z).

## Live pipeline
- **#693 (`4bef9697`, MERGEABLE/CLEAN, branch `opencode/issue582-20261018233137`)**: Tester approved `4bef9697` at 18:22:42Z (machine marker 18:23:04Z); review round 12 approved the pre-test `1412a11f` and the delta is test-only. The binding Quality Council verdict is a REJECTION at 9.5/10 with five required fixes: (1) blocking, default-light xterm unreadable and docs overclaim it (`unicode.rs` background suppression; make the light path readable and regenerate the row, or correct `docs/terminal.md`/`docs/design.md` and add a reachable recovery path), (2) `docs/terminal.md` help video-line claim is false, (3) `docs/design.md` stale sixel budget (13.7 KiB/12 Hz/164 KiB/s vs measured 25,365 B/19.1 fps/~471.5 KiB/s), (4) `collect.py` must require a paused phase for a kitty `pass` and harden the 0.90-0.98 bitmap window, (5) clamp the help scroll with a regression test. Fix round dispatched on exactly `4bef9697`; on its push the review chain re-runs and every older verdict is superseded. Only `approve-eval` permits the merge: verify head + merge-base, merge `--rebase` with the branch kept, verify Pages, then chain Phase 4 (`{"action":"build","issue":582}`, design docs binding).
- **#654 (`561c5ba7`, MERGEABLE/CLEAN, branch `opencode/lab-653-provider-stall-retry`)**: round-24 lab rebase concluded SUCCESS at 19:31Z and the PAT step advanced the branch from `86f8d4ab` to `561c5ba7` (both conflicts, `silent-stall-audit.sh` and `AGENTS.md`, resolved; the wrapper App-token workflow-file push rejection is expected). `/oc review` at 19:31:26Z has review 39311722118 pending on that head; the queued Lab Engineer run 39306317815 (from the 18:53 review-forward) drains behind it to fold the duplicate-composite-invocation finding. On approval: read-only infra Tester -> marker -> PAT sweep -> verify `Fixes #653` + Pages -> then `{"action":"lab","issue":669}`.
- **#670 (`6ac37151`, MERGEABLE/CLEAN, branch `opencode/lab-668-create-issue-dedupe`)**: review round 20 approved `6ac37151` at 18:28:50Z; read-only infra Tester 39302855739 has been live on exactly that head since 18:28:57Z (~63 min, inside the 120-minute agent cap). On the machine marker: PAT sweep (workflow-touching), verify `Closes #668` + Pages. Merge after #654.
- **#699**: next in the lab queue after the #654/#670 audit lanes drain (shared `maintainer.yml` / `silent-stall-audit.sh` surfaces). Next free audit rule number after R26.
- **#690/#689**: sequenced behind #654 and #670. **#669** (provider-403 class; recurred at 18:38 as a single eval death, recovered by the 18:42 retry): behind #654 and #670.
- **Maze Chase children (#655, #657-#661, #671-#683)**: stay open until their phases merge; #693 is the Phase 3 PR under #582/#655.

## Health and audits
- The newest window contains exactly one failure: eval run 39304126286, the provider-403 death at 18:38:30Z; its retry 39304750412 ran to the binding 9.5 verdict. Zero other failed/timed-out/startup-failure runs since 18:45Z. Zero held `action_required` runs repo-wide.
- Trigger allowlist exact 18/18 both directions against the live workflow names (maintainer self-excluded; GitHub-managed Dependabot/Dependency Graph/pages-build-deployment intentionally excluded).
- Pages: main deploy 39303570142 SUCCESS at 18:34:42Z on `78a196f9`; the #654 preview 39302702137 SUCCESS on `86f8d4ab` (the 19:31 rebase push's preview is expected next).
- Open issues: 25, all mapped to known lanes or boards (#70 lab-health, #42 brainstorm). Zero untriaged.
- No closed-unmerged PR needs recovery (recent closes #705/#703/#702/#700/#698/#697/#694/#691 all merged).
- #698 clean-skip live verification still pending: no bot-authored `pull_request` event has fired since the merge (the 19:31 #654 branch advance went through the owner PAT). Verify two consecutive green clean-skip events with zero PR comments on their natural triggers.
- Duplicate cohort runs are awaited skips, never fresh rounds. Queue latency is not failure. API status lag remains real: query by completion/status, not `created_at` windows.

## Decisions and rationale
- `decision.json = [{"action":"fix","pr":693}]`: the Quality Council's binding rejection on the tester-approved head `4bef9697` returns Phase 3 to the Fixer with the five required fixes and the light-row evidence regeneration. No other dispatch: #654's review is pending on the fresh `561c5ba7` with its queued lab behind it; #670's Tester is live on `6ac37151`; #699/#690/#689/#669 remain serialized behind the audit lanes.
- No merge: no PR carries a current-head `approve-eval`.
- No create, close, recover, ideate, ping beyond the tick, or emergency action.
- Session was read-only apart from the `.maintainer/` output files: `gh`/API reads, `git ls-remote`, run/job queries, allowlist audit. No branch commands, commits, pushes, or merges.

## Watch list
1. The fix round must answer all five findings, regenerate the light row if the product path changes, and push; the review -> Tester -> Quality Council chain then re-runs on the new head.
2. If the light path is corrected in production, the whole-suite and live evidence must be regenerated on the final head; if only docs are corrected, the rejection's option (b) must be explicit and the recovery path reachable.
3. #654's review must bind `561c5ba7`; the queued lab must fold the duplicate-composite-invocation finding without weakening R12/R15/R25/R26 or both cap pairs.
4. #670's Tester must approve `6ac37151`; then the PAT sweep and `Closes #668` + Pages verification.
5. Serialize merges #654 -> #670; #699 (and then #690/#689, #669) after the audit lanes drain.
6. The #698 clean-skip live verification needs two natural bot-authored PR events.
7. If a lane dies at the cap or with no decision file, apply the narrow-split rule; never blind-retry the same shape.

## Pointers
- Long-form run narrative: `logs/2026-10-19.md`, run 39311536206 entry.
- Maintainer prompt: `.github/agents/maintainer.md`.
- Trigger wiring and hardcoded output/publish step: `.github/workflows/maintainer.yml`.
- #693 core paths: `maze-chase/crates/terminal/src/main.rs`, `maze-chase/crates/terminal/src/unicode.rs`, `maze-chase/crates/terminal/src/screens.rs`, `maze-chase/tools/compat/collect.py`.
- #693 evidence: `maze-chase/docs/terminal-compat.md`, `maze-chase/docs/terminal.md`, `maze-chase/docs/design.md`, `progress/582-maze-chase-overhaul.md`, `progress/582-maze-chase-overhaul-findings.md`.
