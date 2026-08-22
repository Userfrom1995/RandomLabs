# STATE - Random factory checkpoint
- **Updated:** 2026-08-22 (maintainer run 32596717974, owner comment on PR #118). Re-survey confirms: PR #118 head `df870812f4b05e6272c5df76144443e66436a450` (B5.41, 11.026 bpp, byte-exact), **NO build in flight** -- the owner's comment on #118 spawned only skipped/cancelled opencode runs (`32596717977` skipped, `32596711234` cancelled), leaving the branch parked at B5.41. This run dispatched a fresh `continue` (head `df87081`); it will appear as a new opencode run shortly.

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root `60748e88`; promoted to Current via merged PR #115; docs cleaned by merged PR #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 (Obsidian umbrella) is now CLOSED.
- **NEXT PRIORITY (owner):** build **Prism (issue #103, M0 MERGED via #104)** - beats JPEG XL (~8.71 bpp on Kodak). M1-M4 continuation in flight (issue #117, PR #118). Owner override: NO merge until M0+M1+M2+M3 met bit-exactly on REAL Kodak (M3 < JPEG XL 8.71). The merge gate is tied to the ACTUAL project goal, not any iteration/round limit.
- **Iteration limit LIFTED (2026-08-22T14:51Z):** owner removed the 20-round/iteration cap and said "keep working". The circuit-breaker budget is now unlimited by owner action. A further main commit ("Remove halt/breaker on factory pipeline", `91c8707`) formally DELETED the breaker entirely, so the loop may run unbounded without manual re-pings.
- **One-PR rule + NEVER delete PR branches:** satisfied.
- **Owner "don't get distracted" directive:** Prism is THE priority; board candidates parked until Prism clears the JXL gate.
- **Quality-gate directive:** quality gates are the ONLY merge criteria.
- **(2026-08-22T04:48Z):** infra/workflow changes MUST be delegated to the Lab Engineer, never the Fixer. Enforced in reviewer.md (committed 770a756); `lab.yml` routes `/oc lab` to Lab Engineer for `.github/agents/*.md` edits only.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `91c87078919e17f7244a659b2cbf5552c4052502`** (owner commit "Remove halt/breaker on factory pipeline"). Obsidian lives in `obsidian/` on `main`. Prism branch `opencode/117-prism-m1-m4-optimization` = `df87081` shares M0 ancestry (NOT orphan).
- **opencode.json:** `model` = `opencode/hy3-free` (free), `small_model` = `opencode/mimo-v2.5-free` (free).
- **pages.yml:** production deploy succeeded (main). PR #118 preview deploy is `action_required` (env approval, not the production path).
- **CIRCUIT BREAKER: REMOVED** (main commit `91c8707`). The auto-guard no longer exists; the loop runs unbounded. This resolves the prior escalation's option (c).
- **WORKFLOW-FILE PUSH WALL (unchanged, now non-blocking):** #120 CLOSED by owner. `opencode.yml` still lacks `workflows: write` and a `lab` job, but the reviewer.md auto-guard (committed 770a756) rewrites any misrouted fix/continue on infra PRs to `lab`, so the orchestration-rule fix is effectively enforced. Future workflow-file edits remain an OWNER-action path.

## IN FLIGHT
- **Prism M1-M4 (issue #117, PR #118, branch `opencode/117-prism-m1-m4-optimization`):** head `df87081` (B5.41, **11.026 bpp**, byte-exact). **NO build currently in flight** -- the owner's comment on #118 at ~20:27Z spawned skipped/cancelled runs only. A fresh `continue` was dispatched by this run (32596717974) to resume B7 + further entropy from B5.41; it will appear as a new opencode run shortly.
  - **Trajectory:** The PREDICTOR/COLOR/BLOCK bank is saturated (16/16 nibble 0..15, per-plane top11, block top11, selective-16 thr45 top11). The RESIDUAL ENTROPY MODEL is still EXPANDABLE with real gains: B5.38 (704-context orientation split, -0.16%), B5.39 (2816-context flatness split, -0.11%), B5.41 (5632-context diagonal edge, -0.09%, -11829 bytes) - each a genuine ~0.1% byte reduction on byte-exact Kodak. Total progress from 11.29 baseline is ~2.3%. The loop is productive, NOT converged.
  - **B7 Squeeze + MA-tree greedy split (depth 6, leaves 16-32, mandatory `llc_class`/`sibling_class`) STILL NOT genuinely built** - B5.33/B5.35/B5.36 scaffolded the per-band squeeze / leaf-activity infrastructure, and B5.29 replaced Haar with 5/3 lifting (still +0.8% never-expand, kept disabled), but the real greedy MA-tree split was never implemented. B7 remains the ONLY proven >10% closure path to JXL 8.71; context-splitting alone is unlikely to close the remaining ~21% gap (2.32 bpp). The Builder keeps deferring B7 behind B5.x entropy tweaks, BUT the progress file now lists B7 as the immediate next step, and B5.40's harness-budget recovery gave B7 the runtime headroom it needs.
  - **Merge gate NOT met** (11.026 vs 8.71 JXL, gap 2.32 / ~21%). Held until M3<8.71 bit-exact + Tester approval.

## PENDING (in order)
    1. **Reach the JXL gate (M3 < 8.71).** Entropy context-splitting still yields ~0.1% gains (now at 5632 contexts via diagonal flag); keep grinding it, but the ~21% gap needs the real B7 Squeeze+MA-tree greedy split (mandatory `llc_class`/`sibling_class`). The progress file now lists B7 next, and B5.40 recovered the harness budget, so the in-flight `continue` should finally attempt B7. Since plain `continue` follows the progress file's next step, iteration can proceed.
    2. **Once M3 < 8.71 bit-exactly:** fire Reviewer -> Tester before ANY merge.
    3. **ORCHESTRATION RULE FIX:** effectively landed (reviewer.md auto-guard). Optional fixer.md hardening parked.
    4. **PR #119:** CLOSED by owner (redundant; target #98 CLOSED). Resolved.
    5. **Silent-stall mitigation:** now moot - owner removed the iteration cap and the breaker; loop resumes normally (this run re-dispatched `continue` because the owner's comment spawned only skipped/cancelled runs).

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #118.
- **#117 (Prism M1-M4)** - OPEN (tracking; goal-tied merge gate). Held open until M3 < 8.71 bit-exactly.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; parked behind Prism.
- **#70 (Lab Health)** - Auditor daily summary.
- **#98 (runaway /oc fix retry loop)** - CLOSED (PR #99); PR #119 now CLOSED too.
- **#119 ([Infra] Lab update for #70)** - CLOSED by owner (redundant).
- **#120 (Audit: workflows: write missing)** - CLOSED by owner (reviewer.md auto-guard committed instead; workflow-file push wall remains owner-action).

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `91c87078919e17f7244a659b2cbf5552c4052502`.
- Build agent (workflow `model:` input): `opencode/muse-spark-1.2-contributor-free` = FREE.
- **Lab Engineer:** reachable via `lab.yml` (`/oc lab`) for PROMPT edits only; CANNOT push workflow `.yml` (no workflows: write).
- **Circuit breaker:** REMOVED (owner commit `91c8707`).

## NEXT STEPS
    1. **Build dispatched by this run (`continue`, head `df87081`)** resumes the loop from B5.41. The progress file lists B7 MA-tree greedy split as the next step, and B5.40 recovered the harness budget, so the in-flight build should finally attempt the real B7 (mandatory `llc_class`/`sibling_class`).
    2. Watch the new build's duration - if it times out/cancels without delivering, the workflow's no-decision handler re-notifies the maintainer for re-dispatch.
    3. If a build clears the gate (M3 < 8.71 bit-exactly), fire Reviewer -> Tester before any merge.
    4. ORCHESTRATION FIX: considered landed (reviewer.md auto-guard). Optional fixer.md hardening parked.
    5. PR #119: resolved (CLOSED).

## OPEN QUESTIONS
- Will the freshly-dispatched `continue` finally attempt the real B7 MA-tree greedy split (mandatory `llc_class`/`sibling_class`), now that B5.41 expanded entropy to 5632 contexts and the progress file lists B7 next? Context-splitting is still productive but the ~21% JXL gap needs B7.
- Is the owner's comment at ~20:27Z a silent-stall artifact (skipped/cancelled runs) or an intentional ping? No competing build was in flight this run, so re-dispatch was safe and required.
- When/if a build clears the gate (M3 < 8.71 bit-exactly), fire Reviewer -> Tester before ANY merge.
- PR #119: resolved (CLOSED).

- Mae, the Maintainer
