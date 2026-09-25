# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T00:38Z (maintainer run 36078442734, PR #412 STILL REVERTED e3486e26 - recover pending 36078442709 + lab in_progress 36078419561, PR #419 a3e9be60 review pending, PR #413 d7b66be review pending, main f1412e9 LIVE Deploy green 36078446619)**
 - **INFRA HAZARD STILL PENDING:** `opencode-review.yml:145-158` reverted PR #412 from `9842ba14` to `e3486e26` on run 36072452033. Recovery `{"action":"recover","pr":412}` dispatched 00:37:43Z (run 36078149885) still pending 36078442709 + Lab `{"action":"lab","issue":70}` in_progress 36078419561 to harden restore step. `9842ba14` fetchable, 28 ahead / 1 behind f1412e9 (merge_base d25e1e70).
 - **Deploy STILL GREEN:** `origin/main` = `f1412e9bc71c6aab7dace85da51b488728e8d6bc` verified via `git ls-remote origin/main` == f1412e9 and `gh api refs/heads/main` == f1412e9. `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, 16 workflow `model:` pins `mimo-v2.6-flash-free`. Deploy 36078446619 success on f1412e9, PR-preview branch successes confirm staging.

## STANDING OWNER DIRECTIVES (active)
 - **GUI HANG DIRECTIVE (2026-09-24T21:34:25Z, via #387):** Owner reports GUI hang, requires robust GUI support. Must investigate, keep Linux parity.
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00Z, via #387):** Research Tor/proxy CLI improvements - landed as PR #413 + Architect six phases.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387):** Every project must have browsable site at `/<project>/index.html`. Curator PR #412 Fixes #411 at 9842ba14 (now reverting, recovery pending).
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70):** RESOLVED at f1412e9. Two-knob switch verified.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397):** Enforce Unified Documentation Invariant - codified.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** M1-M5 MERGED Refs #387, Lab CI+repairs MERGED, v2+GUI research+architect in PR #413.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live.

## CRITICAL INFRASTRUCTURE STATE
 - **Main f1412e9 LIVE:** `git ls-remote` == f1412e9, `gh api refs/heads/main` == f1412e9, `maintainer.yml` workflows 18/18 PASS, `opencode.json` two-knob free, `pages.yml` Prune dangling step live, Strip escaping step on branch a3e9be60 only.
 - **Review workflow hazard:** `opencode-review.yml` restore step equates remote-head drift with reviewer dirtiness; hardened via Lab on #70 (compare `git rev-parse HEAD` before/after or fail loudly, never push back on drift alone). No `workflows permission` rejection, no CreditsError.
 - **Trigger-list 18/18 PASS:** maintainer.yml workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli] - live 20 (18 relevant + maintainer + Dependency Graph).
 - **Architect branch:** `opencode/issue387-20260924215528-architect` at 68250386 2 commits, `progress/387-tor-cli.md` six phases.

## IN FLIGHT
 - **Curator PR #412 STILL REVERTED - recovery pending:** `opencode/issue411-curate-tor-cli-site` remote head `e3486e2694366ab6a28a65b2795bfba896eb7b99` (reverted from `9842ba14e02df19f1887e3910089aeb2466b8662` by review run 36072452033). `9842ba14` still fetchable (gh api 200), 13 Fixer commits orphaned. Reviewer at 9842 left 3 blocking +1 major +3 minor (fuzz corruption `prism:599`, bench-x PATH `prism:701`, bench_vs_codecs Pillow/dangling `prism:702`, Windows $SHELL `tor-cli:624/778`). `opencode-recover` 36078442709 pending + Lab 36078419561 in_progress already dispatched - cooldown holds, no duplicate this run. Next after recovery: `{"action":"fix","pr":412}` with `Refs #411` (infra guard PASS).
 - **Lab pages hardening PR #419 OPEN head a3e9be60 MERGEABLE CLEAN review pending:** `opencode/lab-417-pages-symlink-boundary` (41 lines pages.yml, escaping strip). Review pending 36077372707 - await verdict, no duplicate.
 - **Research PR #413 OPEN head d7b66be MERGEABLE review pending 36075848072:** `opencode/issue387-20260924212038` 14 commits. Review pending - await verdict, no duplicate.
 - **Lab infra hardening for review.yml:** `{"action":"lab","issue":70}` in_progress 36078419561 to fix `opencode-review.yml:145-158`. No `fix`/`continue` ever on infra PRs.
 - **Deploy on main f1412e9 VERIFIED GREEN:** 36078446619 success 00:38:13Z. Prior dangling outage resolved.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED Refs #387 -> Lab prompt-alignment MERGED d25e1e70 -> PR #416 MERGED f1412e9 Closes #415 Deploy green -> PR #412 at 9842ba14 reverted to e3486 by review workflow hazard -> Recover pending 36078442709 + Lab hardening in_progress 36078419561 -> PR #419 review pending -> PR #413 review pending -> after recover PR #412 needs Fixer (3 blocking +1 major) -> Tester/Evaluator -> merges.

## NEXT-RUN PLAYBOOK
 1. Watch Recover 36078442709: verify `git ls-remote origin opencode/issue411-curate-tor-cli-site` returns `9842ba14`, `gh pr view 412 --json headRefOid` == 9842ba14, `git merge-base origin/main 9842ba14` present (non-orphan, expect d25e1e70 base; may need rebase onto f1412e9 diverged by 1). If succeeded, dispatch `{"action":"fix","pr":412}` for 3 blocking +1 major + minors with `Refs #411`. If failed/pending timeout >30m, retry recover with SHA push and log.
 2. Watch Lab 36078419561 on #70 for `opencode-review.yml` fix: verify diff touches `opencode-review.yml:145-158` restore step now compares local HEAD before/after or drops force-push; no `workflows permission` rejection; trigger-list stays 18/18.
 3. Watch Reviewer on PR #419 at a3e9be60: on `/oc approve` dispatch Tester hostile fixture, on `/oc fix` dispatch Lab. Cooldown 30m holds.
 4. Watch Reviewer on PR #413 at d7b66be: on `/oc approve` merge Refs #387 then chain Phase 1 verification; on `/oc fix`/`continue` route to Builder/Fixer.
 5. Cooldown: no second dispatch for same workflow+branch within 30m while in_progress/pending.

## ISSUES
 - **#412** - OPEN PR curate: tor-cli + Prism sites (Fixes #411, REMOTE STILL REVERTED e3486e26, recover pending 36078442709 to 9842ba14, 13 Fixer commits fetchable, 3 blocking +1 major pending fix)
 - **#411** - OPEN [Curator] Build tor-cli and Prism sites + every-project-site rule (PR #412 Fixes, recovery pending)
 - **#419** - OPEN PR lab: strip escaping symlinks (Closes #417, head a3e9be60 MERGEABLE CLEAN review pending)
 - **#417** - OPEN [Infra] Harden Pages staging against escaping symlink exfiltration (PR #419)
 - **#413** - OPEN PR Phase 1 Diagnostics (Refs #387, head d7b66be review pending)
 - **#70** - OPEN lab-health (Deploy green 36078446619, review.yml hazard Lab in_progress 36078419561)
 - **#42** - OPEN brainstorm

## OPEN QUESTIONS
 - Will Recover 36078442709 restore 9842ba14 before queued review evaluates reverted e3486e26 (which would re-block on already-fixed 4+3 findings)?
 - Will Lab's opencode-review.yml fix (local HEAD compare vs remote drift) land without breaking trigger-list 18/18?
 - Will Fixer on 9842ba14 clear the 3 blocking (fuzz ctest scope, bench-x PATH, bench_vs_codecs Pillow/dangling + Pillow disclosure) and Windows $SHELL so Reviewer can approve?

   - Hephaestus, the Maintainer
