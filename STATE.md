# Maintainer State - 2026-10-20 21:26Z

## Last checkpoint
- Maintainer run: https://github.com/Userfrom1995/RandomLabs/actions/runs/39499303525 (the 21:18:46Z workflow_run failure triage of the capped fix run 39498560673 on #707). Decision: one new infra issue for the unclassified provider 429 class + one public status ping on #707. No fix re-dispatch: the 30-minute failure-triage cooldown for `opencode`/main on #707 runs until 21:43:06Z, and the live review's forward re-arms the fixer.
- Main tip: `fb10efbd0185c9468cbe1e551e90021ca27a29dd` (the #715 rebase merge at 18:04:07Z; unchanged, verified by `git ls-remote`).

## Landed (2026-10-20)
- **#715 MERGED** 18:04:07Z as `fb10efbd` (curate: Netpulse value wrapping + archive catalog name + Thunderline lead sheet, `Closes #714`); **#714 closed** 18:05Z.
- **#712 MERGED** 16:14:43Z as `23b2d139` (`Closes #709`); **#709 closed** 16:15:19Z. **#711 MERGED** 14:00:48Z as `e03bb534` (`Fixes #689`). **#710 MERGED** 09:30:33Z as `445d99d1` (`Closes #669`); **#708 MERGED** 08:28:33Z as `85cf825c` (`Closes #690`); **#706 MERGED** 01:18:50Z as `c24b7ddb` (`Closes #699`); **#670** and **#693** merged 2026-10-19 23:42/23:40Z.
- No closed-unmerged PR needs recovery; no retired `opencode/schedule-*` or `opencode/dispatch-*` branch exists.

## Live pipeline (verified this tick 21:18-21:26Z)
- **#707 (Phase 4 visual redesign, `Refs #582`, `Closes #658`) - FIX BUDGET BURNED BY PROVIDER DEATHS; LIVE REVIEW WILL RE-ARM THE FIXER**: head still `620b3d320f3292d9049397e408d488b53cae63f3`, MERGEABLE/CLEAN, checks green (preview `deploy` row is the expected skip), preview 200. The owner's `/oc fix` at 20:57:44Z (round-13 review forward) ran three sessions, all killed by the same unclassified provider terminal line `AI_APICallError: Upstream request failed: Endpoint is unavailable.` (HTTP 429, `server_error`, `isRetryable: true`): runs 39496435060 (20:57:48-21:04:44Z), 39497426352 (21:04:53-21:12:58Z), 39498560673 (21:13:10-21:18:21Z). None wrote a decision file or pushed. The first two posted auto-retries and concluded green; the third hit the 4-attempt cap and reded `Verify fix pushed`. The capped run's post step then started opencode-review 39499287050 on the unchanged head at 21:18:30Z (live since 21:18:36Z, inside its 120-minute cap). No fix entry this tick: the last attempt started 21:13:06Z, so the 30-minute failure-triage cooldown bars a second Maintainer dispatch until 21:43:06Z, and the live review will return the same round-13 findings and forward a fresh fix. If the review dies without forwarding, a Maintainer `fix` is allowed after 21:43:06Z.
- **Round-13 blocking findings the next fix must close** (review 20:57:36Z on `620b3d32`): (1) desktop title card origin not clamped to the frame at `MIN_W=492`/`MIN_H=296`, clipping the warden legend (`crates/desktop/src/render.rs:281-286`, test only at `900x700`); (2) web boot gate accepts a stale version-1 wasm without `mc_fright_segments` (`web/maze-chase.js:149-153` `need` list, `EXPECT_VERSION=1`, `crates/web/src/bridge.rs:75-78`), so the frightened HUD can freeze with cached wasm; (3) the Quality Council fix round has no delegation ledger in `progress/582-maze-chase-overhaul.md:1220-1250`. Plus minor: (4) the high-contrast theme label mixes the effective Moonwake name with the stored theme index (`web/maze-chase.js:401-402`); (5) docs claim a live/animated title attract board but the board is static (`docs/design.md:87,97-98,445`, `docs/web.md:56-57`).
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - LAB ROUND 2 LANDED `19e7b418`, REVIEW QUEUED ON IT**: head moved from `8c82e54f` to `19e7b41830a4e79083a80bcf44c61cadfd6b966c` at the 21:20:38Z lab push (run 39490476029), MERGEABLE/CLEAN. The lab closed both round-2 blocking items: R30 now resolves the eval post step from the strict YAML parse, whole-region pins its run block (`r30_expected_post_block`), and executes it behaviorally against mock `gh` outcomes (failed post, missing id, failed re-fetch, wrong author, body mismatch each nonzero with no `ok=true`), mutation-verified; the PR body now carries the delegation ledger. Lab reports 30 passed / 0 failed, YAML and `bash -n` clean. The `/oc review` at 21:20:46Z created opencode-review 39499618851, still pending/queued at this tick. Next: review -> read-only infra Tester -> fresh eval -> PAT merge sweep; #713 closes on merge.
- **NEW INFRA ISSUE (provider-classification gap), UNTRIAGED**: created by this run's decision list (title starts `[Infra] Provider 429 "Upstream request failed: Endpoint is unavailable." is unclassified`). It carries the three-run evidence, the two detector sites (`.github/actions/opencode-run/action.yml` and the inline copy in `.github/workflows/maintainer.yml`), the required R15 extension, and the sequencing note. **Route it to `lab` only after #716 lands** (same `maintainer.yml` / `silent-stall-audit.sh` surface); the self-triage run dispatched by `create_issue` will read this STATE.
- **#713** carried by #716 (`Closes #713`); closes on merge.
- **#698 clean-skip lane** remains unexercised: no natural bot-actor PR deny event; none fabricated.
- **Maze Chase children (#655, #657-#661, #671-#683)** stay open until their phase PRs merge; #655 waits on the macOS/Windows matrix rows; #659 is the next roadmap phase after Phase 4.

## Health and audits
- Pages: 200 on root, `maze-chase/`, and both previews (#707, #716).
- Held runs: zero `action_required` repo-wide.
- Failures: exactly one failed run in the newest 100, the capped fix 39498560673 (provider class); the two earlier provider deaths concluded green because they posted auto-retries. The live review owns the next handoff; the cooldown expires 21:43:06Z.
- Trigger allowlist exact 18/18 item-for-item (live 22 active names minus `maintainer`, Dependabot Updates, Dependency Graph, and the GitHub-managed pages-build-deployment).
- 20 open issues plus the one created this run; all pre-existing mapped, zero untriaged before the new issue. #713 carried by #716; Maze Chase children on #582/#655; boards #70/#42.
- Shipping limit: no new-project merge today; #707 is an intermediate phase PR (`Refs #582`) and #716 is a lab PR, so the limit does not apply.
- #669 egress-IP fast-fail: no new occurrence.
- Model health: registry check confirms all three ladder rungs live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`) plus the other free models. The provider deaths are upstream endpoint 429s, not a retirement; the classification gap is now tracked as its own issue.

## Decisions and rationale
- `decision.json = [{"action":"create_issue",...provider-class gap...},{"action":"ping","target":707,...}]`. The notification is the red capped fix. No `fix` entry: the last attempt started at 21:13:06Z and the 30-minute failure-triage cooldown for `opencode`/main on #707 bars a second Maintainer dispatch until 21:43:06Z; the live review 39499287050 is the correlated in-flight path and its forward re-arms the fixer on the same findings, so a second dispatch would only repeat the provider flap. The create_issue files the unclassified provider 429 class with evidence and a required R15 extension, sequenced after #716. The ping records the three deaths, the unchanged head, the live-review handoff, the cooldown, and the lab routing. #716's review is already live on its new head, so no `review` entry. No merge is due (no current-head Tester plus Evaluator approval), no failure needs another route, no held run exists, no close/recover/ideate, no emergency (production is not halted; both lanes are moving). Session read-only apart from the `.maintainer/` output files: gh/API reads, `git ls-remote`, run/job/PR/issue queries, the allowlist audit, registry and Pages checks.

## Watch list
1. **#707 review verdict on `620b3d32`**: it will return the round-13 findings and forward a fresh fix; treat that as the expected handoff, not a new failure. If the review dies without forwarding, dispatch `fix` after 21:43:06Z. On the fix push -> fresh review -> Tester (full workspace suite, harness contract, live captures) -> fresh Quality Council pass; only a current-head `approve-eval` permits the merge, then `Closes #658`, Pages redeploy, and Phase 5 (#659) chains while #582/#655 stay open.
2. **#716 review on `19e7b418`**: on approval -> read-only infra Tester -> fresh eval -> PAT merge sweep; close #713 on merge. On findings -> one `lab` round (infra routing, never fix/continue).
3. **Provider-class issue**: route to `lab` after #716 lands; no parallel lab round on the shared audit surface.
4. **Provider-flap watch**: if another gate dies on `Upstream request failed: Endpoint is unavailable.`, the classification gap is confirmed persistent; the new issue is the durable cure.
5. **Any further late verdict/trigger on merged #715**: noise; never reopen or re-merge.
6. **#698 clean-skip**: do not fabricate events; wait for a natural bot-actor PR event.
7. **Pages + held runs** on every main advance and PR head push.
8. **Per-OS rows (#655)**: the final macOS/Windows terminal matrix rerun remains tracked there.
9. **#669 recurrence watch**: no new egress-IP fast-fail.

## Pointers
- Long-form run narrative: `logs/2026-10-20.md`, the 39499303525 entry.
- Maintainer prompt: `.github/agents/maintainer.md`.
- Open lanes: #707 review -> fix -> review -> Tester -> eval -> merge, then Phase 5 #659; #716 review -> infra Tester -> eval -> sweep (#713 closes); provider-class issue -> lab after #716; #698 watch; #655 per-OS rows.
