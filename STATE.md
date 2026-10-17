# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39056770955 (owner-dispatched recovery tick after the 17:12Z api_key_expired outage: keyless fix live on main `e5a99ec1`; review #614 re-dispatched on `e561a42a`, lean lab #609 re-dispatched, build #615 re-dispatched; review-gate findings-loss residual filed; zero held runs, pages fresh; decisions [review 614, lab 609, build 615, create_issue])**

## PRs & Issues
 - **Open PRs:** **#614** (lab vehicle for #612, head `e561a42a`, body `Closes #612`, 4 commits, MERGEABLE/UNSTABLE only from the documented bot-actor red): round-1 review died mid-comment at 17:12:06Z with a hidden `fix` verdict (decision file present, no comment ever posted); **`review` re-dispatched this run on the unchanged head**; on a published approve -> read-only infra test -> PAT-backed merge (`Closes #612`); findings -> the workflow forwards `lab` (infra PR). **#609** (lab vehicle for #608; head `23769cd8`, MERGEABLE/CLEAN; round-2 F1 findings stand on-thread at 15:59:33Z): the 17:06 lean retry was killed by the outage at ~6m (nothing pushed); **`lab` re-dispatched this run with a lean resume instruction**; ceiling ~60m under CURRENT main (the #614 raise is not on main until #614 merges); on push -> review round 3 -> read-only infra test -> PAT-backed merge (`Closes #608`).
 - **Merged:** #610 (Windows fix vehicle for #582; `Refs #582` only) as `5b65c701` at 16:55:57Z - all gates on `d7b15504`. Earlier today: #613 -> `c1a27582`; #606, #607. Main tip `e5a99ec1` (owner keyless commit 18:06:48Z).
 - **#582 NATIVE ARMS (LAST GATE):** Windows fix merged. Final step is the native re-run PAIR (`test-macos` + `test-windows` on #582, same final tip). **Still sequenced behind #609 (report contract) AND #614 (MSYS handoff fix) merging**; the instance that merges the second dispatches the pair in-run. Fallback bound: if either lane exhausts its retry ladder unmerged, dispatch the pair anyway and track that lane's native proof separately. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for that verified-complete PR.
 - **Issues:** **#615** (tier shadowing: exported `MAZE_CHASE_TIER` overrides `--tier`; `main.rs:541-544` + `backend.rs:115-117`; plus the `tester_windows_cli.rs:11-12` doc phrase) - the outage burned the build + 3 auto-retries (ladder exhausted; six empty baseline branches `opencode/issue615-20261017*` at `5b65c701`, no commits); **fresh `build` dispatched this run**. **NEW RESIDUAL (created this run)**: review-gate findings-loss window (decision file present + comment post died -> verdict forwarded with zero published findings); UNTRIAGED, its create_issue self-dispatch owns routing. **#612** closes via #614; **#608** closes via #609; **#582** parent tracker (OPEN, Refs spine intact); **#552** owner window (~Oct 23); #70/#42 standing boards; #611 closed at #613's merge.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries vs 19 live non-maintainer agent workflow names: auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli, pet-release; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment are GitHub-native). Held `action_required`: 0 repo-wide. Failures: the 17:12-17:15Z `api_key_expired` burst (review 39052018409, lab 39052271660/39052712983, opencode build x3 39052623944/39052713149/39052739971, maintainer x8 39052738304/39052807903/39052812830/39052847868/39052853698/39052890536/39052892808/39052898002 - all outage-owned and now recovered by this run's re-dispatches) plus the two documented lab timeouts and the older bot-actor reds. Queued zombies: the documented set (issue532 pr-trigger 37344324101; lab-427 x3 36101155868/8551/8544). Pages fresh on `e5a99ec1` (39056710071 success 18:07:19Z). Untriaged issues: none besides the new residual (self-dispatch).
 - **AUTH/MODEL STATE (new standing watch):** the owner dropped `OPENCODE_API_KEY` from every agent workflow (`e5a99ec1`, "keyless experiment"); verified zero `OPENCODE_API_KEY` references remain in any workflow, the composite action and audit script never referenced it, `OPENROUTER_API_KEY` stays mapped, and maintainer.yml inline env was cleaned too. This run's liveness is the maintainer-arm proof; the three re-dispatched gates are the composite-arm proofs. Pin remains `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder).

## IN FLIGHT
 - **#614 RE-REVIEW (dispatched this run):** head `e561a42a`; round 1 produced a hidden `fix` verdict with no published findings (reviewer died at the comment post 17:12:06Z). On published approve -> read-only infra test -> PAT merge (`Closes #612`); published findings -> expect the workflow's own `lab` forward (verify it fired if absent).
 - **#609 LEAN LAB RETRY (dispatched this run):** round-2 F1 absorption (anchored forward-step gate + post-before-forward order assert in `silent-stall-audit.sh:748,750` + same-pass non-blocking hardening). Ceiling ~60m UNTIL #614 merges; second ceiling hit after the raise is on main -> escalate per the ladder.
 - **#615 BUILD (dispatched this run):** fresh dispatch (ladder exhausted by the outage, not by real failures). Small terminal fix; product code -> on push -> review -> test -> merge (`Closes #615`).
 - **NEW RESIDUAL ISSUE (created this run):** review-gate findings-loss; self-dispatch owns triage; verify a routing dispatch landed next tick, else `lab`.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/ls-remote, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicles #427/#429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. Read the three re-dispatches (anti-duplicate on each): #614 review verdict; #609 lab progress; #615 build. If a gate is still live, do not re-dispatch.
   2. AUTH FAILURE WATCH: if any re-dispatched gate dies on auth again (a new `api_key_expired`/auth error under the keyless path), dispatch `lab` immediately with the run link and stop re-dispatching that gate.
   3. NATIVE PAIR (first action): once #609 AND #614 are merged -> dispatch `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run (the instance that merges the second does it). Then read both reports; fully green -> fold the parity rows and take the #552 retirement decision; defects -> `fix` with the report evidence. If a lane exhausts retries unmerged, dispatch the pair anyway and track that lane separately.
   4. #615: on push -> review -> test -> merge (`Closes #615`).
   5. New residual issue: confirm triage routed it (routing dispatch visible); else `lab`.
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Do the three re-dispatched gates run green under the keyless auth (first composite-arm runs after `e5a99ec1`)?
  - Does #614's fresh review approve, or reproduce the hidden `fix` verdict (and publish it this time)?
  - Does the #609 lean pass land inside the 60m ceiling without the #614 raise?
  - Does #615 land the tier-shadowing fix?
  - Does the new review-gate residual get triaged and hardened (outcome=failure + decision file = crash, or comment-landed evidence)?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
