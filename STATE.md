# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32622621664, owner `/oc maintainer` + `/oc build this` on PR #121). Re-survey confirms: PR #118 head `4c8c9d2` (B5.47, 11.025 bpp, byte-exact); a build IS still in flight (run `32622267175`). PR #121 (Architect B7 blueprint) delivered and MERGEABLE. No duplicate `continue` dispatched (would conflict with the in-flight build); PR #121 kept open (its "Closes #117" would prematurely close the unmet-gate tracking issue).

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
- **`main` = `91c87078919e17f7244a659b2cbf5552c4052502`** (owner commit "Remove halt/breaker on factory pipeline"). Obsidian lives in `obsidian/` on `main`. Prism branch `opencode/117-prism-m1-m4-optimization` = `4c8c9d2455038984394259a11d2821f8dcbad6bb` is a CLEAN DESCENDANT of `main` (merge-base = `91c8707` = main tip; NOT orphan).
- **Models (post-switch 2026-08-23):** research/architect/build/fixer/lab-engineer = `opencode/x-preview-f-free`; opencode.json `model` = `opencode/x-preview-f-free`, `small_model` = `opencode/mimo-v2.5-free` (both free). `general` = `opencode/hy3-free`.
- **pages.yml:** production deploy succeeded (main). PR #118/#121 previews deploy via PR-preview staging (env approval, not the production path).
- **CIRCUIT BREAKER: REMOVED** (main commit `91c8707`). The auto-guard no longer exists; the loop runs unbounded.
- **WORKFLOW-FILE PUSH WALL:** the owner's PAT (used by the maintainer push step) carries `workflows: write`, so Mae's directly-edited `.github/workflows/*.yml` model switches are pushed by that step.

## IN FLIGHT
- **Prism M1-M4 (issue #117, PR #118, branch `opencode/117-prism-m1-m4-optimization`):** head `4c8c9d2` (B5.47, **11.025 bpp**, byte-exact). Build run `32622267175` is STILL `in_progress` (started 06:11:14Z, harness ~840s+). NOT a delivery stall; the prior build (32622267175's predecessor) landed B5.47.
  - **B5.47 (latest):** "16-leaf activity refinement" - predictor/context micro-tweak, -40 bytes (-0.00031%) vs B5.46. 23/23 gtest PASS, fuzz PASS, 24/24 Kodak cmp byte-exact. ~840s harness.
  - **Trajectory:** BOTH micro-tweak banks are PROVEN SATURATED. (1) Predictor/color/block bank: full 16/16 nibble 0..15 (since B5.26), per-plane top11, block top11, selective-16. (2) Residual entropy model: B5.44/B5.45/B5.46/B5.47 sweeps = ~0% net gain. Total progress from 11.29 baseline ~2.35%. The loop is productive, NOT converged, but BOTH known micro-tweak paths are now exhausted.
  - **B7 Squeeze + MA-tree greedy split (depth 6, leaves 16-32, mandatory `llc_class`/`sibling_class`) STILL NOT genuinely built.** B5.33/B5.35/B5.36 scaffolded per-band squeeze / leaf-activity infrastructure; B5.29 replaced Haar with 5/3 lifting (still +0.8% never-expand, kept disabled). The REAL greedy MA-tree split was never implemented. B7 remains the ONLY proven >10% closure path to JXL 8.71; context-splitting alone is now proven unable to close the remaining ~21% gap (2.32 bpp).
  - **BLUEPRINT NOW ARMED (PR #121):** the Architect delivered `prism/docs/architecture-m1-m4.md` + R11-A guard. The NEXT resume (after `32622267175` lands) MUST implement the real B7 MA-tree greedy split per this blueprint; another B5.x micro-tweak is a circling no-op and escalates to `research`.
  - **Merge gate NOT met** (11.025 vs 8.71 JXL, gap 2.32 / ~21%). Held until M3<8.71 bit-exact + Tester approval.
- **PR #121 (Architect blueprint for #117):** delivered 06:18:45Z, commit `12ece100` (head `opencode/issue117-20260823061608`, base `main`), MERGEABLE. Adds `prism/docs/architecture-m1-m4.md` (+225) + `progress/103-prism-next-gen-lossless-codec.md` (+14/-5). Body "Closes #117" - KEPT OPEN (merging would prematurely close the unmet-gate tracking issue #117). It is the armed design doc, not a project to merge yet.

## PENDING (in order)
    1. **Let in-flight build `32622267175` land** (do NOT duplicate - no second `continue` while it runs). Then dispatch a `continue` on PR #118 REDIRECTED to the real B7 MA-tree greedy split (mandatory `llc_class`/`sibling_class`, R11-A guard) per blueprint PR #121. If that resume STILL posts only a B5.x micro-tweak, escalate to `research` for new methodology.
    2. **Reach the JXL gate (M3 < 8.71).** Only the real B7 Squeeze+MA-tree greedy split can close the ~21% gap, paired if needed with B6 (5/3 lifting + int32 widening) and B8 (CM+LZP never-expand net).
    3. **Once M3 < 8.71 bit-exactly:** fire Reviewer -> Tester before ANY merge.
    4. **PR #121 / #117:** #121 stays open as the armed blueprint; #117 stays open until the gate is met. Do NOT merge #121 (would close #117 prematurely).
    5. **PR #119 / #120:** resolved (CLOSED).

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #118.
- **#117 (Prism M1-M4)** - OPEN (tracking; goal-tied merge gate). Held open until M3 < 8.71 bit-exactly. Blueprint delivered via PR #121; next resume must build real B7.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; parked behind Prism.
- **#70 (Lab Health)** - Auditor daily summary.
- **#98 (runaway /oc fix retry loop)** - CLOSED (PR #99); PR #119 now CLOSED too.
- **#119 ([Infra] Lab update for #70)** - CLOSED by owner (redundant).
- **#120 (Audit: workflows: write missing)** - CLOSED by owner.
- **#121 (Architect B7 blueprint PR)** - OPEN, MERGEABLE, KEPT OPEN (do not merge; would close #117 prematurely).

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `91c87078919e17f7244a659b2cbf5552c4052502`.
- Build agent (workflow `model:` input): `opencode/x-preview-f-free` (FREE, owner-authorized switch, active since run 32621066396).
- **Lab Engineer:** reachable via `lab.yml` (`/oc lab`) for PROMPT edits only.
- **Circuit breaker:** REMOVED (owner commit `91c8707`).

## NEXT STEPS
    1. **Prism build `32622267175` is in flight:** do NOT duplicate; one build drives the branch. Watch for the next builder comment.
    2. **After `32622267175` lands:** dispatch `continue` on PR #118, REDIRECTED to the real B7 MA-tree greedy split (mandatory `llc_class`/`sibling_class`, R11-A guard) per blueprint PR #121. Another B5.x micro-tweak escalates to `research`.
    3. If a build clears the gate (M3 < 8.71 bit-exactly), fire Reviewer -> Tester before ANY merge.
    4. Brainstorm board #42 stays parked behind Prism per owner directive.
    5. PR #121 kept open as the armed blueprint; do not merge (would close #117).

## OPEN QUESTIONS
- Will the in-flight build `32622267175` land another B5.x micro-tweak, and will the SUBSEQUENT resume (armed by PR #121) finally implement the REAL B7 MA-tree greedy split (mandatory `llc_class`/`sibling_class`, R11-A guard)? Both micro-tweak banks are saturated; the ~21% JXL gap cannot close without B7.
- If the next resume STILL posts only a B5.x micro-tweak, escalate to `research` for new methodology, since the current context approach is exhausted.
- When/if a build clears the gate (M3 < 8.71 bit-exactly), fire Reviewer -> Tester before ANY merge.
- PR #121 / #117: keep #121 open as armed blueprint; #117 open until gate met.
- Brainstorm board #42: parked behind Prism; no picks until Prism resolves per owner directive.

- Mae, the Maintainer
