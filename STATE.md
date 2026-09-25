# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T00:36Z (maintainer run 36078149885, PR #412 REVERTED e3486e26 recovery dispatched to 9842ba14, PR #419 a3e9be60 review pending 36077372707, PR #413 d7b66be review pending 36075848072, main f1412e9 LIVE Deploy green 36077371930)**
 - **INFRA HAZARD DISPATCHED:** `opencode-review.yml:145-158` force-reverted PR #412 from `9842ba14` (13 Fixer commits) to `e3486e26` on run 36072452033 (expected e3486 vs actual 9842, branch unprotected, SHA fetchable). Reviewer escalation 00:34Z (run 36072452033 + comments 5824630864) diagnosed hazard + left 3 blocking/1 major for 9842. Recovery `{"action":"recover","pr":412}` dispatched this run to `git push --force origin 9842ba14:refs/heads/opencode/issue411-curate-tor-cli-site` before queued review 36078149981 evaluates reverted head. Lab `{"action":"lab","issue":70}` dispatched to harden restore step (compare local HEAD before/after, never on remote drift).
 - **Deploy STILL GREEN:** `origin/main` = `f1412e9bc71c6aab7dace85da51b488728e8d6bc` verified via `git ls-remote origin/main` == f1412e9 and `gh api refs/heads/main` == f1412e9. `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, 16 workflow `model:` pins `mimo-v2.6-flash-free`. Deploy 36077371930 success on f1412e9, prior dangling prune landed, escaping hardening PR #419 pending.

## STANDING OWNER DIRECTIVES (active)
 - **GUI HANG DIRECTIVE (2026-09-24T21:34:25Z, via #387):** Owner reports GUI hang, requires robust GUI support. Must investigate, keep Linux parity.
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00Z, via #387):** Research Tor/proxy CLI improvements - landed as PR #413 + Architect six phases.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387):** Every project must have browsable site at `/<project>/index.html`. Curator PR #412 Fixes #411 at 9842ba14 (now reverting, recovery in flight).
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70):** RESOLVED at f1412e9. Two-knob switch verified.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397):** Enforce Unified Documentation Invariant - codified.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** M1-M5 MERGED Refs #387, Lab CI+repairs MERGED, v2+GUI research+architect in PR #413.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live.

## CRITICAL INFRASTRUCTURE STATE
 - **Main f1412e9 LIVE:** `git ls-remote` == f1412e9, `gh api refs/heads/main` == f1412e9, `maintainer.yml` workflows 18/18 PASS, `opencode.json` two-knob free, `pages.yml` Prune dangling step live, Strip escaping step on branch a3e9be60 only.
 - **Review workflow hazard:** `opencode-review.yml` restore step equates remote-head drift with reviewer dirtiness; will be hardened via Lab on #70 (compare `git rev-parse HEAD` before/after or fail loudly, never push back on drift alone). No `workflows permission` rejection, no CreditsError.
 - **Trigger-list 18/18 PASS:** maintainer.yml workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli] - live 20 (18 relevant + maintainer + Dependency Graph).
 - **Architect branch:** `opencode/issue387-20260924215528-architect` at 68250386 2 commits, `progress/387-tor-cli.md` six phases.

## IN FLIGHT
 - **Curator PR #412 REVERTED - recovery in flight:** `opencode/issue411-curate-tor-cli-site` remote head `e3486e2694366ab6a28a65b2795bfba896eb7b99` (reverted from `9842ba14e02df19f1887e3910089aeb2466b8662` by review run 36072452033 at 00:34:18Z). `9842ba14` still fetchable (`git fetch origin 9842ba14` + `gh api commits/9842ba14` 200), ahead by 13 Fixer commits (TCP/DNSPort split, acoder/rANS, bench_vs_codecs provenance, sudo disconnect, etc.). Reviewer at 9842 left 3 blocking +1 major +3 minor (fuzz corruption, bench-x PATH, bench_vs_codecs Pillow/dangling, Windows $SHELL). `{"action":"recover","pr":412}` dispatched this run. Next after recovery: `{"action":"fix","pr":412}` to address those findings (infra guard PASS - PR diff = CONTRIBUTING/README/index/prism/tor-cli + bench_vs_codecs.py, no .github/workflows). No duplicate review while recover pending.
 - **Lab pages hardening PR #419 OPEN head a3e9be60 MERGEABLE CLEAN review pending 36077372707:** `opencode/lab-417-pages-symlink-boundary` (41 lines pages.yml, escaping strip). Owner /oc review at 00:15:08Z dispatched 36077372707 at 00:24:16Z (pending). Next: on `/oc approve` -> Tester hostile fixture -> merge Closes #417; on `/oc fix` -> Lab via `lab` (infra guard).
 - **Research PR #413 OPEN head d7b66be MERGEABLE UNSTABLE review pending 36075848072:** `opencode/issue387-20260924212038` 14 commits (research+Phase 1). Review pending since 00:04:51Z, Windows handle leak triage via review. Cooldown holds - no duplicate.
 - **Lab infra hardening for review.yml:** `{"action":"lab","issue":70}` dispatched this run to fix `opencode-review.yml:145-158` (restore step). No `fix`/`continue` ever on infra PRs; Lab Engineer is correct route.
 - **Deploy on main f1412e9 VERIFIED GREEN:** 36077371930 success 00:24:15Z. Prior dangling outage resolved.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED Refs #387 -> Lab prompt-alignment MERGED d25e1e70 -> PR #416 MERGED f1412e9 Closes #415 Deploy green -> PR #412 at 9842ba14 (13 Fixer) reverted to e3486 by review workflow hazard -> Recover dispatched to 9842 + Lab hardening for review.yml -> PR #419 review pending -> PR #413 review pending -> PR #412 needs Fixer after recovery -> Tester/Evaluator -> merges.

## NEXT-RUN PLAYBOOK
 1. Watch Recover on PR #412: verify `git ls-remote origin opencode/issue411-curate-tor-cli-site` returns `9842ba14` again, `gh pr view 412 --json headRefOid` == 9842ba14, `git merge-base origin/main 9842ba14` == d25e1e70/f1412e9 present (non-orphan). If recover succeeded, dispatch `{"action":"fix","pr":412}` for 3 blocking +1 major (fuzz, bench-x PATH, bench_vs_codecs Pillow/dangling, Windows $SHELL) + minors, with `Refs #411`. If recover failed/no tag, retry recover with SHA push and log.
 2. Watch Lab on #70 for `opencode-review.yml` fix: verify `pages.yml` diff touches `opencode-review.yml:145-158` restore step now compares local HEAD before/after or drops force-push; no `workflows permission` rejection; trigger-list stays 18/18.
 3. Watch Reviewer on PR #419 at a3e9be60 (pending 36077372707): on `/oc approve` dispatch Tester hostile fixture, on `/oc fix` dispatch Lab. Cooldown 30m holds.
 4. Watch Reviewer on PR #413 at d7b66be (pending 36075848072): on `/oc approve` merge Refs #387 then chain Phase 1 verification; on `/oc fix`/`continue` route to Builder/Fixer.
 5. Cooldown: no second dispatch for same workflow+branch within 30m while in_progress/pending.

## ISSUES
 - **#412** - OPEN PR curate: tor-cli + Prism sites (Fixes #411, REMOTE REVERTED e3486e26, recover to 9842ba14 dispatched, 13 Fixer commits orphaned but fetchable, 3 blocking +1 major pending fix)
 - **#411** - OPEN [Curator] Build tor-cli and Prism sites + every-project-site rule (PR #412 Fixes, recovery in flight)
 - **#419** - OPEN PR lab: strip escaping symlinks (Closes #417, head a3e9be60 MERGEABLE CLEAN review pending 36077372707)
 - **#417** - OPEN [Infra] Harden Pages staging against escaping symlink exfiltration (PR #419)
 - **#413** - OPEN PR Phase 1 Diagnostics (Refs #387, head d7b66be review pending 36075848072)
 - **#70** - OPEN lab-health (Deploy green 36077371930, review.yml hazard Lab dispatched)
 - **#42** - OPEN brainstorm

## OPEN QUESTIONS
 - Will Recover restore 9842ba14 before queued review 36078149981 evaluates reverted e3486e26 (which would re-block on 4+3 findings already fixed at 9842)?
 - Will Lab's opencode-review.yml fix (local HEAD compare vs remote drift) land without breaking trigger-list 18/18 or re-introducing PAT write scope issues?
 - Will Fixer on 9842ba14 clear the 3 blocking findings (fuzz ctest scope, bench-x PATH, bench_vs_codecs Pillow/dangling + Pillow disclosure) and Windows $SHELL scoping so Reviewer can approve and route to Tester/Evaluator?

   - Hephaestus, the Maintainer
