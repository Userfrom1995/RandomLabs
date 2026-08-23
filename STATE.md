# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32621066396, owner `/oc maintainer` on PR #118 with model-switch directive). Re-survey confirms: PR #118 head `f57f57ca` (B5.46, 11.025 bpp, byte-exact), and NO build in flight - a fresh `continue` was dispatched (decision.json) to resume B6-B8. Owner authorized model switch to `x-preview-f-free` for builder/research/arch/fixer/lab-engineer; edits applied to opencode.yml + lab.yml + opencode.json and staged for the maintainer push step.
- **Maintainer run:** https://github.com/Userfrom1995/Random/actions/runs/32621066396

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root `60748e88`; promoted to Current via merged PR #115; docs cleaned by merged PR #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 (Obsidian umbrella) is now CLOSED.
- **NEXT PRIORITY (owner):** build **Prism (issue #103, M0 MERGED via #104)** - beats JPEG XL (~8.71 bpp on Kodak). M1-M4 continuation in flight (issue #117, PR #118). Owner override: NO merge until M0+M1+M2+M3 met bit-exactly on REAL Kodak (M3 < JPEG XL 8.71). The merge gate is tied to the ACTUAL project goal, not any iteration/round limit.
- **Iteration limit LIFTED (2026-08-22T14:51Z):** owner removed the 20-round/iteration cap and said "keep working". The circuit-breaker budget is now unlimited by owner action. A further main commit ("Remove halt/breaker on factory pipeline", `91c8707`) formally DELETED the breaker entirely, so the loop may run unbounded without manual re-pings.
- **Model switch (2026-08-23T05:43:32Z, owner-authorized):** set research/architect/build/fixer (opencode.yml) + lab-engineer (lab.yml) + opencode.json `model` to `opencode/x-preview-f-free` (free, confirmed via zen). `general` job left on `hy3-free`; `small_model` stays `mimo-v2.5-free` (free). Next build/agent runs use the new model.
- **One-PR rule + NEVER delete PR branches:** satisfied.
- **Owner "don't get distracted" directive:** Prism is THE priority; board candidates parked until Prism clears the JXL gate.
- **Quality-gate directive:** quality gates are the ONLY merge criteria.
- **(2026-08-22T04:48Z):** infra/workflow changes MUST be delegated to the Lab Engineer, never the Fixer. Enforced in reviewer.md (committed 770a756); `lab.yml` routes `/oc lab` to Lab Engineer for `.github/agents/*.md` edits only.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `91c87078919e17f7244a659b2cbf5552c4052502`** (owner commit "Remove halt/breaker on factory pipeline"). Obsidian lives in `obsidian/` on `main`. Prism branch `opencode/117-prism-m1-m4-optimization` = `f57f57ca677c6ef98dd0062bc2d8ae5a3b9b4619` is a CLEAN DESCENDANT of `main` (merge-base = `91c8707` = main tip; NOT orphan).
- **Models (post-switch 2026-08-23):** research/architect/build/fixer/lab-engineer = `opencode/x-preview-f-free`; opencode.json `model` = `opencode/x-preview-f-free`, `small_model` = `opencode/mimo-v2.5-free` (both free). `general` = `opencode/hy3-free`.
- **pages.yml:** production deploy succeeded (main). PR #118 preview deploy is `action_required` (env approval, not the production path).
- **CIRCUIT BREAKER: REMOVED** (main commit `91c8707`). The auto-guard no longer exists; the loop runs unbounded.
- **WORKFLOW-FILE PUSH WALL:** the owner's PAT (used by the maintainer push step) carries `workflows: write`, so Mae's directly-edited `.github/workflows/*.yml` model switches are pushed by that step. This run's model edits are the first use of that path.

## IN FLIGHT
- **Prism M1-M4 (issue #117, PR #118, branch `opencode/117-prism-m1-m4-optimization`):** head `f57f57ca` (B5.46, **11.025 bpp**, byte-exact). NO build currently in flight - a fresh `continue` was dispatched this run (decision.json) to resume B6-B8 from B5.46. NOT a delivery stall; the prior build (32611633511) completed and the silent-stall on the owner's 02:44 `/oc continue` left the loop paused.
  - **B5.46 (latest):** sumAbs leaf activity + top3 (`prism/src/codec/predict.cpp:...`). Net **-23 bytes (-0.00018%) vs B5.45** (13006509 bytes unchanged-ish). 23/23 gtest PASS, fuzz PASS, 24/24 Kodak cmp byte-exact. ~835s harness.
  - **Trajectory:** BOTH micro-tweak banks are now PROVEN SATURATED. (1) Predictor/color/block bank: full 16/16 nibble 0..15 (since B5.26), per-plane top11, block top11, selective-16. (2) Residual entropy model: B5.44/B5.45/B5.46 sweeps = 0% net gain. Total progress from 11.29 baseline ~2.35%. The loop is productive, NOT converged, but BOTH known micro-tweak paths are now exhausted.
  - **B7 Squeeze + MA-tree greedy split (depth 6, leaves 16-32, mandatory `llc_class`/`sibling_class`) STILL NOT genuinely built.** B5.33/B5.35/B5.36 scaffolded per-band squeeze / leaf-activity infrastructure; B5.29 replaced Haar with 5/3 lifting (still +0.8% never-expand, kept disabled). The REAL greedy MA-tree split was never implemented (B5.36 reported +15B never-expand, confirming scaffolding only). B7 remains the ONLY proven >10% closure path to JXL 8.71; context-splitting alone is now proven unable to close the remaining ~21% gap (2.32 bpp). The resumed build MUST finally attempt the real B7 rather than another B5.x tweak - anything else is now a no-op.
  - **Merge gate NOT met** (11.025 vs 8.71 JXL, gap 2.32 / ~21%). Held until M3<8.71 bit-exact + Tester approval.

## PENDING (in order)
    1. **Reach the JXL gate (M3 < 8.71).** BOTH micro-tweak paths are now saturated (predictor bank since B5.26 at 16/16 nibble; residual entropy at 0%). The only remaining closure is the real B7 Squeeze+MA-tree greedy split (mandatory `llc_class`/`sibling_class`), paired if needed with B6 (5/3 lifting + int32 widening, scaffolded B5.30) and B8 (CM+LZP never-expand net). The resumed build must attempt it; if it lands another B5.x tweak, escalate to Researcher/Architect.
    2. **Once M3 < 8.71 bit-exactly:** fire Reviewer -> Tester before ANY merge.
    3. **ORCHESTRATION RULE FIX:** effectively landed (reviewer.md auto-guard). Optional fixer.md hardening parked.
    4. **PR #119:** CLOSED by owner (redundant; target #98 CLOSED). Resolved.
    5. **Silent-stall mitigation:** owner removed the iteration cap and the breaker, so the loop resumes normally on re-dispatch. The resumable `continue` is the active mitigation.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #118.
- **#117 (Prism M1-M4)** - OPEN (tracking; goal-tied merge gate). Held open until M3 < 8.71 bit-exactly.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; parked behind Prism.
- **#70 (Lab Health)** - Auditor daily summary.
- **#98 (runaway /oc fix retry loop)** - CLOSED (PR #99); PR #119 now CLOSED too.
- **#119 ([Infra] Lab update for #70)** - CLOSED by owner (redundant).
- **#120 (Audit: workflows: write missing)** - CLOSED by owner (reviewer.md auto-guard committed instead). The owner PAT on the maintainer push step now carries workflows: write, so Mae's model-switch edits to `.github/workflows/*.yml` are pushed by that step.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `91c87078919e17f7244a659b2cbf5552c4052502`.
- Build agent (workflow `model:` input): `opencode/x-preview-f-free` (FREE, owner-authorized switch this run).
- **Lab Engineer:** reachable via `lab.yml` (`/oc lab`) for PROMPT edits only.
- **Circuit breaker:** REMOVED (owner commit `91c8707`).

## NEXT STEPS
    1. **Prism `continue` dispatched this run (decision.json, head `f57f57ca`).** No build was in flight, so this is NOT a duplicate. Watch for the next builder comment; if it posts another B5.x micro-tweak (not real B7), the loop is circling and needs escalation to Researcher/Architect per override.
    2. Watch the build's duration - if it times out/cancels without delivering, the workflow's no-decision handler re-notifies the maintainer for re-dispatch.
    3. If a build clears the gate (M3 < 8.71 bit-exactly), fire Reviewer -> Tester before ANY merge.
    4. ORCHESTRATION FIX: considered landed (reviewer.md auto-guard). Optional fixer.md hardening parked.
    5. Brainstorm board #42 stays parked behind Prism per owner directive.

## OPEN QUESTIONS
- Will the resumed build (running on the new `x-preview-f-free` model) finally attempt the real B7 MA-tree greedy split (mandatory `llc_class`/`sibling_class`), now that BOTH the predictor bank (16/16 nibble) AND residual entropy (0% gain) are saturated? The ~21% JXL gap cannot close without B7.
- When/if a build clears the gate (M3 < 8.71 bit-exactly), fire Reviewer -> Tester before ANY merge.
- PR #119 / #120: resolved (CLOSED).
- Brainstorm board #42: parked behind Prism; no picks until Obsidian/Prism resolves per owner directive.

- Mae, the Maintainer
